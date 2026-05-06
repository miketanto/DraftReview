import type { ArchetypeId, Color, DraftPick } from '../shared/types';
import type { SignalMap } from '../signals/types';
import type { PoolState, CardPoolFit } from './types';
import {
  IDEAL_CURVE,
  ROLE_TARGETS,
  KNOWN_REMOVAL,
  KNOWN_CARD_DRAW,
  COLOR_TO_ARCHETYPE,
} from '../shared/constants';
import type { Card } from '../shared/types';

const ALL_COLORS: Color[] = ['W', 'U', 'B', 'R', 'G'];

function parseCmc(manaCost: string): number {
  if (!manaCost) return 0;
  let total = 0;
  const tokens = manaCost.match(/\{([^}]+)\}/g) || [];
  for (const token of tokens) {
    const inner = token.slice(1, -1);
    if (inner === 'X') continue;
    const num = parseInt(inner, 10);
    if (!isNaN(num)) {
      total += num;
    } else if (inner.includes('/')) {
      total += 1;
    } else if (/^[WUBRGC]$/.test(inner)) {
      total += 1;
    }
  }
  return total;
}

function classifyRole(
  card: Card,
  signalMap: SignalMap,
): 'creature' | 'removal' | 'cardDraw' | 'fixing' | 'other' {
  const entry = signalMap[card.name];
  if (entry?.isFixing) return 'fixing';

  const nameLower = card.name.toLowerCase();
  if (KNOWN_REMOVAL.some((r) => nameLower === r.toLowerCase())) return 'removal';
  if (KNOWN_CARD_DRAW.some((d) => nameLower === d.toLowerCase())) return 'cardDraw';

  const typesStr = (card.types || []).join(' ').toLowerCase();
  if (typesStr.includes('creature')) return 'creature';

  if (
    nameLower.includes('destroy') || nameLower.includes('exile') ||
    nameLower.includes('murder') || nameLower.includes('smite') ||
    nameLower.includes('burn') || nameLower.includes('bolt')
  ) return 'removal';

  return 'other';
}

function scaledIdealCurve(pickCount: number): Record<number, number> {
  const scaled: Record<number, number> = {};
  const totalIdeal = Object.values(IDEAL_CURVE).reduce((a, b) => a + b, 0);
  for (const [cmc, count] of Object.entries(IDEAL_CURVE)) {
    scaled[Number(cmc)] = (count / totalIdeal) * pickCount;
  }
  return scaled;
}

export function buildPoolState(
  picks: DraftPick[],
  upToIndex: number,
  signalMap: SignalMap,
): PoolState {
  const commitment: Record<Color, number> = { W: 0, U: 0, B: 0, R: 0, G: 0 };
  const curve: Record<number, number> = {};
  const roles = { creatures: 0, removal: 0, cardDraw: 0, fixing: 0, other: 0 };
  let pickCount = 0;

  for (let i = 0; i <= upToIndex && i < picks.length; i++) {
    const card = picks[i].pickedCard;
    pickCount++;

    // Color commitment weighted by pick order
    const weight = 1 / (1 + 0.05 * i);
    for (const c of card.color || []) {
      if (ALL_COLORS.includes(c as Color)) {
        commitment[c as Color] += weight;
      }
    }

    // Curve
    const cmc = Math.min(parseCmc(card.manaCost), 7);
    curve[cmc] = (curve[cmc] || 0) + 1;

    // Role
    const role = classifyRole(card, signalMap);
    if (role === 'creature') roles.creatures++;
    else if (role === 'removal') roles.removal++;
    else if (role === 'cardDraw') roles.cardDraw++;
    else if (role === 'fixing') roles.fixing++;
    else roles.other++;
  }

  // Normalized color commitment
  const maxCommitment = Math.max(...Object.values(commitment), 0.001);
  const normalizedColorCommitment: Record<Color, number> = { W: 0, U: 0, B: 0, R: 0, G: 0 };
  for (const c of ALL_COLORS) {
    normalizedColorCommitment[c] = commitment[c] / maxCommitment;
  }

  // Primary colors (top 2 with >20% of max)
  const primaryColors = ALL_COLORS
    .filter((c) => normalizedColorCommitment[c] > 0.2)
    .sort((a, b) => commitment[b] - commitment[a])
    .slice(0, 2);

  // Curve gaps
  const ideal = scaledIdealCurve(pickCount);
  const curveGaps: PoolState['curveGaps'] = [];
  for (let cmc = 1; cmc <= 7; cmc++) {
    const have = curve[cmc] || 0;
    const target = ideal[cmc] || 0;
    const deficit = Math.max(0, target - have);
    if (deficit > 0.3) {
      curveGaps.push({ cmc, have, ideal: target, deficit });
    }
  }

  // Role deficits
  const roleDeficits: PoolState['roleDeficits'] = [];
  const scaledTargets = {
    creatures: (ROLE_TARGETS.creatures / 23) * pickCount,
    removal: (ROLE_TARGETS.removal / 23) * pickCount,
    cardDraw: (ROLE_TARGETS.cardDraw / 23) * pickCount,
    fixing: (ROLE_TARGETS.fixing / 23) * pickCount,
  };
  for (const [role, target] of Object.entries(scaledTargets)) {
    const have = roles[role as keyof typeof roles];
    const deficit = Math.max(0, target - have);
    if (deficit > 0.3) {
      roleDeficits.push({ role, have, target, deficit });
    }
  }

  // Inferred archetype from primary colors
  let inferredArchetype: ArchetypeId | null = null;
  if (primaryColors.length >= 2) {
    const pair = primaryColors.slice(0, 2).sort().join('');
    inferredArchetype = COLOR_TO_ARCHETYPE[pair] ?? null;
  }
  if (!inferredArchetype && primaryColors.length >= 3) {
    inferredArchetype = 'converge';
  }

  return {
    pickCount,
    colorCommitment: commitment,
    normalizedColorCommitment,
    primaryColors,
    curve,
    curveGaps,
    roles,
    roleDeficits,
    inferredArchetype,
  };
}

