/**
 * Phosphor Telemetry design tokens. Inline styles consume this object;
 * src/index.css carries the few global rules (focus ring, keyframes,
 * glass, reduced-motion).
 */
export const T = {
  // Surfaces
  bg0: '#07090B', // page
  bg1: '#0D1013', // panels
  bg2: '#14181C', // cards / wells
  bg3: '#1C2126', // inputs / hover fills
  glass: 'rgba(13,16,19,0.85)',

  // Borders
  line0: '#21262C', // hairline dividers
  line1: '#2E353D', // interactive rest
  line2: '#414A54', // hover / active

  // Ink
  ink0: '#E9EDF1', // primary
  ink1: '#A9B2BC', // secondary
  ink2: '#6C7682', // labels, ghost buttons
  ink3: '#444D57', // disabled

  // Semantic
  picked: '#3FB950',
  pickedGlow: '0 0 0 1px #3FB950, 0 0 14px rgba(63,185,80,0.35)',
  amber: '#E0A33B', // timeline / ALT — the only amber
  amberGlow: '0 0 0 1px #E0A33B, 0 0 10px rgba(224,163,59,0.30)',
  sel: '#4D9FFF', // selection / focus
  selGlow: '0 0 0 1px #4D9FFF, 0 0 10px rgba(77,159,255,0.30)',
  danger: '#F0524A',
  gold: '#FFD700', // STAPLE only — nothing else is gold
  goldGlow: '0 0 0 1px #FFD700, 0 0 14px rgba(255,215,0,0.35)',

  // Mana pips
  mana: {
    W: '#F8F0C8',
    U: '#A8D0F0',
    B: '#B8AEB0',
    R: '#F0A088',
    G: '#9CCFA8',
  } as Record<string, string>,

  // Type scale (all-mono; hierarchy via size + weight, not family)
  fs: { t1: 10, t2: 11, t3: 12, t4: 13, t5: 16 },

  // Spacing / radii / motion
  radius: { s: 2, m: 4, l: 6 },
  ease: 'cubic-bezier(0.2, 0, 0, 1)',
  fast: '120ms',

  mono: "'SF Mono', 'Cascadia Code', 'Fira Code', monospace",
} as const;

/** Uppercase micro-label style used across panel headers and chips */
export const label = {
  fontSize: T.fs.t1,
  fontWeight: 600,
  letterSpacing: '0.08em',
  textTransform: 'uppercase' as const,
  color: T.ink2,
};
