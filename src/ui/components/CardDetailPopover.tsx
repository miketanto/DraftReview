import type { Card, ArchetypeId } from '../../shared/types';
import type { CardSignalEntry, PickSignal } from '../../signals/types';
import { ARCHETYPES, ARCHETYPE_COLORS } from '../../shared/constants';

interface CardDetailPopoverProps {
  card: Card;
  signalEntry: CardSignalEntry | null;
  pickSignals: PickSignal[];
  onClose: () => void;
}

const ARCHETYPE_ORDER: ArchetypeId[] = [
  'silverquill', 'lorehold', 'prismari', 'quandrix', 'witherbloom', 'converge',
];

export function CardDetailPopover({
  card,
  signalEntry,
  pickSignals,
  onClose,
}: CardDetailPopoverProps) {
  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0,0,0,0.7)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 100,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          backgroundColor: '#1a1a1a',
          border: '1px solid #333',
          borderRadius: 8,
          padding: 16,
          maxWidth: 500,
          fontFamily: 'monospace',
          fontSize: 12,
          color: '#ccc',
        }}
      >
        <div style={{ display: 'flex', gap: 16, marginBottom: 12 }}>
          <img
            src={card.imageUrl}
            alt={card.name}
            style={{ width: 160, borderRadius: 6 }}
          />
          <div>
            <h3 style={{ color: '#fff', margin: '0 0 8px' }}>{card.name}</h3>
            <div style={{ color: '#888', marginBottom: 4 }}>{card.manaCost}</div>
            <div style={{ color: '#888', marginBottom: 8 }}>
              {card.types.join(' ')}
            </div>

            {signalEntry && (
              <>
                <div style={{ marginBottom: 4 }}>
                  <span style={{ color: '#888' }}>ALSA: </span>
                  <span style={{ color: '#fff' }}>
                    {signalEntry.alsa.toFixed(1)}
                  </span>
                </div>
                <div style={{ marginBottom: 4 }}>
                  <span style={{ color: '#888' }}>Overall GIHWR: </span>
                  <span style={{ color: '#fff' }}>
                    {(signalEntry.overallGihwr * 100).toFixed(1)}%
                  </span>
                </div>
                <div style={{ marginBottom: 4 }}>
                  <span style={{ color: '#888' }}>Tier: </span>
                  <span
                    style={{
                      color:
                        signalEntry.signalTier === 'staple'
                          ? '#FFD700'
                          : signalEntry.signalTier === 'strong'
                            ? '#4CAF50'
                            : '#888',
                      fontWeight: 700,
                    }}
                  >
                    {signalEntry.signalTier.toUpperCase()}
                  </span>
                </div>
                {signalEntry.isConvergeSignal && (
                  <div style={{ color: '#D4A843', fontWeight: 700 }}>
                    CONVERGE SIGNAL
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {signalEntry && (
          <div>
            <div
              style={{
                color: '#888',
                fontWeight: 700,
                marginBottom: 4,
                borderBottom: '1px solid #333',
                paddingBottom: 4,
              }}
            >
              GIHWR by Archetype
            </div>
            {ARCHETYPE_ORDER.map((id) => {
              const gihwr = signalEntry.archetypeGihwr[id];
              if (gihwr === undefined) return null;
              const isPrimary = signalEntry.primaryArchetype === id;

              return (
                <div
                  key={id}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    padding: '2px 0',
                    color: isPrimary ? '#fff' : '#888',
                    fontWeight: isPrimary ? 700 : 400,
                  }}
                >
                  <span style={{ color: ARCHETYPE_COLORS[id] }}>
                    {ARCHETYPES[id].name}
                  </span>
                  <span>{(gihwr * 100).toFixed(1)}%</span>
                </div>
              );
            })}
          </div>
        )}

        {pickSignals.length > 0 && (
          <div style={{ marginTop: 12, color: '#aaa' }}>
            <div style={{ color: '#888', fontWeight: 700, marginBottom: 4 }}>
              Signal at this pick
            </div>
            {pickSignals.map((s, i) => (
              <div key={i} style={{ marginBottom: 2 }}>
                {s.explanation}
              </div>
            ))}
          </div>
        )}

        <button
          onClick={onClose}
          style={{
            marginTop: 12,
            padding: '4px 16px',
            backgroundColor: '#333',
            color: '#fff',
            border: 'none',
            borderRadius: 4,
            cursor: 'pointer',
            fontFamily: 'monospace',
          }}
        >
          Close
        </button>
      </div>
    </div>
  );
}
