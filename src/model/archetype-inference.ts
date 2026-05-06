import type { ArchetypeId, DraftPick } from '../shared/types';
import type { SignalMap, PickAnalysis } from '../signals/types';
import type { ArchetypePosterior } from './types';
import { BAYESIAN_TEMPERATURE, PIVOT_THRESHOLD } from '../shared/constants';

const ALL_ARCHETYPES: ArchetypeId[] = [
  'silverquill', 'lorehold', 'prismari', 'quandrix', 'witherbloom', 'converge',
];

function initLogPrior(): Record<ArchetypeId, number> {
  const logUniform = -Math.log(ALL_ARCHETYPES.length);
  const prior: Record<ArchetypeId, number> = {} as any;
  for (const a of ALL_ARCHETYPES) prior[a] = logUniform;
  return prior;
}

function logSumExp(logValues: number[]): number {
  const maxVal = Math.max(...logValues);
  if (!isFinite(maxVal)) return -Infinity;
  let sum = 0;
  for (const v of logValues) sum += Math.exp(v - maxVal);
  return maxVal + Math.log(sum);
}

function normalizeLogProbs(logProbs: Record<ArchetypeId, number>): Record<ArchetypeId, number> {
  const lse = logSumExp(ALL_ARCHETYPES.map((a) => logProbs[a]));
  const result: Record<ArchetypeId, number> = {} as any;
  for (const a of ALL_ARCHETYPES) {
    result[a] = Math.exp(logProbs[a] - lse);
  }
  return result;
}

function updateWithPick(
  logPrior: Record<ArchetypeId, number>,
  pick: DraftPick,
  signalMap: SignalMap,
): Record<ArchetypeId, number> {
  const entry = signalMap[pick.pickedCard.name];
  if (!entry) return { ...logPrior };

  const logPosterior: Record<ArchetypeId, number> = {} as any;
  for (const arch of ALL_ARCHETYPES) {
    const gihwr = entry.archetypeGihwr[arch] ?? entry.overallGihwr;
    // Tempered likelihood: likelihood^(1/T)
    const logLikelihood = Math.log(Math.max(gihwr, 0.001)) / BAYESIAN_TEMPERATURE;
    logPosterior[arch] = logPrior[arch] + logLikelihood;
  }

  // Re-normalize
  const lse = logSumExp(ALL_ARCHETYPES.map((a) => logPosterior[a]));
  for (const a of ALL_ARCHETYPES) logPosterior[a] -= lse;
  return logPosterior;
}

function updateWithSignals(
  logPrior: Record<ArchetypeId, number>,
  pickAnalysis: PickAnalysis,
): Record<ArchetypeId, number> {
  // Aggregate signal strength per archetype from what was seen in the pack
  const archSignal: Record<ArchetypeId, number> = {} as any;
  for (const a of ALL_ARCHETYPES) archSignal[a] = 0;
  for (const s of pickAnalysis.cardSignals) {
    archSignal[s.archetype] += s.signalStrength;
  }

  const totalSignal = Object.values(archSignal).reduce((a, b) => a + b, 0);
  if (totalSignal < 0.01) return { ...logPrior };

  const logPosterior: Record<ArchetypeId, number> = {} as any;
  for (const arch of ALL_ARCHETYPES) {
    // Likelihood proportional to signal share, tempered
    const share = (archSignal[arch] + 0.01) / (totalSignal + 0.01 * ALL_ARCHETYPES.length);
    const logLikelihood = Math.log(share) / BAYESIAN_TEMPERATURE;
    logPosterior[arch] = logPrior[arch] + logLikelihood;
  }

  const lse = logSumExp(ALL_ARCHETYPES.map((a) => logPosterior[a]));
  for (const a of ALL_ARCHETYPES) logPosterior[a] -= lse;
  return logPosterior;
}

export function computePosterior(
  picks: DraftPick[],
  pickAnalyses: PickAnalysis[],
  signalMap: SignalMap,
  upToIndex: number,
): ArchetypePosterior {
  let logProbs = initLogPrior();

  for (let i = 0; i <= upToIndex && i < picks.length && i < pickAnalyses.length; i++) {
    logProbs = updateWithPick(logProbs, picks[i], signalMap);
    logProbs = updateWithSignals(logProbs, pickAnalyses[i]);
  }

  const probabilities = normalizeLogProbs(logProbs);

  // Entropy
  let entropy = 0;
  for (const a of ALL_ARCHETYPES) {
    const p = probabilities[a];
    if (p > 0) entropy -= p * Math.log(p);
  }

  // MAP
  let mapArchetype: ArchetypeId = ALL_ARCHETYPES[0];
  let maxProb = 0;
  let secondProb = 0;
  let secondArch: ArchetypeId = ALL_ARCHETYPES[1];
  for (const a of ALL_ARCHETYPES) {
    if (probabilities[a] > maxProb) {
      secondProb = maxProb;
      secondArch = mapArchetype;
      maxProb = probabilities[a];
      mapArchetype = a;
    } else if (probabilities[a] > secondProb) {
      secondProb = probabilities[a];
      secondArch = a;
    }
  }

  const pivotCandidate =
    maxProb > 0 && (maxProb - secondProb) / maxProb < PIVOT_THRESHOLD
      ? secondArch
      : null;

  return {
    probabilities,
    entropy,
    mapArchetype,
    confidence: maxProb,
    pivotCandidate,
  };
}
