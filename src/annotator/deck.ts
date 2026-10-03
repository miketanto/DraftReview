import type { RawDraftCard } from '../data/types';
import type { SignalMap } from '../signals/types';
import type { SetConfig } from '../shared/sets';
import { parseCmc } from '../model/pool-evaluator';
import type { DeckVersion } from './types';

export const COLORS = ['W', 'U', 'B', 'R', 'G'] as const;
export type ManaColor = (typeof COLORS)[number];
export const BASIC_NAMES: Record<ManaColor, string> = {
  W: 'Plains', U: 'Island', B: 'Swamp', R: 'Mountain', G: 'Forest',
};
const PAIR_NAMES: Record<string, string> = {
  WU: 'Azorius', WB: 'Orzhov', WR: 'Boros', WG: 'Selesnya', UB: 'Dimir',
  UR: 'Izzet', UG: 'Simic', BR: 'Rakdos', BG: 'Golgari', RG: 'Gruul',
};

export const isLand = (c: RawDraftCard) => c.types.some((t) => t.includes('Land'));
export const cmcOf = (c: RawDraftCard) => parseCmc(c.mana_cost);

/** Colors from the 17Lands field, falling back to mana-cost pips */
export function cardColors(c: RawDraftCard): ManaColor[] {
  if (c.color?.length) return c.color.filter((x): x is ManaColor => (COLORS as readonly string[]).includes(x));
  return COLORS.filter((x) => c.mana_cost.includes(x));
}

/** Multiset difference: pool cards not in the main deck */
export function sideboardOf(pool: RawDraftCard[], main: string[]): RawDraftCard[] {
  const left = new Map<string, number>();
  for (const n of main) left.set(n, (left.get(n) ?? 0) + 1);
  return pool.filter((c) => {
    const n = left.get(c.name) ?? 0;
    if (n > 0) { left.set(c.name, n - 1); return false; }
    return true;
  });
}

/** Split `total` basics across colors by colored-pip count in the main deck */
export function splitBasics(mainCards: RawDraftCard[], total: number): Partial<Record<ManaColor, number>> {
  const pips: Record<string, number> = {};
  for (const c of mainCards) {
    for (const ch of c.mana_cost) if ((COLORS as readonly string[]).includes(ch)) pips[ch] = (pips[ch] ?? 0) + 1;
  }
  const sum = Object.values(pips).reduce((a, b) => a + b, 0);
  if (!sum || total <= 0) return {};
  const out: Partial<Record<ManaColor, number>> = {};
  let given = 0;
  const entries = Object.entries(pips).sort((a, b) => b[1] - a[1]) as [ManaColor, number][];
  for (const [col, n] of entries) {
    out[col] = Math.floor((n / sum) * total);
    given += out[col]!;
  }
  // Remainder to the heaviest colors
  for (let i = 0; given < total; i = (i + 1) % entries.length, given++) out[entries[i][0]]! += 1;
  return out;
}

/**
 * Auto-build one 40-card version per promising color pair: playables in
 * those colors ranked by archetype GIHWR (falling back to overall GIHWR,
 * then pick order), up to 23 spells + 17 basics. Thin pairs come out short
 * of 40 on purpose — the UI shows the count.
 * ponytail: greedy top-23 by winrate, ignores curve/creature count — tweak by hand.
 */
export function suggestDecks(
  pool: RawDraftCard[],
  signalMap: SignalMap | null,
  config: SetConfig | null,
  count = 3,
): DeckVersion[] {
  const score = (c: RawDraftCard, pair: string) => {
    const s = signalMap?.[c.name];
    const arch = config?.colorToArchetype[pair];
    const archWr = arch ? s?.archetypeGihwr[arch] : undefined;
    return archWr ?? s?.overallGihwr ?? 0;
  };
  const pairs = Object.keys(PAIR_NAMES).map((pair) => {
    const playable = pool
      .map((c, i) => ({ c, i }))
      .filter(({ c }) => !isLand(c) && cardColors(c).every((x) => pair.includes(x)))
      .sort((a, b) => score(b.c, pair) - score(a.c, pair) || a.i - b.i)
      .slice(0, 23)
      .map(({ c }) => c);
    const strength = playable.reduce((a, c) => a + score(c, pair), 0) + playable.length;
    return { pair, playable, strength };
  });
  return pairs
    .sort((a, b) => b.strength - a.strength)
    .slice(0, count)
    .map(({ pair, playable }) => ({
      id: `auto-${pair}`,
      name: `${PAIR_NAMES[pair]} (${pair})`,
      main: playable.map((c) => c.name),
      basics: splitBasics(playable, 17),
    }));
}

/** MTG Arena import format */
export function toArenaText(deck: DeckVersion, pool: RawDraftCard[]): string {
  const counts = (names: string[]) => {
    const m = new Map<string, number>();
    for (const n of names) m.set(n, (m.get(n) ?? 0) + 1);
    return [...m].map(([n, k]) => `${k} ${n}`);
  };
  const basics = Object.entries(deck.basics)
    .filter(([, n]) => n)
    .map(([col, n]) => `${n} ${BASIC_NAMES[col as ManaColor]}`);
  return [
    'Deck',
    ...counts(deck.main),
    ...basics,
    '',
    'Sideboard',
    ...counts(sideboardOf(pool, deck.main).map((c) => c.name)),
  ].join('\n');
}
