import type { ArchetypeId, Card, Draft, DraftPick } from '../shared/types';
import type {
  SignalMap,
  CardSignalEntry,
  PickSignal,
  PickAnalysis,
  ArchetypeScore,
  DraftAnalysis,
  DraftSummary,
  PivotPoint,
  MissedSignal,
} from './types';
import {
  ARCHETYPES,
  ARCHETYPE_TIER_WEIGHT,
  WHEEL_PICK_THRESHOLD,
} from '../shared/constants';
import type { SetConfig } from '../shared/sets';
import { SOS_CONFIG } from '../shared/sets';

function computeSignalStrength(
  entry: CardSignalEntry,
  pickNumber: number,
  archetype: ArchetypeId
): number {
  // ALSA <= 0 means 17Lands never sampled this card — no lateness signal
  const lateness =
    entry.alsa > 0 ? Math.max(0, pickNumber - entry.alsa) : 0;
  // 17Lands sample-hides winrates in low-volume queues; a neutral 0.5 keeps
  // the lateness component of the signal alive for those cards
  const gihwr =
    entry.archetypeGihwr[archetype] ??
    (entry.overallGihwr > 0 ? entry.overallGihwr : 0.5);
  const tier = ARCHETYPES[archetype].tier;
  const weight = ARCHETYPE_TIER_WEIGHT[tier] ?? 1.0;
  return lateness * gihwr * weight;
}

function detectWheels(
  allPicks: DraftPick[],
  currentIndex: number
): string[] {
  const current = allPicks[currentIndex];
  if (current.pickNumber < WHEEL_PICK_THRESHOLD) return [];

  const earlyCardNames = new Set<string>();
  for (const pick of allPicks) {
    if (
      pick.packNumber === current.packNumber &&
      pick.pickNumber < WHEEL_PICK_THRESHOLD
    ) {
      for (const card of pick.availableCards) {
        earlyCardNames.add(card.name);
      }
    }
  }

  return current.availableCards
    .filter((card) => earlyCardNames.has(card.name))
    .map((card) => card.name);
}

function analyzePickSignals(
  availableCards: Card[],
  pickNumber: number,
  signalMap: SignalMap,
  wheeledCards: Set<string>
): PickSignal[] {
  const signals: PickSignal[] = [];

  for (const card of availableCards) {
    const entry = signalMap[card.name];
    if (!entry) continue;

    const archetype = entry.primaryArchetype;
    if (!archetype) continue;

    const strength = computeSignalStrength(entry, pickNumber, archetype);
    if (strength <= 0 && !wheeledCards.has(card.name)) continue;

    const isWheel = wheeledCards.has(card.name);
    const effectiveStrength = isWheel ? strength + entry.overallGihwr * 2 : strength;

    signals.push({
      cardName: card.name,
      signalStrength: effectiveStrength,
      archetype,
      tier: entry.signalTier,
      isWheel,
      explanation: buildExplanation(entry, pickNumber, archetype, isWheel),
    });
  }

  return signals.sort((a, b) => b.signalStrength - a.signalStrength);
}

function buildExplanation(
  entry: CardSignalEntry,
  pickNumber: number,
  archetype: ArchetypeId,
  isWheel: boolean
): string {
  const parts: string[] = [];
  const hasAlsa = entry.alsa != null && entry.alsa > 0;
  const lateness = hasAlsa ? pickNumber - entry.alsa : 0;

  if (isWheel) {
    parts.push('WHEELED');
  }

  if (hasAlsa && lateness > 2) {
    parts.push(
      `ALSA ${entry.alsa.toFixed(1)} still here at pick ${pickNumber} (very late)`
    );
  } else if (hasAlsa && lateness > 0) {
    parts.push(`ALSA ${entry.alsa.toFixed(1)} still here at pick ${pickNumber} (late)`);
  }

  const gihwr = entry.archetypeGihwr[archetype];
  if (gihwr) {
    parts.push(
      `${(gihwr * 100).toFixed(1)}% GIHWR in ${ARCHETYPES[archetype].name}`
    );
  }

  if (entry.signalTier === 'staple') {
    parts.push(`${ARCHETYPES[archetype].name} staple`);
  }

  return parts.join(' — ') || 'Minor signal';
}

function normalizeScores(scores: ArchetypeScore[]): ArchetypeScore[] {
  const maxSignal = Math.max(...scores.map((s) => s.cumulativeSignal), 0.001);
  return scores.map((s) => ({
    ...s,
    normalizedScore: (s.cumulativeSignal / maxSignal) * 100,
  }));
}

function inferUserArchetype(
  picks: DraftPick[],
  _signalMap: SignalMap,
  config: SetConfig
): ArchetypeId {
  const colorFreq: Record<string, number> = {};
  for (const pick of picks) {
    for (const c of pick.pickedCard.color || []) {
      colorFreq[c] = (colorFreq[c] || 0) + 1;
    }
  }

  const sorted = Object.entries(colorFreq)
    .sort((a, b) => b[1] - a[1])
    .map(([c]) => c);

  if (sorted.length >= 2) {
    const pair = sorted.slice(0, 2).sort().join('');
    const arch = config.colorToArchetype[pair];
    if (arch) return arch;
  }

  if (sorted.length >= 3 && config.multicolorArchetype) {
    return config.multicolorArchetype;
  }
  return config.archetypes[0].id;
}

