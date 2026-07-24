import type { RawDraftPick } from '../data/types';
import type { DraftReview, PickAnnotation, Timeline, DraftSummary } from './types';

const BASE = import.meta.env.PROD ? '' : 'http://localhost:3001';

export async function createReview(
  draftId: string,
  draftLog: RawDraftPick[],
  expansion: string | null,
): Promise<{ id: string; editToken: string }> {
  const res = await fetch(`${BASE}/reviews`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ draftId, draftLog, expansion }),
  });
  if (!res.ok) throw new Error(`Create review failed: ${res.status}`);
  return res.json();
}

export async function fetchReview(id: string): Promise<DraftReview> {
  const res = await fetch(`${BASE}/reviews/${encodeURIComponent(id)}`);
  if (!res.ok) throw new Error(`Fetch review failed: ${res.status}`);
  return res.json();
}

export async function updateReview(
  id: string,
  editToken: string,
  annotations: PickAnnotation[],
  timelines: Timeline[],
  summary?: DraftSummary,
): Promise<{ ok: boolean; updatedAt: string }> {
  const res = await fetch(`${BASE}/reviews/${encodeURIComponent(id)}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${editToken}`,
    },
    body: JSON.stringify({ annotations, timelines, summary }),
  });
  if (!res.ok) throw new Error(`Update review failed: ${res.status}`);
  return res.json();
}
