import { useState, useCallback } from 'react';
import type { Draft } from '../../shared/types';
import type { RawDraftPick } from '../../data/types';
import type { SignalMap } from '../../signals/types';
import { extractDraftId, fetchDraftLog } from '../../data/fetcher';

function convertRawPick(raw: RawDraftPick, signalMap: SignalMap | null) {
  const mapCard = (c: { image_url: string; url_back: string; name: string; types: string[]; mana_cost: string; layout: string; color?: string[] }) => {
    const entry = signalMap?.[c.name];
    return {
      name: c.name,
      imageUrl: c.image_url,
      urlBack: c.url_back,
      manaCost: c.mana_cost,
      types: c.types,
      color: c.color || [],
      rarity: '',
      layout: c.layout,
      mtgaId: entry ? undefined : undefined,
    };
  };

  return {
    packNumber: raw.pack_number + 1,
    pickNumber: raw.pick_number + 1,
    pickedCard: mapCard(raw.pick),
    availableCards: raw.available.map(mapCard),
    knownMissing: raw.known_missing.map(mapCard),
  };
}

export function useDraftData(): {
  draft: Draft | null;
  loading: boolean;
  error: string | null;
  loadDraft: (url: string, signalMap: SignalMap | null) => Promise<void>;
} {
  const [draft, setDraft] = useState<Draft | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadDraft = useCallback(
    async (url: string, signalMap: SignalMap | null) => {
      const draftId = extractDraftId(url);
      if (!draftId) {
        setError('Invalid 17Lands draft URL');
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const rawPicks = await fetchDraftLog(draftId);
        const picks = rawPicks.map((rp) => convertRawPick(rp, signalMap));
        setDraft({ draftId, picks });
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load draft');
      } finally {
        setLoading(false);
      }
    },
    []
  );

  return { draft, loading, error, loadDraft };
}
