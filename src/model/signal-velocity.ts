import type { ArchetypeId } from '../shared/types';
import type { PickAnalysis } from '../signals/types';
import type { VelocityMetrics } from './types';
import {
  VELOCITY_WINDOW_SIZE,
  VELOCITY_RECENCY_MULTIPLIER,
  VELOCITY_LOOKBACK,
  DUAL_CONFIRM_THRESHOLD,
} from '../shared/constants';

const ALL_ARCHETYPES: ArchetypeId[] = [
  'silverquill', 'lorehold', 'prismari', 'quandrix', 'witherbloom', 'converge',
];

function emptyRecord<T>(val: T): Record<ArchetypeId, T> {
  return {
    silverquill: val, lorehold: val, prismari: val,
    quandrix: val, witherbloom: val, converge: val,
  };
}

function packDirection(packNumber: number): 'left' | 'right' {
  return packNumber === 2 ? 'right' : 'left';
}

function perPickArchetypeSignals(pa: PickAnalysis): Record<ArchetypeId, number> {
  const totals = emptyRecord(0);
  for (const s of pa.cardSignals) {
    totals[s.archetype] += s.signalStrength;
  }
  return totals;
}

export function computeVelocityMetrics(
  pickAnalyses: PickAnalysis[],
  currentIndex: number,
): VelocityMetrics {
  const windowedScores = emptyRecord(0);
  const directionSignals: Record<ArchetypeId, { left: number; right: number }> = {} as any;
  for (const a of ALL_ARCHETYPES) {
    directionSignals[a] = { left: 0, right: 0 };
  }

  // Windowed scoring: picks within window get recency multiplier
  const windowStart = Math.max(0, currentIndex - VELOCITY_WINDOW_SIZE + 1);
  for (let i = 0; i <= currentIndex && i < pickAnalyses.length; i++) {
    const pa = pickAnalyses[i];
    const perArch = perPickArchetypeSignals(pa);
    const inWindow = i >= windowStart;
    const weight = inWindow ? VELOCITY_RECENCY_MULTIPLIER : 1.0;
    const dir = packDirection(pa.packNumber);

    for (const arch of ALL_ARCHETYPES) {
      windowedScores[arch] += perArch[arch] * weight;
      directionSignals[arch][dir] += perArch[arch];
    }
  }

  // Velocity: linear regression slope over last N picks
  const velocity = emptyRecord(0);
  const lookback = Math.min(VELOCITY_LOOKBACK, currentIndex + 1);
  if (lookback >= 2) {
    const startIdx = currentIndex - lookback + 1;
    // Build cumulative signal per archetype at each point in the lookback window
    for (const arch of ALL_ARCHETYPES) {
      let sumX = 0, sumY = 0, sumXY = 0, sumXX = 0;
      for (let j = 0; j < lookback; j++) {
        const idx = startIdx + j;
        if (idx < 0 || idx >= pickAnalyses.length) continue;
        const y = perPickArchetypeSignals(pickAnalyses[idx])[arch];
        sumX += j;
        sumY += y;
        sumXY += j * y;
        sumXX += j * j;
      }
      const denom = lookback * sumXX - sumX * sumX;
      if (denom !== 0) {
        velocity[arch] = (lookback * sumXY - sumX * sumY) / denom;
      }
    }
  }

  // Dual-confirmed archetypes
  const dualConfirmed: ArchetypeId[] = [];
  for (const arch of ALL_ARCHETYPES) {
    const d = directionSignals[arch];
    if (d.left >= DUAL_CONFIRM_THRESHOLD && d.right >= DUAL_CONFIRM_THRESHOLD) {
      dualConfirmed.push(arch);
    }
  }

  // Trending: sorted by velocity
  const trending = ALL_ARCHETYPES
    .map((arch) => ({
      archetype: arch,
      velocity: velocity[arch],
      direction: (velocity[arch] > 0.01 ? 'up' : velocity[arch] < -0.01 ? 'down' : 'flat') as 'up' | 'down' | 'flat',
    }))
    .sort((a, b) => b.velocity - a.velocity);

  return { windowedScores, velocity, directionSignals, dualConfirmed, trending };
}
