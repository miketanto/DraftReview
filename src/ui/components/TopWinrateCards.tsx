import type { Card } from '../../shared/types';
import type { SignalMap } from '../../signals/types';
import { ARCHETYPE_ABBREV, ARCHETYPE_COLORS } from '../../shared/constants';

interface TopWinrateCardsProps {
  availableCards: Card[];
  pickedCardName: string;
  signalMap: SignalMap;
}

export function TopWinrateCards({
  availableCards,
  pickedCardName,
  signalMap,
}: TopWinrateCardsProps) {
  const ranked = availableCards
    .map((card) => {
      const entry = signalMap[card.name];
      return {
        name: card.name,
        gihwr: entry?.overallGihwr ?? 0,
        alsa: entry?.alsa ?? 0,
        primaryArchetype: entry?.primaryArchetype ?? null,
        isPicked: card.name === pickedCardName,
      };
    })
    .filter((c) => c.gihwr > 0)
    .sort((a, b) => b.gihwr - a.gihwr)
    .slice(0, 3);

  if (ranked.length === 0) return null;

  return (
    <div
      style={{
        padding: '8px 12px',
        backgroundColor: '#111',
        borderRadius: 6,
        fontFamily: 'monospace',
        fontSize: 12,
        minWidth: 0,
      }}
    >
      <div style={{ color: '#888', marginBottom: 6, fontWeight: 700 }}>
        BEST AVAILABLE — WIN RATE
      </div>
      {ranked.map((card, i) => {
        const archColor = card.primaryArchetype
          ? ARCHETYPE_COLORS[card.primaryArchetype]
          : '#888';
        const archAbbrev = card.primaryArchetype
          ? ARCHETYPE_ABBREV[card.primaryArchetype]
          : '—';

        return (
          <div
            key={card.name}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              marginBottom: 4,
              padding: '3px 4px',
              borderRadius: 3,
              backgroundColor: card.isPicked ? 'rgba(76,175,80,0.15)' : 'transparent',
              border: card.isPicked ? '1px solid rgba(76,175,80,0.4)' : '1px solid transparent',
            }}
          >
            <span style={{ color: '#555', fontWeight: 700, width: 14 }}>
              {i + 1}
            </span>
            <span
              style={{
                flex: 1,
                color: card.isPicked ? '#4CAF50' : '#ccc',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                fontWeight: card.isPicked ? 700 : 400,
              }}
            >
              {card.name}
              {card.isPicked && (
                <span style={{ fontSize: 9, marginLeft: 4, opacity: 0.7 }}>
                  PICKED
                </span>
              )}
            </span>
            <span style={{ color: archColor, fontWeight: 700, fontSize: 10 }}>
              {archAbbrev}
            </span>
            <span style={{ color: '#e0e0e0', fontWeight: 700, width: 42, textAlign: 'right' }}>
              {(card.gihwr * 100).toFixed(1)}%
            </span>
          </div>
        );
      })}
    </div>
  );
}
