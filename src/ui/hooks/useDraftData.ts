import { useState, useCallback } from 'react';
import type { Draft } from '../../shared/types';
import type { SignalMap } from '../../signals/types';
import { extractDraftId, fetchDraftLog } from '../../data/fetcher';
import { rawPicksToDraft } from '../../shared/adapters';

export function useDraftData(): {
  draft: Draft | null;
  expansion: string | null;
  loading: boolean;
  error: string | null;
  loadDraft: (url: string, signalMap: SignalMap | null) => Promise<void>;
} {
  const [draft, setDraft] = useState<Draft | null>(null);
  const [expansion, setExpansion] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadDraft = useCallback(
    async (url: string, _signalMap: SignalMap | null) => {
      const draftId = extractDraftId(url);
      if (!draftId) {
        setError('Invalid 17Lands draft URL');
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const log = await fetchDraftLog(draftId);
        setDraft(rawPicksToDraft(draftId, log.picks));
        setExpansion(log.expansion);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load draft');
      } finally {
        setLoading(false);
      }
    },
    []
  );

  return { draft, expansion, loading, error, loadDraft };
}
