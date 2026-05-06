import type { ArchetypeId } from '../shared/types';
import type { CachedCardData } from '../data/types';
import type { SignalMap, SignalTier } from './types';
import {
  COLOR_TO_ARCHETYPE,
  TWO_COLOR_KEYS,
  MIN_SAMPLE_SIZE,
  STRONG_GIHWR_DELTA,
  MODERATE_GIHWR_DELTA,
  CONVERGE_GIHWR_BONUS,
} from '../shared/constants';

function isConvergeKey(key: string): boolean {
  const letters = key.replace(/[^A-Z]/g, '');
  return letters.length >= 3;
}

function isFixingCard(card: CachedCardData): boolean {
  const typesStr = card.types.join(' ').toLowerCase();
  if (typesStr.includes('land')) return true;
  const name = card.name.toLowerCase();
  if (
    name.includes('mana') ||
    name.includes('fixing') ||
    name.includes('prism') ||
    name.includes('signet') ||
    name.includes('locket') ||
    name.includes('terrace') ||
    name.includes('campus')
  )
    return true;
  return false;
}

function isGoldCard(card: CachedCardData): boolean {
  const colors = typeof card.color === 'string' ? card.color : '';
  return colors.length >= 2;
}

export function buildSignalMap(cachedCards: CachedCardData[]): SignalMap {
  const map: SignalMap = {};

  for (const card of cachedCards) {
    const archetypeGihwr: Partial<Record<ArchetypeId, number>> = {};
    let bestTwoColorGihwr = 0;
    let bestTwoColorArchetype: ArchetypeId | null = null;
    let secondBestGihwr = 0;
    let secondBestArchetype: ArchetypeId | null = null;

    for (const colorKey of TWO_COLOR_KEYS) {
      const stats = card.archetypeStats[colorKey];
      if (!stats || stats.everDrawnGameCount < MIN_SAMPLE_SIZE) continue;

      const archId = COLOR_TO_ARCHETYPE[colorKey];
      if (!archId) continue;

      archetypeGihwr[archId] = stats.gihwr;

      if (stats.gihwr > bestTwoColorGihwr) {
        secondBestGihwr = bestTwoColorGihwr;
        secondBestArchetype = bestTwoColorArchetype;
        bestTwoColorGihwr = stats.gihwr;
        bestTwoColorArchetype = archId;
      } else if (stats.gihwr > secondBestGihwr) {
        secondBestGihwr = stats.gihwr;
        secondBestArchetype = archId;
      }
    }

    let convergeWeightedGihwr = 0;
    let convergeTotalGames = 0;
    for (const [key, stats] of Object.entries(card.archetypeStats)) {
      if (!isConvergeKey(key)) continue;
      if (stats.everDrawnGameCount < MIN_SAMPLE_SIZE) continue;
      convergeWeightedGihwr += stats.gihwr * stats.everDrawnGameCount;
      convergeTotalGames += stats.everDrawnGameCount;
    }
    const convergeGihwr =
      convergeTotalGames >= 200
        ? convergeWeightedGihwr / convergeTotalGames
        : 0;

    const isConvergeSignal =
      convergeGihwr > bestTwoColorGihwr + CONVERGE_GIHWR_BONUS;

    if (isConvergeSignal) {
      archetypeGihwr.converge = convergeGihwr;
    }

    const fixing = isFixingCard(card);
    const delta = card.overallGihwr > 0
      ? bestTwoColorGihwr - card.overallGihwr
      : 0;

    let signalTier: SignalTier;
    if (fixing) {
      signalTier = 'fixing';
    } else if (
      delta >= STRONG_GIHWR_DELTA &&
      isGoldCard(card) &&
      bestTwoColorArchetype
    ) {
      signalTier = 'staple';
    } else if (delta >= STRONG_GIHWR_DELTA) {
      signalTier = 'strong';
    } else if (delta >= MODERATE_GIHWR_DELTA) {
      signalTier = 'moderate';
    } else {
      signalTier = 'weak';
    }

    const secondary =
      secondBestArchetype &&
      bestTwoColorGihwr - secondBestGihwr < 0.02
        ? secondBestArchetype
        : null;

    map[card.name] = {
      cardName: card.name,
      primaryArchetype: isConvergeSignal ? 'converge' : bestTwoColorArchetype,
      secondaryArchetype: isConvergeSignal ? bestTwoColorArchetype : secondary,
      signalTier,
      isConvergeSignal,
      isFixing: fixing,
      alsa: card.alsa,
      overallGihwr: card.overallGihwr,
      archetypeGihwr,
      gihwrDelta: delta,
    };
  }

  return map;
}
