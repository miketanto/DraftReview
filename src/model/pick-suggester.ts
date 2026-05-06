import type { ArchetypeId, Card } from '../shared/types';
import type { SignalMap } from '../signals/types';
import type { VelocityMetrics, PoolState, PickSuggestion, ArchetypePosterior } from './types';
import { evaluateCardFit } from './pool-evaluator';
import { ARCHETYPES, PICK_SCORE_WEIGHTS } from '../shared/constants';

const ALL_ARCHETYPES: ArchetypeId[] = [
  'silverquill', 'lorehold', 'prismari', 'quandrix', 'witherbloom', 'converge',
];

function getWeights(packNumber: number, pickNumber: number) {
  const progress = ((packNumber - 1) * 14 + pickNumber - 1) / 42;
  return {
    alpha: PICK_SCORE_WEIGHTS.alpha,
    beta: PICK_SCORE_WEIGHTS.beta,
    gamma: PICK_SCORE_WEIGHTS.gamma * (0.5 + progress),
    delta: PICK_SCORE_WEIGHTS.delta * (1 - progress * 0.8),
    epsilon: PICK_SCORE_WEIGHTS.epsilon * (0.3 + progress * 0.7),
  };
}

function normalize(value: number, min: number, max: number): number {
  if (max <= min) return 0;
  return Math.max(0, Math.min(1, (value - min) / (max - min)));
}

function archetypesWithData(
  entry: { archetypeGihwr: Partial<Record<ArchetypeId, number>> },
): ArchetypeId[] {
  return ALL_ARCHETYPES.filter((a) => entry.archetypeGihwr[a] != null);
}

function cardBestArchetype(
  entry: { archetypeGihwr: Partial<Record<ArchetypeId, number>>; primaryArchetype: ArchetypeId | null },
): ArchetypeId {
  if (entry.primaryArchetype) return entry.primaryArchetype;
  let bestArch: ArchetypeId = 'lorehold';
  let bestGihwr = 0;
  for (const arch of ALL_ARCHETYPES) {
    const g = entry.archetypeGihwr[arch];
    if (g != null && g > bestGihwr) {
      bestGihwr = g;
      bestArch = arch;
    }
  }
  return bestArch;
}

function evaluatedArchetype(
  entry: { archetypeGihwr: Partial<Record<ArchetypeId, number>>; primaryArchetype: ArchetypeId | null },
  posterior?: ArchetypePosterior | null,
): ArchetypeId {
  const withData = archetypesWithData(entry);
  if (withData.length === 0) return cardBestArchetype(entry);

  if (posterior) {
    let bestArch = withData[0];
    let bestWeighted = -Infinity;
    for (const arch of withData) {
      const gihwr = entry.archetypeGihwr[arch]!;
      const weighted = gihwr * posterior.probabilities[arch];
      if (weighted > bestWeighted) {
        bestWeighted = weighted;
        bestArch = arch;
      }
    }
    return bestArch;
  }

  return cardBestArchetype(entry);
}

function scoreOptionality(
  entry: { archetypeGihwr: Partial<Record<ArchetypeId, number>> },
  packNumber: number,
  pickNumber: number,
): number {
  const gihwrs = ALL_ARCHETYPES
    .map((a) => entry.archetypeGihwr[a])
    .filter((g): g is number => g != null && g > 0);
  if (gihwrs.length === 0) return 0;

  const best = Math.max(...gihwrs);
  const threshold = best * 0.97;
  const viableCount = gihwrs.filter((g) => g >= threshold).length;
  const progress = ((packNumber - 1) * 14 + pickNumber - 1) / 42;
  return (viableCount / 5) * (1 - progress * 0.8);
}

function scorePivotCost(
  card: Card,
  pool: PoolState,
): number {
  if (pool.pickCount === 0) return 0;
  const cardColors = card.color || [];
  if (cardColors.length === 0) return 0;

  let mismatched = 0;
  for (const c of cardColors) {
    if (!pool.primaryColors.includes(c as any)) {
      mismatched++;
    }
  }
  if (mismatched === 0) return 0;

  const commitmentStrength = pool.primaryColors
    .reduce((sum, c) => sum + pool.normalizedColorCommitment[c], 0) / 2;
  return (mismatched / cardColors.length) * commitmentStrength * 0.5;
}

