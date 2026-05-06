import type { Archetype, ArchetypeId } from './types';

export const ARCHETYPES: Record<ArchetypeId, Archetype> = {
  silverquill: {
    id: 'silverquill',
    name: 'Silverquill',
    colors: 'WB',
    mechanic: 'Repartee',
    playstyle: 'Aggro-tempo',
    tier: 1,
  },
  lorehold: {
    id: 'lorehold',
    name: 'Lorehold',
    colors: 'WR',
    mechanic: 'Flashback',
    playstyle: 'Aggressive curve-out + value',
    tier: 1,
  },
  prismari: {
    id: 'prismari',
    name: 'Prismari',
    colors: 'UR',
    mechanic: 'Opus',
    playstyle: 'Spells matter, big mana payoffs',
    tier: 2,
  },
  quandrix: {
    id: 'quandrix',
    name: 'Quandrix',
    colors: 'UG',
    mechanic: 'Increment',
    playstyle: 'Ramp, X-costs, go-big',
    tier: 2,
  },
  witherbloom: {
    id: 'witherbloom',
    name: 'Witherbloom',
    colors: 'BG',
    mechanic: 'Infusion',
    playstyle: 'Grindy midrange, Pest tokens',
    tier: 3,
  },
  converge: {
    id: 'converge',
    name: 'Converge',
    colors: 'WUBRG',
    mechanic: 'Converge',
    playstyle: 'Multicolor goodstuff',
    tier: 1,
  },
};

export const COLOR_TO_ARCHETYPE: Record<string, ArchetypeId> = {
  WB: 'silverquill',
  BW: 'silverquill',
  WR: 'lorehold',
  RW: 'lorehold',
  UR: 'prismari',
  RU: 'prismari',
  UG: 'quandrix',
  GU: 'quandrix',
  BG: 'witherbloom',
  GB: 'witherbloom',
};

export const STRONG_GIHWR_DELTA = 0.03;
export const MODERATE_GIHWR_DELTA = 0.01;
export const MIN_SAMPLE_SIZE = 50;
export const CONVERGE_GIHWR_BONUS = 0.03;
export const WHEEL_PICK_THRESHOLD = 9;

export const EXPANSION = 'SOS';
export const EVENT_TYPE = 'PremierDraft';
export const DATA_START_DATE = '2026-04-21';
export const DATA_END_DATE = '2026-04-29';

export const ARCHETYPE_ABBREV: Record<ArchetypeId, string> = {
  silverquill: 'SQ',
  lorehold: 'LH',
  prismari: 'PR',
  quandrix: 'QX',
  witherbloom: 'WB',
  converge: 'CV',
};

export const ARCHETYPE_COLORS: Record<ArchetypeId, string> = {
  silverquill: '#9B8EC1',
  lorehold: '#D4533E',
  prismari: '#4A90D9',
  quandrix: '#3DAA6D',
  witherbloom: '#5C7A3A',
  converge: '#D4A843',
};

export const ARCHETYPE_TIER_WEIGHT: Record<number, number> = {
  1: 1.0,
  2: 0.85,
  3: 0.7,
};

export const TWO_COLOR_KEYS = ['WB', 'WR', 'UR', 'UG', 'BG'] as const;

// --- Phase 1: Signal Velocity ---
export const VELOCITY_WINDOW_SIZE = 5;
export const VELOCITY_RECENCY_MULTIPLIER = 3.0;
export const VELOCITY_LOOKBACK = 4;
export const DUAL_CONFIRM_THRESHOLD = 0.5;

// --- Phase 2: Pool Evaluator ---
export const IDEAL_CURVE: Record<number, number> = {
  1: 1, 2: 4, 3: 5, 4: 4, 5: 3, 6: 2, 7: 1,
};
export const ROLE_TARGETS = { creatures: 15, removal: 4, cardDraw: 3, fixing: 2 };

// SOS-specific card role lists (curated for accuracy without oracle text)
export const KNOWN_REMOVAL: string[] = [
  'Lash of Malice', 'Eliminate', 'Flunk', 'Heated Debate',
  'Bury in Books', 'Reduce to Memory', 'Expel', 'Rise of Extus',
  'Closing Statement', 'Vanishing Verse', 'Rip Apart', 'Fracture',
  'Mage Hunters\' Onslaught', 'Pigment Storm', 'Infuse with Vitality',
  'Introduction to Annihilation', 'Confront the Past',
  'Devastating Mastery', 'Mortality Spear', 'Baleful Mastery',
];
export const KNOWN_CARD_DRAW: string[] = [
  'Introduction to Prophecy', 'Arcane Subtraction', 'Eureka Moment',
  'Creative Outburst', 'Elemental Summoning', 'Environmental Sciences',
  'Expanded Anatomy', 'Teachings of the Archaics', 'Multiple Choice',
  'Sign in Blood', 'Village Rites', 'Plumb the Forbidden',
];

// --- Phase 3: Pick Suggester ---
export const PICK_SCORE_WEIGHTS = {
  alpha: 0.35,
  beta: 0.25,
  gamma: 0.20,
  delta: 0.15,
  epsilon: 0.10,
};

// --- Phase 4: Bayesian Inference ---
export const BAYESIAN_TEMPERATURE = 3.0;
export const PIVOT_THRESHOLD = 0.15;
