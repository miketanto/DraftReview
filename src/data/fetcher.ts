import type {
  RawDraftPick,
  RawCardRating,
  RawCardPerformance,
} from './types';

const PROXY_BASE = import.meta.env.PROD ? '/api' : 'http://localhost:3001/api';

export function extractDraftId(url: string): string | null {
  const match = url.match(/17lands\.com\/draft\/([a-f0-9]+)/);
  return match ? match[1] : null;
}

export interface DraftLogResult {
  /** 17Lands expansion code (e.g. 'SOS', 'MSH'), null for legacy payloads */
  expansion: string | null;
  picks: RawDraftPick[];
}

export async function fetchDraftLog(draftId: string): Promise<DraftLogResult> {
  const res = await fetch(
    `${PROXY_BASE}/data/draft?draft_id=${encodeURIComponent(draftId)}`
  );
  if (!res.ok) throw new Error(`Draft fetch failed: ${res.status}`);
  const data = await res.json();
  return {
    expansion: typeof data.expansion === 'string' ? data.expansion : null,
    picks: data.picks ?? data,
  };
}

export async function fetchCardRatings(
  expansion: string,
  eventType: string,
  startDate: string,
  endDate: string
): Promise<RawCardRating[]> {
  const params = new URLSearchParams({
    expansion,
    event_type: eventType,
    start_date: startDate,
    end_date: endDate,
  });
  const res = await fetch(`${PROXY_BASE}/card_ratings/data?${params}`);
  if (!res.ok) throw new Error(`Card ratings fetch failed: ${res.status}`);
  return res.json();
}

export async function fetchCardPerformance(
  mtgaId: number,
  expansion: string,
  eventType: string,
  startDate: string,
  endDate: string
): Promise<RawCardPerformance> {
  const params = new URLSearchParams({
    expansion,
    event_type: eventType,
    start_date: startDate,
    end_date: endDate,
    card_id: String(mtgaId),
  });
  const res = await fetch(
    `${PROXY_BASE}/data/card_based_performance?${params}`
  );
  if (!res.ok)
    throw new Error(`Card performance fetch failed: ${res.status}`);
  return res.json();
}

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
