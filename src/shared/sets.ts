import type { Archetype, ArchetypeId } from './types';
import {
  SOS_ARCHETYPES,
  GUILD_ARCHETYPES,
  COLOR_TO_ARCHETYPE,
  DATA_START_DATE,
  DATA_END_DATE,
} from './constants';

/**
 * Per-set configuration. The signal engine and map builder are pure
 * functions parameterized by this — a draft from any registered set gets
 * the full signal layer; anything else falls back to annotator-only mode.
 */
export interface SetConfig {
  /** 17Lands expansion code, e.g. 'SOS', 'MSH' */
  code: string;
  /** Display name */
  name: string;
  /** Tracked archetypes, in display order */
  archetypes: Archetype[];
  /** Both orderings of each 2-color pair -> archetype id */
  colorToArchetype: Record<string, ArchetypeId>;
  /** Canonical 17Lands 2-color keys (WUBRG order) present in archetypeStats */
  twoColorKeys: string[];
  /** Multicolor-soup archetype (SOS converge), or null if the set has none */
  multicolorArchetype: ArchetypeId | null;
  /**
   * 17Lands event type with real volume for this set right now — flashback
   * sets often live in QuickDraft, not PremierDraft.
   */
  eventType: string;
  /** 17Lands data window used when building this set's cache */
  dataStartDate: string;
  dataEndDate: string;
}

/** Canonical 17Lands ordering for all 10 two-color keys */
export const ALL_TWO_COLOR_KEYS = [
  'WU', 'WB', 'WR', 'WG', 'UB', 'UR', 'UG', 'BR', 'BG', 'RG',
] as const;

const GUILD_BY_PAIR: Record<string, ArchetypeId> = {
  WU: 'azorius',
  WB: 'orzhov',
  WR: 'boros',
  WG: 'selesnya',
  UB: 'dimir',
  UR: 'izzet',
  UG: 'simic',
  BR: 'rakdos',
  BG: 'golgari',
  RG: 'gruul',
};

/** A generic set: 10 guild archetypes, no multicolor archetype, no curation. */
function genericSetConfig(
  code: string,
  name: string,
  eventType: string,
  dataStartDate: string,
  dataEndDate: string
): SetConfig {
  const colorToArchetype: Record<string, ArchetypeId> = {};
  for (const [pair, arch] of Object.entries(GUILD_BY_PAIR)) {
    colorToArchetype[pair] = arch;
    colorToArchetype[pair[1] + pair[0]] = arch;
  }
  return {
    code,
    name,
    archetypes: Object.values(GUILD_ARCHETYPES),
    colorToArchetype,
    twoColorKeys: [...ALL_TWO_COLOR_KEYS],
    multicolorArchetype: null,
    eventType,
    dataStartDate,
    dataEndDate,
  };
}

export const SOS_CONFIG: SetConfig = {
  code: 'SOS',
  name: 'Secrets of Strixhaven',
  archetypes: Object.values(SOS_ARCHETYPES),
  colorToArchetype: COLOR_TO_ARCHETYPE,
  twoColorKeys: ['WB', 'WR', 'UR', 'UG', 'BG'],
  multicolorArchetype: 'converge',
  eventType: 'PremierDraft',
  dataStartDate: DATA_START_DATE,
  dataEndDate: DATA_END_DATE,
};

/**
 * Registry of sets with signal data. Add a set here + run
 * `npm run build-set -- <CODE>` and the app picks it up.
 *
 * Event types / windows verified against live 17Lands volume (Jul 2026):
 * MSH+DSK premier, OTJ flashback quick draft. ECL has a card list on
 * 17Lands but zero logged games yet — rerun build-set once data appears.
 */
export const SET_REGISTRY: Record<string, SetConfig> = {
  SOS: SOS_CONFIG,
  MSH: genericSetConfig('MSH', 'Marvel Super Heroes', 'PremierDraft', '2026-05-01', '2026-07-24'),
  DSK: genericSetConfig('DSK', 'Duskmourn: House of Horror', 'PremierDraft', '2025-09-01', '2026-07-24'),
  OTJ: genericSetConfig('OTJ', 'Outlaws of Thunder Junction', 'QuickDraft', '2025-09-01', '2026-07-24'),
  ECL: genericSetConfig('ECL', 'Lorwyn Eclipsed', 'PremierDraft', '2026-01-01', '2026-07-24'),
};

export function getSetConfig(code: string | null | undefined): SetConfig | null {
  if (!code) return null;
  return SET_REGISTRY[code.toUpperCase()] ?? null;
}

export function isSetSupported(code: string | null | undefined): boolean {
  return getSetConfig(code) !== null;
}

export function signalMapUrl(code: string): string {
  return `/data/${code.toLowerCase()}_signal_map.json`;
}
