import { useEffect, useState } from 'react';
import { T, label } from '../../shared/theme';
import { useIsNarrow } from '../../shared/useIsNarrow';
import type { RawDraftPick, RawDraftCard } from '../../data/types';
import type { PickAnnotation, PickVerdict } from '../types';
import { cardColors, cmcOf, isLand } from '../deck';

interface QuickReviewProps {
  picks: RawDraftPick[];
  pickIndex: number;
  annotation: PickAnnotation | undefined;
  /** All of this user's annotations — for the verdict tally */
  annotations: PickAnnotation[];
  canAnnotate: boolean;
  onVerdict: (verdict: PickVerdict | undefined) => void;
  onComment: (note: string) => void;
  onPrev: () => void;
  /** Advance; past the last pick the parent opens the summary */
  onNext: () => void;
}

const VERDICTS: { id: PickVerdict; label: string; key: string; color: string }[] = [
  { id: 'good', label: 'Good', key: 'g', color: T.picked },
  { id: 'maybe', label: 'Maybe', key: 'm', color: T.amber },
  { id: 'no', label: 'No', key: 'n', color: T.danger },
];

/**
 * One-screen verdict pass: whole pack + recent picks in view, Good / Maybe / No.
 * Good auto-advances; Maybe/No open a comment (stored as the pick note).
 */
