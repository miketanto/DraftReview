/**
 * Fast multi-set cache builder.
 *
 * Usage: npm run build-set -- MSH [DSK OTJ ...]   (or: tsx scripts/build-set.ts MSH)
 *
 * Unlike build-cache.ts (which does one card_based_performance call per card,
 * ~300 requests), this fetches per-archetype GIHWR via the card_ratings
 * `colors` filter: 1 overall call + 1 call per two-color pair (~11 requests
 * per set). Outputs data/{code}_card_data.json and
 * public/data/{code}_signal_map.json.
 */
import { writeFileSync, mkdirSync } from 'fs';
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
  startDate: string,
  endDate: string,
  colors?: string
): Promise<RatingRow[]> {
  const params = new URLSearchParams({
    expansion,
    event_type: eventType,
    start_date: startDate,
    end_date: endDate,
  });
  if (colors) params.set('colors', colors);

  const url = `${BASE}/card_ratings/data?${params}`;
  for (let attempt = 1; attempt <= 3; attempt++) {
    const res = await fetch(url, { headers: { Accept: 'application/json' } });
    if (res.ok) {
      const data = lenientParse(await res.text());
      if (!Array.isArray(data)) throw new Error(`Unexpected payload for ${url}`);
      return data as RatingRow[];
    }
    console.log(`  HTTP ${res.status} on ${colors ?? 'overall'}, retry ${attempt}/3...`);
    await sleep(RETRY_DELAY_MS * attempt);
  }
  throw new Error(`Failed after retries: ${url}`);
}

async function buildSet(code: string): Promise<void> {
  const config = SET_REGISTRY[code];
  if (!config) {
    throw new Error(
      `Unknown set '${code}'. Registered: ${Object.keys(SET_REGISTRY).join(', ')}`
    );
  }

  console.log(
    `\n=== ${code} (${config.name}) ${config.eventType} ${config.dataStartDate}..${config.dataEndDate} ===`
  );
  console.log('Fetching overall ratings...');
  const overall = await fetchRatings(
    code,
    config.eventType,
    config.dataStartDate,
    config.dataEndDate
  );
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
      archetypeStats: {},
    });
  }

  for (const pair of config.twoColorKeys) {
    await sleep(DELAY_MS);
    console.log(`Fetching ${pair} deck ratings...`);
    const rows = await fetchRatings(
      code,
      config.eventType,
      config.dataStartDate,
      config.dataEndDate,
      pair
    );
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
  const lower = code.toLowerCase();
  const cachePath = resolve(process.cwd(), `data/${lower}_card_data.json`);
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