export function analyzeDraft(
  draft: Draft,
  signalMap: SignalMap,
  config: SetConfig = SOS_CONFIG
): DraftAnalysis {
  const archetypeIds = config.archetypes.map((a) => a.id);
  const runningSignals: Record<ArchetypeId, number> = {};
  const runningCounts: Record<ArchetypeId, number> = {};
  for (const id of archetypeIds) {
    runningSignals[id] = 0;
    runningCounts[id] = 0;
  }

  let fixingSeenLate = 0;
  let convergePayoffs = 0;
  const pickAnalyses: PickAnalysis[] = [];

  for (let i = 0; i < draft.picks.length; i++) {
    const pick = draft.picks[i];
    const wheeled = detectWheels(draft.picks, i);
    const wheelSet = new Set(wheeled);

    const cardSignals = analyzePickSignals(
      pick.availableCards,
      pick.pickNumber,
      signalMap,
      wheelSet
    );

    for (const signal of cardSignals) {
      // Guard against a signal map built for a different set's archetypes
      if (runningSignals[signal.archetype] === undefined) continue;
      runningSignals[signal.archetype] += signal.signalStrength;
      runningCounts[signal.archetype]++;
    }

    for (const card of pick.availableCards) {
      const entry = signalMap[card.name];
      if (!entry) continue;
      if (entry.isFixing && pick.pickNumber >= 5) fixingSeenLate++;
      if (entry.isConvergeSignal) convergePayoffs++;
    }

    const convergeViability = Math.min(
      1,
      (fixingSeenLate * 0.1 + convergePayoffs * 0.15)
    );

    const scores: ArchetypeScore[] = normalizeScores(
      archetypeIds.map((id) => ({
        archetypeId: id,
        cumulativeSignal: runningSignals[id],
        normalizedScore: 0,
        pickCount: runningCounts[id],
      }))
    );

    const pickedSignal =
      cardSignals.find((s) => s.cardName === pick.pickedCard.name) || null;

    pickAnalyses.push({
      packNumber: pick.packNumber,
      pickNumber: pick.pickNumber,
      cardSignals,
      pickedCardSignal: pickedSignal,
      archetypeScores: scores,
      wheelDetections: wheeled,
      convergeViability,
    });
  }

  const summary = computeSummary(pickAnalyses, draft, signalMap, config);
  return { picks: pickAnalyses, summary };
}

function computeSummary(
  pickAnalyses: PickAnalysis[],
  draft: Draft,
  signalMap: SignalMap,
  config: SetConfig
): DraftSummary {
  const archetypeIds = config.archetypes.map((a) => a.id);
  const finalScores =
    pickAnalyses.length > 0
      ? pickAnalyses[pickAnalyses.length - 1].archetypeScores
      : archetypeIds.map((id) => ({
          archetypeId: id,
          cumulativeSignal: 0,
          normalizedScore: 0,
          pickCount: 0,
        }));

  const mostOpen = [...finalScores].sort(
    (a, b) => b.cumulativeSignal - a.cumulativeSignal
  )[0].archetypeId;

  const userArchetype = inferUserArchetype(draft.picks, signalMap, config);

  const signalTimeline: Record<ArchetypeId, number[]> = {};
  for (const id of archetypeIds) signalTimeline[id] = [];

  for (const pa of pickAnalyses) {
    for (const score of pa.archetypeScores) {
      signalTimeline[score.archetypeId].push(score.normalizedScore);
    }
  }

  const pivotPoints = findPivotPoints(pickAnalyses, userArchetype);
  const missedSignals = findMissedSignals(pickAnalyses, draft, userArchetype);

  return {
    mostOpenArchetype: mostOpen,
    userArchetype,
    pivotPoints,
    missedSignals,
    finalScores,
    signalTimeline,
  };
}

function findPivotPoints(
  analyses: PickAnalysis[],
  userArchetype: ArchetypeId
): PivotPoint[] {
  const pivots: PivotPoint[] = [];
  let prevLeader: ArchetypeId | null = null;

  for (const pa of analyses) {
    const leader = [...pa.archetypeScores].sort(
      (a, b) => b.cumulativeSignal - a.cumulativeSignal
    )[0];

    if (
      prevLeader &&
      leader.archetypeId !== prevLeader &&
      leader.archetypeId !== userArchetype
    ) {
      pivots.push({
        packNumber: pa.packNumber,
        pickNumber: pa.pickNumber,
        fromArchetype: prevLeader,
        toArchetype: leader.archetypeId,
        reason: `${ARCHETYPES[leader.archetypeId].name} overtook ${ARCHETYPES[prevLeader].name} as strongest signal`,
      });
    }

    prevLeader = leader.archetypeId;
  }

  return pivots;
}

function findMissedSignals(
  analyses: PickAnalysis[],
  draft: Draft,
  userArchetype: ArchetypeId
): MissedSignal[] {
  const missed: MissedSignal[] = [];

  for (let i = 0; i < analyses.length; i++) {
    const pa = analyses[i];
    const pick = draft.picks[i];

    for (const signal of pa.cardSignals) {
      if (
        signal.cardName !== pick.pickedCard.name &&
        signal.signalStrength > 0.5 &&
        signal.archetype !== userArchetype
      ) {
        missed.push({
          packNumber: pa.packNumber,
          pickNumber: pa.pickNumber,
          cardName: signal.cardName,
          signalStrength: signal.signalStrength,
          archetype: signal.archetype,
          explanation: signal.explanation,
        });
      }
    }
  }

  return missed
    .sort((a, b) => b.signalStrength - a.signalStrength)
    .slice(0, 10);
}