export function suggestPicks(
  availableCards: Card[],
  pool: PoolState,
  velocityMetrics: VelocityMetrics,
  signalMap: SignalMap,
  packNumber: number,
  pickNumber: number,
  posterior?: ArchetypePosterior | null,
): PickSuggestion[] {
  const weights = getWeights(packNumber, pickNumber);

  const velocityValues = ALL_ARCHETYPES.map((a) => velocityMetrics.velocity[a]);
  const minVel = Math.min(...velocityValues);
  const maxVel = Math.max(...velocityValues);

  const scored: PickSuggestion[] = [];

  for (const card of availableCards) {
    const entry = signalMap[card.name];
    if (!entry) {
      scored.push({
        cardName: card.name,
        rank: 0,
        totalScore: 0,
        components: { archetypeGihwr: 0, signalVelocity: 0, poolFit: 0, optionality: 0, pivotCost: 0 },
        explanation: 'No signal data',
        evaluatedArchetype: 'lorehold',
      });
      continue;
    }

    const bestArch = evaluatedArchetype(entry, posterior);
    const withData = archetypesWithData(entry);

    // Component 1: Archetype GIHWR — only use actual data, never overallGihwr as substitute
    let archetypeGihwr: number;
    if (posterior && withData.length > 0) {
      let totalWeight = 0;
      archetypeGihwr = 0;
      for (const a of withData) {
        const w = posterior.probabilities[a];
        archetypeGihwr += entry.archetypeGihwr[a]! * w;
        totalWeight += w;
      }
      if (totalWeight > 0) {
        archetypeGihwr /= totalWeight;
      } else {
        archetypeGihwr = entry.overallGihwr;
      }
    } else {
      archetypeGihwr = entry.archetypeGihwr[bestArch] ?? entry.overallGihwr;
    }
    const normGihwr = normalize(archetypeGihwr, 0.40, 0.65);

    // Component 2: Signal velocity — use the card's actual best archetype
    const cardVelocity = velocityMetrics.velocity[bestArch] ?? 0;
    const normVelocity = normalize(cardVelocity, minVel, maxVel);

    // Component 3: Pool fit
    const fit = evaluateCardFit(card, pool, signalMap);
    const normPoolFit = fit.poolFitScore;

    // Component 4: Optionality
    const optionality = scoreOptionality(entry, packNumber, pickNumber);

    // Component 5: Pivot cost
    const pivotCost = scorePivotCost(card, pool);

    const totalScore =
      weights.alpha * normGihwr +
      weights.beta * normVelocity +
      weights.gamma * normPoolFit +
      weights.delta * optionality -
      weights.epsilon * pivotCost;

    const components = { archetypeGihwr: normGihwr, signalVelocity: normVelocity, poolFit: normPoolFit, optionality, pivotCost };
    const displayArch = cardBestArchetype(entry);
    const explanation = buildExplanation(entry, displayArch, bestArch, components, weights, fit);

    scored.push({
      cardName: card.name,
      rank: 0,
      totalScore,
      components,
      explanation,
      evaluatedArchetype: displayArch,
    });
  }

  scored.sort((a, b) => b.totalScore - a.totalScore);
  for (let i = 0; i < scored.length; i++) {
    scored[i].rank = i + 1;
  }

  return scored;
}

function buildExplanation(
  entry: { overallGihwr: number; archetypeGihwr: Partial<Record<ArchetypeId, number>> },
  displayArch: ArchetypeId,
  scoredArch: ArchetypeId,
  components: PickSuggestion['components'],
  weights: ReturnType<typeof getWeights>,
  fit: { explanation: string },
): string {
  const parts: string[] = [];
  const total = components.archetypeGihwr * weights.alpha +
    components.signalVelocity * weights.beta +
    components.poolFit * weights.gamma +
    components.optionality * weights.delta;

  if (total === 0) return 'Low signal data';

  const gihwrContrib = (components.archetypeGihwr * weights.alpha) / total;
  const velContrib = (components.signalVelocity * weights.beta) / total;
  const fitContrib = (components.poolFit * weights.gamma) / total;
  const optContrib = (components.optionality * weights.delta) / total;

  const gihwr = entry.archetypeGihwr[displayArch] ?? entry.overallGihwr;

  if (gihwrContrib > 0.2) {
    parts.push(`${(gihwr * 100).toFixed(1)}% in ${ARCHETYPES[displayArch].name}`);
  }
  if (velContrib > 0.2) {
    parts.push(`${ARCHETYPES[scoredArch].name} trending`);
  }
  if (fitContrib > 0.2 && fit.explanation !== 'neutral fit') {
    parts.push(fit.explanation);
  }
  if (optContrib > 0.2) {
    parts.push('flexible');
  }
  if (components.pivotCost > 0.2) {
    parts.push('pivot cost');
  }

  return parts.join(' · ') || 'Moderate pick';
}
