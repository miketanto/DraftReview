import type { RawDraftPick, RawDraftCard } from '../data/types';
import type { Divergence } from './types';

export function computePool(
  draftLog: RawDraftPick[],
  divergences: Divergence[],
  upToPick?: number,
): RawDraftCard[] {
  const pool: RawDraftCard[] = [];
  const limit = upToPick ?? draftLog.length;

  for (let i = 0; i < limit && i < draftLog.length; i++) {
    const pick = draftLog[i];
    const divergence = divergences.find(
      (d) => d.packNumber === pick.pack_number && d.pickNumber === pick.pick_number,
    );

    if (divergence) {
      const altCard = pick.available.find((c) => c.name === divergence.altPick);
      if (altCard) {
        pool.push(altCard);
      } else {
        console.warn(
          `Divergence card "${divergence.altPick}" not found in pack ${pick.pack_number + 1} pick ${pick.pick_number + 1}, using actual pick`,
        );
        pool.push(pick.pick);
      }
    } else {
      pool.push(pick.pick);
    }
  }

  return pool;
}
