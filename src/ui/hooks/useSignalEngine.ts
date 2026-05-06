import { useState, useMemo, useCallback, useEffect } from 'react';
import type { Draft } from '../../shared/types';
import type { SignalMap, DraftAnalysis, PickAnalysis } from '../../signals/types';
import type { VelocityMetrics, PoolState, PickSuggestion, ArchetypePosterior } from '../../model/types';
import { analyzeDraft } from '../../signals/signal-engine';
import { computeVelocityMetrics } from '../../model/signal-velocity';
import { buildPoolState } from '../../model/pool-evaluator';
import { suggestPicks } from '../../model/pick-suggester';
import { computePosterior } from '../../model/archetype-inference';

export function useSignalEngine(
  draft: Draft | null,
  signalMap: SignalMap | null
): {
  analysis: DraftAnalysis | null;
  currentPickIndex: number;
  currentPickAnalysis: PickAnalysis | null;
  velocityMetrics: VelocityMetrics | null;
  poolState: PoolState | null;
  suggestions: PickSuggestion[] | null;
  posterior: ArchetypePosterior | null;
  goToNext: () => void;
  goToPrev: () => void;
  goToPick: (index: number) => void;
} {
  const [currentPickIndex, setCurrentPickIndex] = useState(0);

  const analysis = useMemo(() => {
    if (!draft || !signalMap) return null;
    return analyzeDraft(draft, signalMap);
  }, [draft, signalMap]);

  const totalPicks = analysis?.picks.length ?? 0;

  const currentPickAnalysis = analysis?.picks[currentPickIndex] ?? null;

  const velocityMetrics = useMemo(() => {
    if (!analysis) return null;
    return computeVelocityMetrics(analysis.picks, currentPickIndex);
  }, [analysis, currentPickIndex]);

  const poolState = useMemo(() => {
    if (!draft || !signalMap) return null;
    return buildPoolState(draft.picks, currentPickIndex, signalMap);
  }, [draft, signalMap, currentPickIndex]);

  const posterior = useMemo(() => {
    if (!draft || !signalMap || !analysis) return null;
    return computePosterior(draft.picks, analysis.picks, signalMap, currentPickIndex);
  }, [draft, signalMap, analysis, currentPickIndex]);

  const suggestions = useMemo(() => {
    if (!draft || !signalMap || !velocityMetrics || !poolState) return null;
    const pick = draft.picks[currentPickIndex];
    if (!pick) return null;
    return suggestPicks(
      pick.availableCards,
      poolState,
      velocityMetrics,
      signalMap,
      pick.packNumber,
      pick.pickNumber,
      posterior,
    );
  }, [draft, signalMap, velocityMetrics, poolState, posterior, currentPickIndex]);

  const goToNext = useCallback(() => {
    setCurrentPickIndex((i) => Math.min(i + 1, totalPicks - 1));
  }, [totalPicks]);

  const goToPrev = useCallback(() => {
    setCurrentPickIndex((i) => Math.max(i - 1, 0));
  }, []);

  const goToPick = useCallback(
    (index: number) => {
      setCurrentPickIndex(Math.max(0, Math.min(index, totalPicks - 1)));
    },
    [totalPicks]
  );

  useEffect(() => {
    setCurrentPickIndex(0);
  }, [draft]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') goToNext();
      if (e.key === 'ArrowLeft') goToPrev();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [goToNext, goToPrev]);

  return {
    analysis,
    currentPickIndex,
    currentPickAnalysis,
    velocityMetrics,
    poolState,
    suggestions,
    posterior,
    goToNext,
    goToPrev,
    goToPick,
  };
}
