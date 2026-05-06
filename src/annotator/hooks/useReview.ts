import { useState, useEffect, useRef, useCallback } from 'react';
import type { DraftReview, PickAnnotation, Timeline, DraftSummary } from '../types';
import { fetchReview, updateReview } from '../api';

export type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';

export function useReview(reviewId: string) {
  const [review, setReview] = useState<DraftReview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle');

  const editToken = typeof window !== 'undefined'
    ? localStorage.getItem(`review:${reviewId}`)
    : null;
  const isEditable = !!editToken;

  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const latestState = useRef<{ annotations: PickAnnotation[]; timelines: Timeline[]; summary: DraftSummary } | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    fetchReview(reviewId)
      .then((data) => {
        if (!cancelled) {
          setReview(data);
          latestState.current = { annotations: data.annotations, timelines: data.timelines, summary: data.summary };
        }
      })
      .catch((err) => {
        if (!cancelled) setError(err.message);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => { cancelled = true; };
  }, [reviewId]);

  const scheduleSave = useCallback(() => {
    if (!editToken || !latestState.current) return;

    if (debounceTimer.current) clearTimeout(debounceTimer.current);

    debounceTimer.current = setTimeout(() => {
      const { annotations, timelines, summary } = latestState.current!;
      setSaveStatus('saving');
      updateReview(reviewId, editToken, annotations, timelines, summary)
        .then(() => setSaveStatus('saved'))
        .catch(() => setSaveStatus('error'));
    }, 2000);
  }, [reviewId, editToken]);

  const setAnnotations = useCallback((annotations: PickAnnotation[]) => {
    setReview((prev) => prev ? { ...prev, annotations } : prev);
    if (latestState.current) latestState.current.annotations = annotations;
    scheduleSave();
  }, [scheduleSave]);

  const setTimelines = useCallback((timelines: Timeline[]) => {
    setReview((prev) => prev ? { ...prev, timelines } : prev);
    if (latestState.current) latestState.current.timelines = timelines;
    scheduleSave();
  }, [scheduleSave]);

  const setSummary = useCallback((summary: DraftSummary) => {
    setReview((prev) => prev ? { ...prev, summary } : prev);
    if (latestState.current) latestState.current.summary = summary;
    scheduleSave();
  }, [scheduleSave]);

  const updatePickNote = useCallback((packNumber: number, pickNumber: number, note: string) => {
    setAnnotations(upsertAnnotation(
      latestState.current?.annotations ?? [],
      packNumber,
      pickNumber,
      (a) => ({ ...a, note }),
    ));
  }, [setAnnotations]);

  const updateCardNote = useCallback((packNumber: number, pickNumber: number, cardName: string, note: string) => {
    setAnnotations(upsertAnnotation(
      latestState.current?.annotations ?? [],
      packNumber,
      pickNumber,
      (a) => ({ ...a, cardNotes: { ...a.cardNotes, [cardName]: note } }),
    ));
  }, [setAnnotations]);

  const updateCardRank = useCallback((packNumber: number, pickNumber: number, cardName: string, rank: number | null) => {
    setAnnotations(upsertAnnotation(
      latestState.current?.annotations ?? [],
      packNumber,
      pickNumber,
      (a) => {
        const cardRanks = { ...a.cardRanks };
        if (rank === null) {
          delete cardRanks[cardName];
        } else {
          cardRanks[cardName] = rank;
        }
        return { ...a, cardRanks };
      },
    ));
  }, [setAnnotations]);

  useEffect(() => {
    return () => {
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
    };
  }, []);

  return {
    review,
    loading,
    error,
    isEditable,
    saveStatus,
    setAnnotations,
    setTimelines,
    setSummary,
    updatePickNote,
    updateCardNote,
    updateCardRank,
  };
}

function upsertAnnotation(
  annotations: PickAnnotation[],
  packNumber: number,
  pickNumber: number,
  updater: (a: PickAnnotation) => PickAnnotation,
): PickAnnotation[] {
  const idx = annotations.findIndex(
    (a) => a.packNumber === packNumber && a.pickNumber === pickNumber,
  );
  if (idx >= 0) {
    const copy = [...annotations];
    copy[idx] = updater(copy[idx]);
    return copy;
  }
  const blank: PickAnnotation = { packNumber, pickNumber, note: '', cardNotes: {}, cardRanks: {} };
  return [...annotations, updater(blank)];
}
