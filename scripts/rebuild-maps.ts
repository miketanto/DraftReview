/** Rebuild signal maps from already-cached card data (no API calls). */
import { readFileSync, writeFileSync } from 'fs';
import { buildSignalMap } from '../src/signals/signal-map';
import { SET_REGISTRY } from '../src/shared/sets';

const codes = process.argv.slice(2).map((c) => c.toUpperCase());
if (codes.length === 0) {
  console.error('Usage: tsx scripts/rebuild-maps.ts <CODE> [<CODE> ...]');
  process.exit(1);
}

for (const code of codes) {
  const config = SET_REGISTRY[code];
  if (!config) {
    console.error(`Unknown set '${code}'`);
    continue;
  }
  const lower = code.toLowerCase();
  const cards = JSON.parse(
    readFileSync(`data/${lower}_card_data.json`, 'utf-8')
  );
  const map = buildSignalMap(cards, config);
  const entries = Object.values(map);
  const tally: Record<string, number> = {};
  for (const e of entries) tally[e.signalTier] = (tally[e.signalTier] ?? 0) + 1;
  const withArch = entries.filter((e) => e.primaryArchetype).length;
  writeFileSync(
    `public/data/${lower}_signal_map.json`,
    JSON.stringify(map, null, 2)
  );
  console.log(
    code,
    JSON.stringify(tally),
    '| primaryArch:',
    withArch,
    '/',
    entries.length
  );
}