export function QuickReview({
  picks, pickIndex, annotation, annotations, canAnnotate, onVerdict, onComment, onPrev, onNext,
}: QuickReviewProps) {
  const narrow = useIsNarrow();
  const [zoom, setZoom] = useState<string | null>(null);
  const pick = picks[pickIndex];
  const verdict = annotation?.verdict;

  const choose = (v: PickVerdict) => {
    if (!canAnnotate) return;
    if (verdict === v) return onVerdict(undefined);
    onVerdict(v);
    if (v === 'good') window.setTimeout(onNext, 150);
  };

  // G / M / N verdicts on desktop (arrows are handled by the workspace)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      if (t.tagName === 'TEXTAREA' || t.tagName === 'INPUT' || e.metaKey || e.ctrlKey) return;
      const v = VERDICTS.find((x) => x.key === e.key.toLowerCase());
      if (v) { e.preventDefault(); choose(v.id); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  const tally = { good: 0, maybe: 0, no: 0 };
  for (const a of annotations) if (a.verdict) tally[a.verdict]++;

  const pool = picks.slice(0, pickIndex).map((p, i) => ({ card: p.pick, isNew: i >= pickIndex - 3 }));
  const colorCounts: Record<string, number> = {};
  for (const { card } of pool) {
    if (isLand(card)) continue;
    for (const c of cardColors(card)) colorCounts[c] = (colorCounts[c] ?? 0) + 1;
  }
  const colors = Object.entries(colorCounts).sort((a, b) => b[1] - a[1]);
  const sortedPool = [...pool].sort(
    (a, b) => GROUP_ORDER.indexOf(groupOf(a.card)) - GROUP_ORDER.indexOf(groupOf(b.card)) || cmcOf(a.card) - cmcOf(b.card),
  );

  if (!pick) return null;

  return (
    <div
      style={{
        display: 'flex', gap: 12, width: '100%', maxWidth: narrow ? undefined : 1240, margin: '0 auto',
        fontFamily: T.mono, minHeight: 0, flex: narrow ? undefined : 1,
      }}
    >
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, flex: 1, minWidth: 0, paddingBottom: narrow ? 8 : 0 }}>
      {/* Progress + tally */}
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
        <span style={{ color: T.ink0, fontSize: T.fs.t5, fontWeight: 700 }}>
          P{pick.pack_number + 1}P{pick.pick_number + 1}
        </span>
        <span style={{ color: T.ink2, fontSize: T.fs.t3 }}>{pickIndex + 1}/{picks.length}</span>
        <span style={{ marginLeft: 'auto', display: 'flex', gap: 10, fontSize: T.fs.t3 }}>
          {VERDICTS.map((v) => (
            <span key={v.id} style={{ color: v.color }}>{v.label} {tally[v.id]}</span>
          ))}
        </span>
      </div>

      {/* Whole pack, pick outlined */}
      <div style={{ display: 'grid', gridTemplateColumns: `repeat(${narrow ? 5 : 7}, 1fr)`, gap: narrow ? 4 : 6 }}>
        {pick.available.map((card, i) => {
          const isPick = card.name === pick.pick.name;
          return (
            <button
              key={`${card.name}-${i}`}
              onClick={() => setZoom(card.image_url)}
              title={card.name}
              style={{
                padding: 0, border: 'none', background: 'none', cursor: 'zoom-in', lineHeight: 0,
                borderRadius: T.radius.m, boxShadow: isPick ? T.pickedGlow : 'none',
                opacity: isPick ? 1 : 0.85, minHeight: 0,
              }}
            >
              <img src={card.image_url} alt={card.name} style={{ width: '100%', borderRadius: T.radius.m }} />
            </button>
          );
        })}
      </div>

      {/* Phone: pool as a swipeable strip (desktop shows the side panel) */}
      {narrow && (
        <div>
          <PoolHeader count={pool.length} colors={colors} />
          <div style={{ display: 'flex', gap: 3, overflowX: 'auto', paddingBottom: 2 }}>
            {pool.length === 0 && <span style={{ color: T.ink3, fontSize: T.fs.t2 }}>First pick — empty pool</span>}
            {sortedPool.map(({ card, isNew }, i) => (
              <button
                key={`${card.name}-${i}`}
                onClick={() => setZoom(card.image_url)}
                title={card.name}
                style={{
                  flexShrink: 0, padding: 0, border: 'none', background: 'none', lineHeight: 0, minHeight: 0,
                  borderRadius: T.radius.s, boxShadow: isNew ? T.selGlow : 'none',
                }}
              >
                <img src={card.image_url} alt={card.name} style={{ width: 52, borderRadius: T.radius.s }} />
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Verdict */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6 }}>
        {VERDICTS.map((v) => {
          const on = verdict === v.id;
          return (
            <button
              key={v.id}
              onClick={() => choose(v.id)}
              disabled={!canAnnotate}
              style={{
                minHeight: 48, borderRadius: T.radius.m, cursor: canAnnotate ? 'pointer' : 'default',
                fontFamily: T.mono, fontSize: T.fs.t5, fontWeight: 700,
                backgroundColor: on ? v.color : T.bg2, color: on ? T.bg0 : v.color,
                border: `1px solid ${on ? v.color : T.line1}`,
              }}
            >
              {v.label}
              {!narrow && <span style={{ fontSize: T.fs.t1, opacity: 0.6, marginLeft: 6 }}>{v.key.toUpperCase()}</span>}
            </button>
          );
        })}
      </div>

      {(verdict === 'maybe' || verdict === 'no' || !!annotation?.note) && (
        <textarea
          key={pickIndex}
          autoFocus={verdict === 'maybe' || verdict === 'no'}
          value={annotation?.note ?? ''}
          onChange={(e) => onComment(e.target.value)}
          readOnly={!canAnnotate}
          placeholder={`What should you have taken over ${pick.pick.name}, and why?`}
          style={{
            width: '100%', minHeight: 72, padding: 8, boxSizing: 'border-box', resize: 'vertical',
            backgroundColor: T.bg3, color: T.ink0, border: `1px solid ${T.line2}`,
            borderRadius: T.radius.m, fontFamily: T.mono, fontSize: T.fs.t4, lineHeight: 1.45,
          }}
        />
      )}

      {/* Nav */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
        <button onClick={onPrev} disabled={pickIndex === 0} style={navBtn(pickIndex === 0)}>← Prev</button>
        <button onClick={onNext} style={navBtn(false)}>
          {pickIndex === picks.length - 1 ? 'Finish → Summary' : 'Next →'}
        </button>
      </div>

    </div>

      {!narrow && (
        <div
          style={{
            width: 260, flexShrink: 0, overflowY: 'auto', padding: 10, backgroundColor: T.bg1,
            border: `1px solid ${T.line0}`, borderRadius: T.radius.l,
          }}
        >
          <PoolHeader count={pool.length} colors={colors} />
          {pool.length === 0 && <div style={{ color: T.ink3, fontSize: T.fs.t2 }}>First pick — empty pool</div>}
          {sortedPool.map(({ card, isNew }, i) => (
            <button
              key={`${card.name}-${i}`}
              onClick={() => setZoom(card.image_url)}
              style={{
                display: 'flex', alignItems: 'center', gap: 6, width: '100%', padding: '2px 0', minHeight: 0,
                background: 'none', border: 'none', cursor: 'zoom-in', fontFamily: T.mono,
                fontSize: T.fs.t2, color: isNew ? T.ink0 : T.ink1, textAlign: 'left',
              }}
            >
              <ColorDots card={card} />
              <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{card.name}</span>
              {isNew && <span style={{ color: T.sel, fontSize: T.fs.t1 }}>NEW</span>}
              <span style={{ color: T.ink3, width: 14, textAlign: 'right' }}>{isLand(card) ? '' : cmcOf(card)}</span>
            </button>
          ))}
        </div>
      )}

      {zoom && (
        <div
          onClick={() => setZoom(null)}
          style={{
            position: 'fixed', inset: 0, zIndex: 100, backgroundColor: 'rgba(0,0,0,0.8)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16, cursor: 'zoom-out',
          }}
        >
          <img src={zoom} alt="" style={{ width: 'min(340px, 100%)', borderRadius: T.radius.l }} />
        </div>
      )}
    </div>
  );
}

const navBtn = (disabled: boolean): React.CSSProperties => ({
  minHeight: 44, borderRadius: T.radius.m, fontFamily: T.mono, fontSize: T.fs.t3, fontWeight: 700,
  backgroundColor: T.bg2, color: disabled ? T.ink3 : T.ink1, border: `1px solid ${T.line1}`,
  cursor: disabled ? 'default' : 'pointer',
});

const GROUP_ORDER = ['W', 'U', 'B', 'R', 'G', 'M', 'C', 'L'];
function groupOf(card: RawDraftCard): string {
  if (isLand(card)) return 'L';
  const cs = cardColors(card);
  return cs.length === 0 ? 'C' : cs.length > 1 ? 'M' : cs[0];
}

function PoolHeader({ count, colors }: { count: number; colors: [string, number][] }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
      <span style={label}>Pool · {count}</span>
      <span style={{ marginLeft: 'auto', display: 'flex', gap: 8, fontSize: T.fs.t3, color: T.ink1 }}>
        {colors.map(([c, n]) => (
          <span key={c} style={{ display: 'inline-flex', alignItems: 'center', gap: 3 }}>
            <span style={{ width: 9, height: 9, borderRadius: 5, backgroundColor: T.mana[c] }} />
            {n}
          </span>
        ))}
      </span>
    </div>
  );
}

function ColorDots({ card }: { card: RawDraftCard }) {
  const cs = cardColors(card);
  return (
    <span style={{ display: 'inline-flex', gap: 1, width: 18, flexShrink: 0 }}>
      {cs.length === 0 ? (
        <span style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: T.ink3 }} />
      ) : (
        cs.map((c) => <span key={c} style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: T.mana[c] }} />)
      )}
    </span>
  );
}
