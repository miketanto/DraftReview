import { writeFileSync, readFileSync, existsSync } from 'fs';
import { resolve } from 'path';
import type { RawDailyStat, CachedCardData } from '../src/data/types';
import {
  fetchCardRatings,
  fetchCardPerformance,
  sleep,
} from '../src/data/fetcher';
import {
  EXPANSION,
  EVENT_TYPE,
  DATA_START_DATE,
  DATA_END_DATE,
} from '../src/shared/constants';

const DELAY_MS = 3000;
const RETRY_DELAY_MS = 30000;
const MAX_RETRIES = 3;
const OUT_PATH = resolve(process.cwd(), 'data/sos_card_data.json');

function aggregateDailyStats(stats: RawDailyStat[]): {
  gameCount: number;
  everDrawnGameCount: number;
  gihwr: number;
} {
  let totalGameCount = 0;
  let totalEverDrawnGameCount = 0;
  let weightedGihwr = 0;

  for (const day of stats) {
    totalGameCount += day.game_count;
    totalEverDrawnGameCount += day.ever_drawn_game_count;
    weightedGihwr += day.ever_drawn_win_rate * day.ever_drawn_game_count;
  }

  return {
    gameCount: totalGameCount,
    everDrawnGameCount: totalEverDrawnGameCount,
    gihwr:
      totalEverDrawnGameCount > 0
        ? weightedGihwr / totalEverDrawnGameCount
        : 0,
  };
}

async function fetchWithRetry(
  mtgaId: number,
  name: string
): Promise<CachedCardData['archetypeStats'] | null> {
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const perf = await fetchCardPerformance(
        mtgaId,
        EXPANSION,
        EVENT_TYPE,
        DATA_START_DATE,
        DATA_END_DATE
      );

      const archetypeStats: CachedCardData['archetypeStats'] = {};
      for (const [colorCombo, dailyStats] of Object.entries(
        perf.performances
      )) {
        if (colorCombo === 'all') continue;
        archetypeStats[colorCombo] = aggregateDailyStats(dailyStats);
      }
      return archetypeStats;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (attempt < MAX_RETRIES && msg.includes('403')) {
        console.log(
          `    Rate limited on ${name}, retry ${attempt}/${MAX_RETRIES} after ${RETRY_DELAY_MS}ms...`
        );
        await sleep(RETRY_DELAY_MS * attempt);
      } else {
        console.error(`  FAILED for ${name} (attempt ${attempt}): ${msg}`);
        return null;
      }
    }
  }
  return null;
}

async function main() {
  const patchMode = existsSync(OUT_PATH);
  let existing: CachedCardData[] = [];

  if (patchMode) {
    existing = JSON.parse(readFileSync(OUT_PATH, 'utf-8'));
    const needPatch = existing.filter(
      (c) => Object.keys(c.archetypeStats).length === 0
    );
    console.log(
      `Patch mode: ${needPatch.length} of ${existing.length} cards need re-fetch`
    );

    if (needPatch.length === 0) {
      console.log('All cards already have data. Nothing to do.');
      return;
    }

    let patched = 0;
    for (let i = 0; i < existing.length; i++) {
      const card = existing[i];
      if (Object.keys(card.archetypeStats).length > 0) continue;

      patched++;
      console.log(
        `  [${patched}/${needPatch.length}] ${card.name} (mtga_id: ${card.mtgaId})`
      );

      const stats = await fetchWithRetry(card.mtgaId, card.name);
      if (stats) {
        existing[i] = { ...card, archetypeStats: stats };
      }

      // Save progress every 10 cards
      if (patched % 10 === 0) {
        writeFileSync(OUT_PATH, JSON.stringify(existing, null, 2));
        console.log(`  (saved progress)`);
      }

      await sleep(DELAY_MS);
    }

    writeFileSync(OUT_PATH, JSON.stringify(existing, null, 2));
    const stillEmpty = existing.filter(
      (c) => Object.keys(c.archetypeStats).length === 0
    ).length;
    console.log(
      `\nDone! Patched cache. ${stillEmpty} cards still missing data.`
    );
    return;
  }

  console.log('Phase A: Fetching card ratings...');
  const ratings = await fetchCardRatings(
    EXPANSION,
    EVENT_TYPE,
    DATA_START_DATE,
    DATA_END_DATE
  );
  console.log(`Got ${ratings.length} cards from card_ratings`);

  const results: CachedCardData[] = [];
  const total = ratings.length;

  console.log(`Phase B: Fetching per-card performance (${total} cards)...`);

  for (let i = 0; i < total; i++) {
    const rating = ratings[i];
    console.log(
      `  [${i + 1}/${total}] ${rating.name} (mtga_id: ${rating.mtga_id})`
    );

    const stats = await fetchWithRetry(rating.mtga_id, rating.name);

    results.push({
      name: rating.name,
      mtgaId: rating.mtga_id,
      color: rating.color,
      rarity: rating.rarity,
      types: [],
      alsa: rating.avg_seen,
      ata: rating.avg_pick,
      overallGihwr: rating.ever_drawn_win_rate,
      gameCount: rating.game_count,
      everDrawnGameCount: rating.ever_drawn_game_count,
      archetypeStats: stats || {},
    });

    if (i < total - 1) await sleep(DELAY_MS);
  }

  writeFileSync(OUT_PATH, JSON.stringify(results, null, 2));
  console.log(`\nDone! Wrote ${results.length} cards to ${OUT_PATH}`);
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