export function evaluateCardFit(
  card: Card,
  pool: PoolState,
  signalMap: SignalMap,
): CardPoolFit {
  const parts: string[] = [];

  // Color fit: does it match committed colors?
  let colorFit = 0;
  const cardColors = card.color || [];
  if (cardColors.length === 0) {
    colorFit = 0.7; // colorless: decent fit everywhere
  } else {
    const matching = cardColors.filter((c) =>
      pool.primaryColors.includes(c as Color)
    ).length;
    colorFit = cardColors.length > 0 ? matching / cardColors.length : 0.5;
  }
  if (colorFit >= 0.8) parts.push('on-color');

  // Curve fit: does it fill a gap?
  const cmc = Math.min(parseCmc(card.manaCost), 7);
  let curveFit = 0.3; // baseline
  for (const gap of pool.curveGaps) {
    if (gap.cmc === cmc) {
      curveFit = Math.min(1, 0.5 + gap.deficit * 0.3);
      parts.push(`fills ${cmc}-drop gap`);
      break;
    }
  }

  // Role fit: does it fill a needed role?
  const role = classifyRole(card, signalMap);
  let roleFit = 0.3;
  for (const deficit of pool.roleDeficits) {
    if (deficit.role === role || (role === 'creature' && deficit.role === 'creatures')) {
      roleFit = Math.min(1, 0.5 + deficit.deficit * 0.25);
      parts.push(`fills ${deficit.role} need`);
      break;
    }
  }

  // Diminishing returns
  let diminishingReturn = 0;
  const roleCount = role === 'creature' ? pool.roles.creatures
    : role === 'removal' ? pool.roles.removal
    : role === 'cardDraw' ? pool.roles.cardDraw
    : role === 'fixing' ? pool.roles.fixing
    : pool.roles.other;
  const roleTarget = role === 'creature' ? ROLE_TARGETS.creatures
    : role === 'removal' ? ROLE_TARGETS.removal
    : role === 'cardDraw' ? ROLE_TARGETS.cardDraw
    : role === 'fixing' ? ROLE_TARGETS.fixing
    : 5;
  if (roleCount > roleTarget) {
    diminishingReturn = Math.min(0.5, (roleCount - roleTarget) * 0.15);
    parts.push('redundant');
  }

  const poolFitScore = (colorFit * 0.4 + curveFit * 0.25 + roleFit * 0.25) * (1 - diminishingReturn);

  return {
    cardName: card.name,
    poolFitScore,
    colorFit,
    curveFit,
    roleFit,
    diminishingReturn,
    explanation: parts.join(', ') || 'neutral fit',
  };
}
