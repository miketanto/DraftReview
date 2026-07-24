import type { SetConfig } from '../../shared/sets';
import { ARCHETYPE_ABBREV, ARCHETYPE_COLORS } from '../../shared/constants';
import { T, label } from '../../shared/theme';

interface GlossaryPopoverProps {
  config: SetConfig | null;
  onClose: () => void;
}

const STATS: [string, string][] = [
  ['ALSA', 'Average Last Seen At — how late this card is usually still in the pack. A low-ALSA card seen late is a signal.'],
  ['ATA', 'Average Taken At — the pick number where drafters usually take it.'],
  ['GIHWR', 'Game-In-Hand Win Rate — win % of games where the card was drawn. The core card-quality stat.'],
];

const TIERS: [string, string, string][] = [
  ['●●●', 'Staple — top of the format, gold ring', T.gold],
  ['●●', 'Strong', T.ink0],
  ['●', 'Moderate', T.ink1],
  ['◆', 'Fixing — lands / mana fixing', T.ink1],
  ['⟳', 'Likely to wheel back to you', T.ink1],
];

/** Plain-English glossary generated from the active set's config. */
export function GlossaryPopover({ config, onClose }: GlossaryPopoverProps) {
  return (
    <>
      <div
        onClick={onClose}
        style={{ position: 'fixed', inset: 0, zIndex: 900 }}
      />
      <div
        className="glass"
        style={{
          position: 'fixed',
          top: 44,
          right: 16,
          zIndex: 950,
          width: 340,
          maxHeight: 'calc(100vh - 60px)',
          overflow: 'auto',
          border: `1px solid ${T.line1}`,
          borderRadius: T.radius.l,
          padding: '12px 14px',
          fontFamily: T.mono,
          fontSize: T.fs.t2,
          color: T.ink1,
          boxShadow: '0 12px 32px rgba(0,0,0,0.6)',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
          <span style={{ ...label, color: T.ink0 }}>Glossary</span>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              color: T.ink2,
              cursor: 'pointer',
              fontFamily: T.mono,
              fontSize: T.fs.t3,
            }}
          >
            ✕
          </button>
        </div>

        <div style={{ ...label, marginBottom: 6 }}>Stats</div>
        {STATS.map(([term, def]) => (
          <div key={term} style={{ marginBottom: 6, lineHeight: 1.45 }}>
            <span style={{ color: T.ink0, fontWeight: 700 }}>{term}</span>{' '}
            <span style={{ color: T.ink1 }}>{def}</span>
          </div>
        ))}

        <div style={{ ...label, margin: '10px 0 6px' }}>Signal tiers</div>
        {TIERS.map(([glyph, def, color]) => (
          <div key={glyph} style={{ marginBottom: 4, display: 'flex', gap: 8 }}>
            <span style={{ color, width: 26, flexShrink: 0 }}>{glyph}</span>
            <span>{def}</span>
          </div>
        ))}

        {config && (
          <>
            <div style={{ ...label, margin: '10px 0 6px' }}>
              {config.name} archetypes
            </div>
            {config.archetypes.map((a) => (
              <div
                key={a.id}
                style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 3 }}
              >
                <span
                  style={{
                    width: 26,
                    flexShrink: 0,
                    color: ARCHETYPE_COLORS[a.id] ?? T.ink1,
                    fontWeight: 700,
                    fontSize: T.fs.t1,
                  }}
                >
                  {ARCHETYPE_ABBREV[a.id] ?? a.id.slice(0, 2).toUpperCase()}
                </span>
                <span style={{ display: 'flex', gap: 2, width: 24, flexShrink: 0 }}>
                  {a.colors.split('').map(
                    (c, i) =>
                      T.mana[c] && (
                        <span
                          key={i}
                          style={{
                            width: 8,
                            height: 8,
                            borderRadius: '50%',
                            backgroundColor: T.mana[c],
                          }}
                        />
                      )
                  )}
                </span>
                <span style={{ color: T.ink1 }}>
                  {a.name}
                  {a.mechanic !== '—' && (
                    <span style={{ color: T.ink2 }}> · {a.mechanic}</span>
                  )}
                </span>
              </div>
            ))}
          </>
        )}
        {!config && (
          <div style={{ color: T.ink2, marginTop: 10, lineHeight: 1.45 }}>
            This set has no signal data yet — the review works as a plain
            annotator. Stats light up automatically for supported sets.
          </div>
        )}
      </div>
    </>
  );
}
