import type { Card } from '../../shared/types';
import type { PickSignal } from '../../signals/types';
import { CardDisplay } from './CardDisplay';

interface PackDisplayProps {
  cards: Card[];
  pickedCardName: string;
  cardSignals: PickSignal[];
  wheeledCards: string[];
  onCardClick: (cardName: string) => void;
}

export function PackDisplay({
  cards,
  pickedCardName,
  cardSignals,
  wheeledCards,
  onCardClick,
}: PackDisplayProps) {
  const signalsByCard = new Map<string, PickSignal[]>();
  for (const signal of cardSignals) {
    const existing = signalsByCard.get(signal.cardName) || [];
    existing.push(signal);
    signalsByCard.set(signal.cardName, existing);
  }

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(5, 1fr)',
        gap: 4,
        padding: 4,
      }}
    >
      {cards.map((card, i) => (
        <CardDisplay
          key={`${card.name}-${i}`}
          card={card}
          signals={signalsByCard.get(card.name) || []}
          isPicked={card.name === pickedCardName}
          onClick={() => onCardClick(card.name)}
        />
      ))}
    </div>
  );
}
