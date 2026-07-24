import type { RawDraftCard } from '../../data/types';
import type { CardSignalEntry, PickSignal } from '../../signals/types';
import type { SetConfig } from '../../shared/sets';
import { ARCHETYPE_ABBREV, ARCHETYPE_COLORS } from '../../shared/constants';

const WIDTH = 300;
const MARGIN = 8;

// GIHWR bars share the app's 45–65% scaling window
const BAR_MIN = 0.45;
const BAR_MAX = 0.65;

const TIER_STYLE: Record<string, { label: string; color: string }> = {
  staple: { label: 'STAPLE', color: '#FFD700' },
  strong: { label: 'STRONG', color: '#4CAF50' },
  moderate: { label: 'MODERATE', color: '#aaa' },
  weak: { label: 'WEAK', color: '#555' },
  fixing: { label: 'FIXING', color: '#D4A843' },
};

interface CardHoverCardProps {
  card: RawDraftCard;
  /** Bounding rect of the hovered card tile (viewport coordinates) */
  anchorRect: DOMRect;
  signalEntry: CardSignalEntry | null;
  pickSignal: PickSignal | null;
  isWheel: boolean;
  config: SetConfig;
  /** 0-based, straight from the raw draft log */
  packNumber: number;
  pickNumber: number;
}

/**
 * The single hover popover instance for the review workspace. Rendered with
 * pointer-events: none so it can never trap the cursor; position is computed
 * from the hovered tile's rect — right-preferred, flips left, clamps
 * vertically.
 */
