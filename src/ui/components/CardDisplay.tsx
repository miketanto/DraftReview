import type { Card } from '../../shared/types';
import type { PickSignal } from '../../signals/types';
import { SignalBadge } from './SignalBadge';

interface CardDisplayProps {
  card: Card;
  signals: PickSignal[];
  isPicked: boolean;
  onClick?: () => void;
}

export function CardDisplay({ card, signals, isPicked, onClick }: CardDisplayProps) {
  return (
    <div
      onClick={onClick}
      style={{
        position: 'relative',
        width: '100%',
        cursor: onClick ? 'pointer' : 'default',
        border: isPicked ? '3px solid #4CAF50' : '1px solid #333',
        borderRadius: 6,
        overflow: 'hidden',
        backgroundColor: '#1a1a1a',
      }}
    >
      <img
        src={card.imageUrl}
        alt={card.name}
        style={{ width: '100%', display: 'block' }}
        loading="lazy"
      />
      {signals.length > 0 && (
        <div
          style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            padding: '2px 3px',
            backgroundColor: 'rgba(0,0,0,0.8)',
            display: 'flex',
            flexWrap: 'wrap',
            gap: 1,
          }}
        >
          {signals.map((s) => (
            <SignalBadge
              key={s.archetype}
              archetype={s.archetype}
              tier={s.tier}
              isWheel={s.isWheel}
            />
          ))}
        </div>
      )}
    </div>
  );
}
