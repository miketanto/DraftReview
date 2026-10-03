import type { DraftReview, PickAnnotation } from './types';

/**
 * Plain-text, Discord-pasteable walkthrough: one line per annotated pick
 * (note, card notes, ranks, timeline alt picks), end-of-pack checkpoints,
 * then the closing summary.
 */
export function formatReviewText(
  review: DraftReview,
  annotations: PickAnnotation[]
): { text: string; pickCount: number } {
  const key = (pack: number, pick: number) => `${pack}-${pick}`;
  const byPick = new Map(annotations.map((a) => [key(a.packNumber, a.pickNumber), a]));
  const multiTimeline = review.timelines.length > 1;
  const alts = new Map<string, string[]>();
  for (const t of review.timelines) {
    for (const d of t.divergences) {
      const k = key(d.packNumber, d.pickNumber);
      alts.set(k, [...(alts.get(k) ?? []), multiTimeline ? `${d.altPick} [${t.name}]` : d.altPick]);
    }
  }

  const { rating, closingThoughts, improvements } = review.summary;
  const head = [review.expansion, 'draft review', rating ? `— ${rating}/10` : ''].filter(Boolean).join(' ');
  let pickCount = 0;
  const out: string[] = [head, `https://www.17lands.com/draft/${review.draftId}`];
  const tally = { good: 0, maybe: 0, no: 0 };
  for (const a of annotations) if (a.verdict) tally[a.verdict]++;
  if (tally.good + tally.maybe + tally.no) {
    out.push(`Picks: ${tally.good} good · ${tally.maybe} maybe · ${tally.no} no`);
  }

  for (const [i, p] of review.draftLog.entries()) {
    const k = key(p.pack_number, p.pick_number);
    const a = byPick.get(k);
    const lines: string[] = [];
    for (const alt of alts.get(k) ?? []) lines.push(`- would take ${alt} over ${p.pick.name}`);
    const ranked = Object.entries(a?.cardRanks ?? {}).sort((x, y) => x[1] - y[1]);
    if (ranked.length) lines.push(`- ranking: ${ranked.map(([n, r]) => `${r}. ${n}`).join(', ')}`);
    for (const [card, note] of Object.entries(a?.cardNotes ?? {})) {
      if (note.trim()) lines.push(`- ${card}: ${note.trim()}`);
    }
    const note = a?.note.trim() ?? '';
    const flag = a?.verdict === 'maybe' || a?.verdict === 'no' ? ` [${a.verdict.toUpperCase()}]` : '';
    if (note || lines.length || flag) {
      pickCount++;
      out.push('', `P${p.pack_number + 1}p${p.pick_number + 1} (took ${p.pick.name})${flag}${note ? `: ${note}` : ''}`, ...lines);
    }

    const cp = review.summary.checkpoints?.[p.pack_number];
    const packEnd = review.draftLog[i + 1]?.pack_number !== p.pack_number;
    if (packEnd && cp && (cp.thinking.trim() || cp.nextPack.trim())) {
      out.push('', `— Pack ${p.pack_number + 1} checkpoint —`);
      if (cp.thinking.trim()) out.push(`Thinking: ${cp.thinking.trim()}`);
      if (cp.nextPack.trim()) out.push(`${review.draftLog[i + 1] ? 'Next pack' : 'Takeaway'}: ${cp.nextPack.trim()}`);
    }
  }

  if (closingThoughts.trim()) out.push('', 'Closing thoughts:', closingThoughts.trim());
  if (improvements.trim()) out.push('', 'Ways to improve:', improvements.trim());
  return { text: out.join('\n'), pickCount };
}
