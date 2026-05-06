import { useMemo } from 'react';
import type { RawDraftPick, RawDraftCard } from '../../data/types';
import type { Timeline } from '../types';
import { computePool } from '../computePool';

export function useTimeline(
  draftLog: RawDraftPick[],
  activeTimeline: Timeline | null,
  upToPick: number,
) {
  const actualPool: RawDraftCard[] = useMemo(
    () => computePool(draftLog, [], upToPick),
    [draftLog, upToPick],
  );

  const alternatePool: RawDraftCard[] = useMemo(
    () => activeTimeline
      ? computePool(draftLog, activeTimeline.divergences, upToPick)
      : actualPool,
    [draftLog, activeTimeline, upToPick, actualPool],
  );

  return { actualPool, alternatePool };
}
