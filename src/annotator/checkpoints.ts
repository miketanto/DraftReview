import type { RawDraftPick } from '../data/types';
import { cardColors, isLand, type ManaColor } from './deck';

export interface PackInsight {
  packNumber: number;
  /** Colored picks so far (through this pack), most-picked first */
  colorCounts: [ManaColor, number][];
}

export function packInsights(draftLog: RawDraftPick[]): PackInsight[] {
  const packs = [...new Set(draftLog.map((p) => p.pack_number))].sort();
  return packs.map((pack) => {
    const counts: Partial<Record<ManaColor, number>> = {};
    for (const p of draftLog) {
      if (p.pack_number > pack || isLand(p.pick)) continue;
      for (const c of cardColors(p.pick)) counts[c] = (counts[c] ?? 0) + 1;
    }
    const colorCounts = (Object.entries(counts) as [ManaColor, number][]).sort((a, b) => b[1] - a[1]);
    return { packNumber: pack, colorCounts };
  });
}
