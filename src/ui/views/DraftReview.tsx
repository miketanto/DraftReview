import { useState } from 'react';
import type { Draft } from '../../shared/types';
import type { SignalMap, PickAnalysis } from '../../signals/types';
import type { VelocityMetrics, PoolState, PickSuggestion, ArchetypePosterior } from '../../model/types';
import { PickNavigator } from '../components/PickNavigator';
import { PackDisplay } from '../components/PackDisplay';
import { ArchetypeTracker } from '../components/ArchetypeTracker';
import { PickSignalChart } from '../components/PickSignalChart';
import { TopWinrateCards } from '../components/TopWinrateCards';
import { CardDetailPopover } from '../components/CardDetailPopover';
import { SignalVelocity } from '../components/SignalVelocity';
import { PoolStatePanel } from '../components/PoolStatePanel';
import { PickSuggestionPanel } from '../components/PickSuggestionPanel';

interface DraftReviewProps {
  draft: Draft;
  signalMap: SignalMap;
  analysis: PickAnalysis | null;
  currentPickIndex: number;
  totalPicks: number;
  onPrev: () => void;
  onNext: () => void;
  velocityMetrics: VelocityMetrics | null;
  poolState: PoolState | null;
  suggestions: PickSuggestion[] | null;
  posterior: ArchetypePosterior | null;
}

export function DraftReview({
  draft,
  signalMap,
  analysis,
  currentPickIndex,
  totalPicks,
  onPrev,
  onNext,
  velocityMetrics,
  poolState,
  suggestions,
  posterior,
}: DraftReviewProps) {
  const [selectedCard, setSelectedCard] = useState<string | null>(null);

  if (!analysis) return null;

  const pick = draft.picks[currentPickIndex];
  if (!pick) return null;

  const selectedCardObj = selectedCard
    ? pick.availableCards.find((c) => c.name === selectedCard) ?? null
    : null;

  const selectedEntry = selectedCard ? signalMap[selectedCard] ?? null : null;
  const selectedSignals = selectedCard
    ? analysis.cardSignals.filter((s) => s.cardName === selectedCard)
    : [];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 90px)' }}>
      <PickNavigator
        packNumber={analysis.packNumber}
        pickNumber={analysis.pickNumber}
        currentIndex={currentPickIndex}
        totalPicks={totalPicks}
        onPrev={onPrev}
        onNext={onNext}
      />

      {/* Top row: cards | suggested picks | archetype+inference */}
      <div style={{ display: 'flex', gap: 8, flex: 1, minHeight: 0, overflow: 'hidden' }}>
        {/* Cards in 5-column grid */}
        <div style={{ flex: 1, minWidth: 0, overflow: 'auto' }}>
          <PackDisplay
            cards={pick.availableCards}
            pickedCardName={pick.pickedCard.name}
            cardSignals={analysis.cardSignals}
            wheeledCards={analysis.wheelDetections}
            onCardClick={setSelectedCard}
          />
        </div>

        {/* Suggested picks column */}
        <div style={{ width: 240, flexShrink: 0, overflow: 'auto' }}>
          {suggestions && (
            <PickSuggestionPanel
              suggestions={suggestions}
              pickedCardName={pick.pickedCard.name}
            />
          )}
        </div>

        {/* Archetype openness + inference column */}
        <div style={{ width: 220, flexShrink: 0, overflow: 'auto', display: 'flex', flexDirection: 'column', gap: 6 }}>
          <ArchetypeTracker
            scores={analysis.archetypeScores}
            convergeViability={analysis.convergeViability}
            posterior={posterior}
          />
        </div>
      </div>

      {/* Bottom strip: 4 panels */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr 1fr 1fr',
          gap: 8,
          marginTop: 8,
          flexShrink: 0,
        }}
      >
        {velocityMetrics && <SignalVelocity metrics={velocityMetrics} />}
        <PickSignalChart cardSignals={analysis.cardSignals} />
        {poolState ? <PoolStatePanel pool={poolState} /> : <div />}
        <TopWinrateCards
          availableCards={pick.availableCards}
          pickedCardName={pick.pickedCard.name}
          signalMap={signalMap}
        />
      </div>

      {selectedCardObj && (
        <CardDetailPopover
          card={selectedCardObj}
          signalEntry={selectedEntry}
          pickSignals={selectedSignals}
          onClose={() => setSelectedCard(null)}
        />
      )}
    </div>
  );
}