export function CardHoverCard({
  card,
  anchorRect,
  signalEntry,
  pickSignal,
  isWheel,
  config,
  packNumber,
  pickNumber,
}: CardHoverCardProps) {
  const vw = window.innerWidth;
  const vh = window.innerHeight;

  let left = anchorRect.right + MARGIN;
  if (left + WIDTH > vw - MARGIN) {
    left = anchorRect.left - WIDTH - MARGIN;
  }
  if (left < MARGIN) left = MARGIN;

  // Rough height estimate for vertical clamping; actual height varies
  const estHeight = signalEntry ? 120 + config.archetypes.length * 15 : 80;
  let top = anchorRect.top;
  if (top + estHeight > vh - MARGIN) top = vh - estHeight - MARGIN;
  if (top < MARGIN) top = MARGIN;

  const tier = signalEntry ? TIER_STYLE[signalEntry.signalTier] : null;

  return (
    <div
      style={{
        position: 'fixed',
        left,
        top,
        width: WIDTH,
        zIndex: 1000,
        pointerEvents: 'none',
        backgroundColor: '#111',
        border: '1px solid #444',
        borderRadius: 4,
        padding: '8px 10px',
        fontFamily: 'monospace',
        fontSize: 11,
        color: '#ccc',
        boxShadow: '0 4px 16px rgba(0,0,0,0.8)',
      }}
    >
      {/* Name + tier chip */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 8,
          marginBottom: 6,
        }}
      >
        <span style={{ color: '#fff', fontWeight: 700, fontSize: 12 }}>
          {card.name}
        </span>
        {tier && (
          <span
            style={{
              padding: '1px 5px',
              borderRadius: 2,
              fontSize: 9,
              fontWeight: 700,
              color: '#000',
              backgroundColor: tier.color,
              flexShrink: 0,
            }}
          >
            {tier.label}
          </span>
        )}
      </div>

      {!signalEntry ? (
        <div style={{ color: '#666', fontSize: 10 }}>
          NO 17LANDS DATA — name not found in the {config.code} signal map
        </div>
      ) : (
        <>
          {/* ALSA · ATA · GIHWR triplet */}
          <div
            style={{
              display: 'flex',
              gap: 14,
              marginBottom: 6,
              paddingBottom: 6,
              borderBottom: '1px solid #2a2a2a',
            }}
          >
            <Stat
              label="ALSA"
              title="Average last seen at"
              value={
                signalEntry.alsa != null && signalEntry.alsa > 0
                  ? signalEntry.alsa.toFixed(1)
                  : '—'
              }
            />
            <Stat
              label="ATA"
              title="Average taken at"
              value={
                signalEntry.ata != null && signalEntry.ata > 0
                  ? signalEntry.ata.toFixed(1)
                  : '—'
              }
            />
            <Stat
              label="GIHWR"
              title="Win rate in games where the card was in hand"
              value={
                signalEntry.overallGihwr > 0
                  ? `${(signalEntry.overallGihwr * 100).toFixed(1)}%`
                  : '—'
              }
            />
          </div>

          {/* Archetype GIHWR bar table — stable row set for card-to-card
              comparison. Hidden entirely when 17Lands has no real
              per-archetype data for this set (e.g. filter ignored). */}
          {Object.keys(signalEntry.archetypeGihwr).length === 0 ? (
            <div
              style={{
                marginBottom: 6,
                fontSize: 9,
                color: '#555',
              }}
            >
              Per-archetype winrates unavailable for {config.code} on 17Lands
            </div>
          ) : (
          <div style={{ marginBottom: 6 }}>
            {config.archetypes.map((arch) => {
              const gihwr = signalEntry.archetypeGihwr[arch.id];
              const isPrimary = signalEntry.primaryArchetype === arch.id;
              const color = ARCHETYPE_COLORS[arch.id] ?? '#888';
              const frac =
                gihwr != null
                  ? Math.max(
                      0,
                      Math.min(1, (gihwr - BAR_MIN) / (BAR_MAX - BAR_MIN))
                    )
                  : 0;
              return (
                <div
                  key={arch.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    height: 15,
                    opacity: gihwr != null ? 1 : 0.35,
                  }}
                >
                  <span
                    style={{
                      width: 22,
                      color,
                      fontWeight: isPrimary ? 700 : 400,
                      fontSize: 9,
                    }}
                  >
                    {ARCHETYPE_ABBREV[arch.id] ?? arch.id.slice(0, 2).toUpperCase()}
                  </span>
                  <div
                    style={{
                      flex: 1,
                      height: 7,
                      backgroundColor: '#222',
                      borderRadius: 1,
                      overflow: 'hidden',
                    }}
                  >
                    {gihwr != null && (
                      <div
                        style={{
                          width: `${frac * 100}%`,
                          height: '100%',
                          backgroundColor: color,
                          opacity: isPrimary ? 0.9 : 0.55,
                        }}
                      />
                    )}
                  </div>
                  <span
                    style={{
                      width: 40,
                      textAlign: 'right',
                      fontSize: 9,
                      color: isPrimary ? '#fff' : '#888',
                      fontWeight: isPrimary ? 700 : 400,
                    }}
                  >
                    {gihwr != null ? `${(gihwr * 100).toFixed(1)}%` : '—'}
                  </span>
                </div>
              );
            })}
          </div>
          )}

          {/* Per-pick signal */}
          <div
            style={{
              paddingTop: 6,
              borderTop: '1px solid #2a2a2a',
              fontSize: 10,
            }}
          >
            <span style={{ color: '#888', fontWeight: 700 }}>
              SIGNAL P{packNumber + 1}P{pickNumber + 1}
            </span>
            {isWheel && (
              <span
                style={{
                  marginLeft: 6,
                  padding: '0 4px',
                  borderRadius: 2,
                  border: '1px solid #D4A843',
                  color: '#D4A843',
                  fontSize: 9,
                  fontWeight: 700,
                }}
              >
                ⟳ WHEEL
              </span>
            )}
            <div style={{ color: '#aaa', marginTop: 2, lineHeight: 1.4 }}>
              {pickSignal
                ? pickSignal.explanation
                : 'No signal at this pick — taken around its usual position'}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function Stat({
  label,
  title,
  value,
}: {
  label: string;
  title: string;
  value: string;
}) {
  return (
    <div title={title}>
      <span style={{ color: '#666', fontSize: 9 }}>{label} </span>
      <span style={{ color: '#fff', fontWeight: 700 }}>{value}</span>
    </div>
  );
}
