/**
 * Fast multi-set cache builder.
 *
 * Usage: npm run build-set -- MSH [DSK OTJ ...]   (or: tsx scripts/build-set.ts MSH)
 *
 * Uses 17Lands' current /api/card_data endpoint (the one the website
 * itself calls) with time_period=ALL_TIME — the legacy /card_ratings/data
 * endpoint serves a dead database with near-zero game counts. The `colors`
 * filter genuinely works here: 1 overall call + 1 call per two-color pair
 * (~11 requests per set) gives real per-archetype GIHWR. Outputs
 * data/{code}_card_data.json and public/data/{code}_signal_map.json.
 *
 * 3+-color combos return no winrates on this endpoint, so for sets with a
 * multicolor archetype (SOS converge) the previous cache's 3+-color combo
 * stats are preserved by merging them into the fresh data.
 */
import { writeFileSync, readFileSync, existsSync, mkdirSync } from 'fs';
import { resolve } from 'path';
import type { CachedCardData } from '../src/data/types';
import { buildSignalMap } from '../src/signals/signal-map';
import { SET_REGISTRY } from '../src/shared/sets';

const BASE = 'https://www.17lands.com';
const DELAY_MS = 4000;
const RETRY_DELAY_MS = 60000;

interface RatingRow {
  name: string;
  mtga_id: number;
  color: string;
  rarity: string;
  types: string[];
  avg_seen: number | null;
  avg_pick: number | null;
  ever_drawn_win_rate: number | null;
  game_count: number;
  ever_drawn_game_count: number;
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

/** MSH payloads contain raw control characters that break strict JSON.parse */
function lenientParse(raw: string): unknown {
  // Raw control chars are invalid JSON everywhere (inside strings and out);
  // replacing them with spaces is always safe.
  // eslint-disable-next-line no-control-regex
  return JSON.parse(raw.replace(/[\x00-\x1f]/g, ' '));
}

async function fetchRatings(
  expansion: string,
  eventType: string,
  colors?: string
): Promise<RatingRow[]> {
  const params = new URLSearchParams({
    expansion,
    event_type: eventType,
    time_period: 'ALL_TIME',
  });
  if (colors) params.set('colors', colors);

  const url = `${BASE}/api/card_data?${params}`;
  for (let attempt = 1; attempt <= 3; attempt++) {
    const res = await fetch(url, { headers: { Accept: 'application/json' } });
    if (res.ok) {
      const payload = lenientParse(await res.text()) as { data?: unknown };
      const data = Array.isArray(payload) ? payload : payload.data;
      if (!Array.isArray(data)) throw new Error(`Unexpected payload for ${url}`);
      return data as RatingRow[];
    }
    console.log(`  HTTP ${res.status} on ${colors ?? 'overall'}, retry ${attempt}/3...`);
    await sleep(RETRY_DELAY_MS * attempt);
  }
  throw new Error(`Failed after retries: ${url}`);
}

/**
 * The /api/card_data endpoint has no winrates for 3+-color combos, so keep
 * the previous cache's multicolor combo stats (SOS converge detection
 * feeds on keys like 'WUB' / 'BG+').
 */
function harvestMulticolorStats(
  cachePath: string
): Map<number, CachedCardData['archetypeStats']> {
  const out = new Map<number, CachedCardData['archetypeStats']>();
  if (!existsSync(cachePath)) return out;
  const old: CachedCardData[] = JSON.parse(readFileSync(cachePath, 'utf-8'));
  for (const card of old) {
    const multi: CachedCardData['archetypeStats'] = {};
    for (const [key, stats] of Object.entries(card.archetypeStats)) {
      const letters = key.replace(/[^A-Z]/g, '');
      if (letters.length >= 3 || key.includes('+')) multi[key] = stats;
    }
    if (Object.keys(multi).length > 0) out.set(card.mtgaId, multi);
  }
  return out;
}

async function buildSet(code: string): Promise<void> {
  const config = SET_REGISTRY[code];
  if (!config) {
    throw new Error(
      `Unknown set '${code}'. Registered: ${Object.keys(SET_REGISTRY).join(', ')}`
    );
  }

  const lower = code.toLowerCase();
  const cachePath = resolve(process.cwd(), `data/${lower}_card_data.json`);

  // Preserve multicolor combo stats from the previous cache before overwrite
  const multicolorStats = config.multicolorArchetype
    ? harvestMulticolorStats(cachePath)
    : new Map<number, CachedCardData['archetypeStats']>();

  console.log(
    `\n=== ${code} (${config.name}) ${config.eventType} ALL_TIME ===`
  );
  console.log('Fetching overall ratings...');
  const overall = await fetchRatings(code, config.eventType);
  console.log(`  ${overall.length} cards`);

  const byId = new Map<number, CachedCardData>();
  for (const r of overall) {
    byId.set(r.mtga_id, {
      name: r.name,
      mtgaId: r.mtga_id,
      color: r.color,
      rarity: r.rarity,
      types: r.types ?? [],
      alsa: r.avg_seen ?? 0,
      ata: r.avg_pick ?? 0,
      overallGihwr: r.ever_drawn_win_rate ?? 0,
      gameCount: r.game_count,
      everDrawnGameCount: r.ever_drawn_game_count,
      archetypeStats: { ...(multicolorStats.get(r.mtga_id) ?? {}) },
    });
  }

  for (const pair of config.twoColorKeys) {
    await sleep(DELAY_MS);
    console.log(`Fetching ${pair} deck ratings...`);
    const rows = await fetchRatings(code, config.eventType, pair);
    let joined = 0;
    for (const r of rows) {
      const card = byId.get(r.mtga_id);
      if (!card || r.ever_drawn_win_rate == null) continue;
      card.archetypeStats[pair] = {
        gameCount: r.game_count,
        everDrawnGameCount: r.ever_drawn_game_count,
        gihwr: r.ever_drawn_win_rate,
      };
      joined++;
    }
    console.log(`  ${joined} cards with ${pair} data`);
  }

  const cards = [...byId.values()];
  const mapPath = resolve(process.cwd(), `public/data/${lower}_signal_map.json`);
  mkdirSync(resolve(process.cwd(), 'data'), { recursive: true });
  mkdirSync(resolve(process.cwd(), 'public/data'), { recursive: true });

  writeFileSync(cachePath, JSON.stringify(cards, null, 2));

  const signalMap = buildSignalMap(cards, config);
  const entries = Object.values(signalMap);
  const tally = (t: string) => entries.filter((e) => e.signalTier === t).length;
  console.log(
    `Signal map: staple ${tally('staple')}, strong ${tally('strong')}, ` +
      `moderate ${tally('moderate')}, weak ${tally('weak')}, fixing ${tally('fixing')}`
  );

  writeFileSync(mapPath, JSON.stringify(signalMap, null, 2));
  console.log(`Wrote ${cachePath}\nWrote ${mapPath}`);
}

async function main() {
  const codes = process.argv.slice(2).map((c) => c.toUpperCase());
  if (codes.length === 0) {
    console.error('Usage: tsx scripts/build-set.ts <CODE> [<CODE> ...]');
    process.exit(1);
  }
  for (const code of codes) {
    await buildSet(code);
    if (codes.length > 1) await sleep(DELAY_MS);
  }
}

main().catch((err) => {
  console.error('Fatal:', err);
  process.exit(1);
});
