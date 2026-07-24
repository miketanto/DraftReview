import type { ArchetypeId } from '../shared/types';
import type { CachedCardData } from '../data/types';
import type { SignalMap, SignalTier } from './types';
import type { SetConfig } from '../shared/sets';
import { SOS_CONFIG } from '../shared/sets';
import {
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

/**
 * GIHWR percentile thresholds among well-sampled cards, used as a fallback
 * tier classification for sets where 17Lands no longer exposes per-deck-color
 * data (everything except SOS as of Jul 2026).
 */
function computeGihwrPercentiles(
  cards: CachedCardData[]
): { p60: number; p75: number; p85: number } | null {
  const rates = cards
    .filter((c) => c.everDrawnGameCount >= 200 && c.overallGihwr > 0)
    .map((c) => c.overallGihwr)
    .sort((a, b) => a - b);
  if (rates.length < 30) return null;
  const at = (p: number) => rates[Math.floor(rates.length * p)];
  return { p60: at(0.6), p75: at(0.75), p85: at(0.85) };
}

/**
 * Last-resort tiers from ALSA quartiles. 17Lands never hides draft stats,
 * so every card has ALSA even when win rates are sample-hidden — and pick
 * order IS the community's own card-quality signal.
 */
function computeAlsaQuartiles(
  cards: CachedCardData[]
): { p25: number; p50: number } | null {
  const alsas = cards
    .filter((c) => c.alsa > 0)
    .map((c) => c.alsa)
    .sort((a, b) => a - b);
  if (alsas.length < 30) return null;
  return {
    p25: alsas[Math.floor(alsas.length * 0.25)],
    p50: alsas[Math.floor(alsas.length * 0.5)],
  };
}

export function buildSignalMap(
  cachedCards: CachedCardData[],
  config: SetConfig = SOS_CONFIG
): SignalMap {
  const map: SignalMap = {};
  const multicolorArch = config.multicolorArchetype;
  const percentiles = computeGihwrPercentiles(cachedCards);
  const alsaQuartiles = computeAlsaQuartiles(cachedCards);

  for (const card of cachedCards) {
    const archetypeGihwr: Partial<Record<ArchetypeId, number>> = {};
    let bestTwoColorGihwr = 0;
    let bestTwoColorArchetype: ArchetypeId | null = null;
    let secondBestGihwr = 0;
    let secondBestArchetype: ArchetypeId | null = null;

    // 17Lands silently ignores the colors= filter for some sets and returns
    // the overall row for every pair — identical winrate AND game count
    // across all pairs. That is not real per-archetype data; drop it so the
    // card classifies via the overall-GIHWR/ALSA fallbacks instead.
    const pairStats = config.twoColorKeys
      .map((k) => card.archetypeStats[k])
      .filter(Boolean);
    const pairDataIsFake =
      pairStats.length >= 2 &&
      new Set(pairStats.map((s) => s.gihwr)).size === 1 &&
      new Set(pairStats.map((s) => s.everDrawnGameCount)).size === 1;

    for (const colorKey of pairDataIsFake ? [] : config.twoColorKeys) {
      const stats = card.archetypeStats[colorKey];
      if (!stats || stats.everDrawnGameCount < MIN_SAMPLE_SIZE) continue;

      const archId = config.colorToArchetype[colorKey];
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

    // Multicolor-soup archetype detection (SOS converge) — only for sets
    // that define one; generic sets skip this entirely.
    let isConvergeSignal = false;
    if (multicolorArch) {
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

      isConvergeSignal =
        convergeGihwr > bestTwoColorGihwr + CONVERGE_GIHWR_BONUS;

      if (isConvergeSignal) {
        archetypeGihwr[multicolorArch] = convergeGihwr;
      }
    }

    const fixing = isFixingCard(card);
    const hasPairData = bestTwoColorArchetype !== null;
    const delta = card.overallGihwr > 0
      ? bestTwoColorGihwr - card.overallGihwr
      : 0;

    let signalTier: SignalTier;
    if (fixing) {
      signalTier = 'fixing';
    } else if (hasPairData) {
      // Full-fidelity classification: GIHWR delta across color pairs
      if (
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
    } else if (
      percentiles &&
      card.overallGihwr > 0 &&
      card.everDrawnGameCount >= MIN_SAMPLE_SIZE
    ) {
      // Fallback 1: overall GIHWR percentile within the set (17Lands hides
      // per-pair winrates for low-volume queues)
      const wr = card.overallGihwr;
      if (wr >= percentiles.p85) {
        signalTier = isGoldCard(card) ? 'staple' : 'strong';
      } else if (wr >= percentiles.p75) {
        signalTier = 'strong';
      } else if (wr >= percentiles.p60) {
        signalTier = 'moderate';
      } else {
        signalTier = 'weak';
      }
    } else if (alsaQuartiles && card.alsa > 0) {
      // Fallback 2: ALSA quartiles — pick order is itself the community's
      // card-quality signal and is never sample-hidden
      if (card.alsa <= alsaQuartiles.p25) {
        signalTier = isGoldCard(card) ? 'staple' : 'strong';
      } else if (card.alsa <= alsaQuartiles.p50) {
        signalTier = 'moderate';
      } else {
        signalTier = 'weak';
      }
    } else {
      signalTier = 'weak';
    }

    // Fallback archetype assignment: an exactly-two-color card belongs to
    // that pair's archetype even without per-pair winrate data
    if (!bestTwoColorArchetype && typeof card.color === 'string') {
      bestTwoColorArchetype = config.colorToArchetype[card.color] ?? null;
    }

    const secondary =
      secondBestArchetype &&
      bestTwoColorGihwr - secondBestGihwr < 0.02
        ? secondBestArchetype
        : null;

    map[card.name] = {
      cardName: card.name,
      primaryArchetype:
        isConvergeSignal && multicolorArch
          ? multicolorArch
          : bestTwoColorArchetype,
      secondaryArchetype: isConvergeSignal ? bestTwoColorArchetype : secondary,
      signalTier,
      isConvergeSignal,
      isFixing: fixing,
      // 17Lands returns null draft stats for never-sampled cards; store 0
      // and let consumers treat <= 0 as "unknown"
      alsa: card.alsa ?? 0,
      ata: card.ata ?? 0,
      overallGihwr: card.overallGihwr,
      archetypeGihwr,
      gihwrDelta: delta,
    };
  }

  return map;
}
