import { readFileSync, writeFileSync } from 'fs';
import { resolve } from 'path';
import type { CachedCardData } from '../src/data/types';
import { buildSignalMap } from '../src/signals/signal-map';

const inPath = resolve(process.cwd(), 'data/sos_card_data.json');
const outPath = resolve(process.cwd(), 'public/data/sos_signal_map.json');

console.log(`Reading cached card data from ${inPath}...`);
const cards: CachedCardData[] = JSON.parse(readFileSync(inPath, 'utf-8'));
console.log(`Processing ${cards.length} cards...`);

const signalMap = buildSignalMap(cards);
const entries = Object.values(signalMap);

const staples = entries.filter((e) => e.signalTier === 'staple').length;
const strong = entries.filter((e) => e.signalTier === 'strong').length;
const moderate = entries.filter((e) => e.signalTier === 'moderate').length;
const weak = entries.filter((e) => e.signalTier === 'weak').length;
const fixing = entries.filter((e) => e.signalTier === 'fixing').length;
const converge = entries.filter((e) => e.isConvergeSignal).length;

console.log(`Signal map built:`);
console.log(`  Staple: ${staples}`);
console.log(`  Strong: ${strong}`);
console.log(`  Moderate: ${moderate}`);
console.log(`  Weak: ${weak}`);
console.log(`  Fixing: ${fixing}`);
console.log(`  Converge signals: ${converge}`);

writeFileSync(outPath, JSON.stringify(signalMap, null, 2));
console.log(`\nWrote signal map to ${outPath}`);
