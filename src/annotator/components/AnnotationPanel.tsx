import { useState, useRef, useEffect, useCallback } from 'react';
import type { PickAnnotation, AnnotationLayer } from '../types';
import type { RawDraftPick, RawDraftCard } from '../../data/types';
import { T, label } from '../../shared/theme';
import { useSignals } from '../SignalContext';
import { CardHoverCard } from './CardHoverCard';
import { useIsNarrow } from '../../shared/useIsNarrow';
import { ARCHETYPE_ABBREV } from '../../shared/constants';
import type { CardSignalEntry } from '../../signals/types';
import type { ArchetypeId } from '../../shared/types';

interface AnnotationPanelProps {
  pick: RawDraftPick;
  annotation: PickAnnotation | undefined;
  isEditable: boolean;
  onPickNoteChange: (note: string) => void;
  onCardNoteChange: (cardName: string, note: string) => void;
  onCardRankChange: (cardName: string, rank: number | null) => void;
  selectedCard: string | null;
  onSelectCard: (name: string | null) => void;
  remoteLayers?: AnnotationLayer[];
  /**
   * The creator's canonical annotations, shown read-only as the BASE
   * layer to everyone who is not the creator — the shared review must
   * never look empty just because the owner is offline.
   */
  creatorAnnotation?: PickAnnotation;
  /** Present when browsing without an identity; renders the join nudge */
  onRequestJoin?: () => void;
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: 8,
  backgroundColor: T.bg3,
  color: T.ink0,
  border: `1px solid ${T.line1}`,
  borderRadius: T.radius.m,
  fontFamily: T.mono,
  fontSize: T.fs.t3,
  resize: 'vertical',
  lineHeight: 1.45,
};

export function AnnotationPanel({
  pick,
  annotation,
  isEditable,
  onPickNoteChange,
  onCardNoteChange,
  onCardRankChange,
  selectedCard,
  onSelectCard,
  remoteLayers = [],
  creatorAnnotation,
  onRequestJoin,
}: AnnotationPanelProps) {
  const cardNote = selectedCard ? (annotation?.cardNotes[selectedCard] ?? '') : '';
  const cardRank = selectedCard ? (annotation?.cardRanks?.[selectedCard] ?? null) : null;

  const signals = useSignals();
  const narrow = useIsNarrow();

  // Chip hover-stats popover: same timing discipline as the workspace grid —
  // 150ms open intent, 60ms close grace, instant retarget when already open
  const [hoverCard, setHoverCard] = useState<{ card: RawDraftCard; rect: DOMRect } | null>(null);
  const hoverOpenRef = useRef(false);
  const openTimer = useRef<number | null>(null);
  const closeTimer = useRef<number | null>(null);

  const handleChipEnter = useCallback((card: RawDraftCard, el: HTMLElement) => {
    if (closeTimer.current) { window.clearTimeout(closeTimer.current); closeTimer.current = null; }
    if (openTimer.current) { window.clearTimeout(openTimer.current); openTimer.current = null; }
    const rect = el.getBoundingClientRect();
    if (hoverOpenRef.current) {
      setHoverCard({ card, rect });
    } else {
      openTimer.current = window.setTimeout(() => {
        hoverOpenRef.current = true;
        setHoverCard({ card, rect });
      }, 150);
    }
  }, []);

  const handleChipLeave = useCallback(() => {
    if (openTimer.current) { window.clearTimeout(openTimer.current); openTimer.current = null; }
    closeTimer.current = window.setTimeout(() => {
      hoverOpenRef.current = false;
      setHoverCard(null);
    }, 60);
  }, []);

  // Dismiss on pick navigation so the popover never anchors to a stale chip
  useEffect(() => {
    if (openTimer.current) { window.clearTimeout(openTimer.current); openTimer.current = null; }
    if (closeTimer.current) { window.clearTimeout(closeTimer.current); closeTimer.current = null; }
    hoverOpenRef.current = false;
    setHoverCard(null);
  }, [pick.pack_number, pick.pick_number]);

  const pa = signals.analysis?.picks.find(
    (p) => p.packNumber === pick.pack_number && p.pickNumber === pick.pick_number,
  ) ?? null;
  const selectedCardObj = selectedCard ? pick.available.find((c) => c.name === selectedCard) : undefined;

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 10,
        padding: 10,
        backgroundColor: T.bg1,
        border: `1px solid ${T.line0}`,
        borderRadius: T.radius.l,
        fontFamily: T.mono,
        fontSize: T.fs.t3,
        height: '100%',
        boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.04)',
      }}
    >
      <div style={{ ...label, color: T.ink0 }}>
        P{pick.pack_number + 1}P{pick.pick_number + 1} · Annotations
      </div>

      {/* Creator base layer — read-only, always visible to non-creators */}
      {creatorAnnotation && (creatorAnnotation.note || Object.keys(creatorAnnotation.cardNotes).length > 0) && (
        <div
          style={{
            paddingLeft: 8,
            borderLeft: `3px solid ${T.picked}`,
          }}
        >
          <div style={{ ...label, color: T.picked, marginBottom: 3 }}>
            Creator · base
          </div>
          {creatorAnnotation.note && (
            <div style={{ color: T.ink0, lineHeight: 1.45, marginBottom: 4 }}>
              {creatorAnnotation.note}
            </div>
          )}
          {selectedCard && creatorAnnotation.cardNotes[selectedCard] && (
            <div style={{ color: T.ink1, fontSize: T.fs.t2, fontStyle: 'italic' }}>
              {selectedCard}: {creatorAnnotation.cardNotes[selectedCard]}
            </div>
          )}
        </div>
      )}

      <div
        style={{
          padding: 10,
          backgroundColor: 'rgba(77,159,255,0.06)',
          border: `1px solid rgba(77,159,255,0.35)`,
          borderLeft: `3px solid ${T.sel}`,
          borderRadius: T.radius.m,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 6 }}>
          <div style={{ ...label, fontSize: T.fs.t3, color: T.sel }}>
            {isEditable ? 'Your take on this pick' : 'Your pick note'}
          </div>
          {isEditable && (
            <div style={{ fontSize: T.fs.t1, color: T.ink2, marginLeft: 'auto' }}>
              goes in your copied review
            </div>
          )}
        </div>
        {isEditable || annotation?.note ? (
          <textarea
            value={annotation?.note ?? ''}
            onChange={(e) => onPickNoteChange(e.target.value)}
            readOnly={!isEditable}
            placeholder={
              isEditable
                ? `Right pick? What would you take over ${pick.pick.name}, and why?`
                : '(no note)'
            }
            style={{
              ...inputStyle,
              minHeight: 96,
              fontSize: T.fs.t4,
              border: `1px solid ${annotation?.note ? T.line2 : 'rgba(77,159,255,0.45)'}`,
            }}
          />
        ) : onRequestJoin ? (
          <button
            onClick={onRequestJoin}
            style={{
              width: '100%',
              padding: '10px 8px',
              backgroundColor: 'transparent',
              color: T.ink2,
              border: `1px dashed ${T.line1}`,
              borderRadius: T.radius.m,
              cursor: 'pointer',
              fontFamily: T.mono,
              fontSize: T.fs.t2,
              textAlign: 'left',
              lineHeight: 1.45,
            }}
          >
            Viewing only — <span style={{ color: T.sel }}>join</span> to add
            your own notes in your own color.
          </button>
        ) : (
          <div style={{ color: T.ink3, fontSize: T.fs.t2 }}>
            No notes on this pick yet.
          </div>
        )}
      </div>

      <div style={{ flex: 1, minHeight: 0 }}>
        <div style={{ ...label, marginBottom: 4 }}>Card notes</div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 3, marginBottom: 6 }}>
          {pick.available.map((card) => {
            const hasNote = !!(annotation?.cardNotes[card.name]) ||
              !!(creatorAnnotation?.cardNotes[card.name]);
            const isSelected = selectedCard === card.name;
            const isPicked = card.name === pick.pick.name;
            const rank = annotation?.cardRanks?.[card.name];
            return (
              <button
                key={card.name}
                onClick={() => onSelectCard(isSelected ? null : card.name)}
                onPointerEnter={(e) => {
                  if (e.pointerType !== 'mouse') return;
                  handleChipEnter(card, e.currentTarget);
                }}
                onPointerLeave={(e) => {
                  if (e.pointerType !== 'mouse') return;
                  handleChipLeave();
                }}
                style={{
                  padding: '3px 7px',
                  backgroundColor: isSelected ? T.bg3 : T.bg2,
                  color: isPicked ? T.picked : hasNote ? T.amber : T.ink2,
                  border: `1px solid ${isSelected ? T.line2 : T.line0}`,
                  borderRadius: T.radius.s,
                  cursor: 'pointer',
                  fontFamily: T.mono,
                  fontSize: T.fs.t2,
                  fontWeight: isPicked ? 700 : 400,
                  transition: `border-color ${T.fast} ${T.ease}`,
                }}
                title={card.name}
              >
                {rank != null && (
                  <span style={{ color: T.sel, marginRight: 3, fontWeight: 700 }}>
                    #{rank}
                  </span>
                )}
                {truncateName(card.name)}
                {hasNote && <span style={{ marginLeft: 3, color: T.amber }}>●</span>}
              </button>
            );
          })}
        </div>

        {selectedCard && !narrow && (
          <div>
            <div
              style={{
                color: T.ink1,
                marginBottom: 6,
                fontSize: T.fs.t4,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <span style={{ color: T.ink0 }}>
                {selectedCard}
                {selectedCard === pick.pick.name && (
                  <span style={{ color: T.picked, marginLeft: 6, fontSize: T.fs.t1 }}>
                    PICKED
                  </span>
                )}
              </span>
              {isEditable && (
                <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <span style={{ ...label }}>Rank</span>
                  {[1, 2, 3, 4, 5].map((r) => (
                    <button
                      key={r}
                      onClick={() => onCardRankChange(selectedCard, cardRank === r ? null : r)}
                      style={{
                        width: narrow ? 40 : 22,
                        height: 22,
                        padding: 0,
                        backgroundColor: cardRank === r ? T.sel : T.bg3,
                        color: cardRank === r ? '#00121F' : T.ink2,
                        border: `1px solid ${cardRank === r ? T.sel : T.line1}`,
                        borderRadius: T.radius.s,
                        cursor: 'pointer',
                        fontFamily: T.mono,
                        fontSize: T.fs.t2,
                        fontWeight: 700,
                        transition: `background-color ${T.fast} ${T.ease}`,
                      }}
                    >
                      {r}
                    </button>
                  ))}
                </span>
              )}
              {!isEditable && cardRank != null && (
                <span style={{ color: T.sel, fontSize: T.fs.t3, fontWeight: 700 }}>
                  Rank #{cardRank}
                </span>
              )}
            </div>
            <textarea
              value={cardNote}
              onChange={(e) => onCardNoteChange(selectedCard, e.target.value)}
              readOnly={!isEditable}
              placeholder={isEditable ? 'Note on this card…' : '(no note)'}
              style={{ ...inputStyle, minHeight: 64 }}
            />
          </div>
        )}
        {selectedCard && narrow && (
          <CardNoteModal title={selectedCard} onClose={() => onSelectCard(null)}>
            {selectedCardObj && (
              <div>
                <img
                  src={selectedCardObj.image_url}
                  alt={selectedCardObj.name}
                  style={{ display: 'block', width: 'min(260px, 100%)', margin: '0 auto', borderRadius: T.radius.l }}
                />
                <CompactStats entry={signals.signalMap?.[selectedCardObj.name] ?? null} />
              </div>
            )}
            <div style={{ marginTop: 10 }}>
              <div
              style={{
                color: T.ink1,
                marginBottom: 6,
                fontSize: T.fs.t4,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                rowGap: 6,
              }}
            >
              <span style={{ color: T.ink0 }}>
                {selectedCard}
                {selectedCard === pick.pick.name && (
                  <span style={{ color: T.picked, marginLeft: 6, fontSize: T.fs.t1 }}>
                    PICKED
                  </span>
                )}
              </span>
              {isEditable && (
                <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <span style={{ ...label }}>Rank</span>
                  {[1, 2, 3, 4, 5].map((r) => (
                    <button
                      key={r}
                      onClick={() => onCardRankChange(selectedCard, cardRank === r ? null : r)}
                      style={{
                        width: narrow ? 40 : 22,
                        height: 22,
                        padding: 0,
                        backgroundColor: cardRank === r ? T.sel : T.bg3,
                        color: cardRank === r ? '#00121F' : T.ink2,
                        border: `1px solid ${cardRank === r ? T.sel : T.line1}`,
                        borderRadius: T.radius.s,
                        cursor: 'pointer',
                        fontFamily: T.mono,
                        fontSize: T.fs.t2,
                        fontWeight: 700,
                        transition: `background-color ${T.fast} ${T.ease}`,
                      }}
                    >
                      {r}
                    </button>
                  ))}
                </span>
              )}
              {!isEditable && cardRank != null && (
                <span style={{ color: T.sel, fontSize: T.fs.t3, fontWeight: 700 }}>
                  Rank #{cardRank}
                </span>
              )}
            </div>
            <textarea
              value={cardNote}
              onChange={(e) => onCardNoteChange(selectedCard, e.target.value)}
              readOnly={!isEditable}
              placeholder={isEditable ? 'Note on this card…' : '(no note)'}
              style={{ ...inputStyle, minHeight: 64 }}
            />
            </div>
          </CardNoteModal>
        )}
        {!selectedCard && isEditable && (
          <div style={{ color: T.ink3, fontSize: T.fs.t2, lineHeight: 1.5 }}>
            {narrow
              ? 'Tap a card in the pack (or a chip above) to see its stats, note or rank it.'
              : 'Click a card in the pack (or a chip above) to note or rank it.'}
          </div>
        )}
      </div>

      {remoteLayers.length > 0 && (
        <div style={{ flexShrink: 0 }}>
          <RemoteAnnotations
            layers={remoteLayers}
            packNumber={pick.pack_number}
            pickNumber={pick.pick_number}
            selectedCard={selectedCard}
          />
        </div>
      )}

      {hoverCard && !narrow && signals.status === 'ready' && signals.config && (
        <CardHoverCard
          card={hoverCard.card}
          anchorRect={hoverCard.rect}
          signalEntry={signals.signalMap?.[hoverCard.card.name] ?? null}
          pickSignal={pa?.cardSignals.find((s) => s.cardName === hoverCard.card.name) ?? null}
          isWheel={pa?.wheelDetections.includes(hoverCard.card.name) ?? false}
          config={signals.config}
          packNumber={pick.pack_number}
          pickNumber={pick.pick_number}
        />
      )}
    </div>
  );
}

function RemoteAnnotations({
  layers,
  packNumber,
  pickNumber,
  selectedCard,
}: {
  layers: AnnotationLayer[];
  packNumber: number;
  pickNumber: number;
  selectedCard: string | null;
}) {
  const remoteNotes: { userName: string; userColor: string; note: string; cardNote?: string }[] = [];

  for (const layer of layers) {
    const ann = layer.annotations.find(
      (a) => a.packNumber === packNumber && a.pickNumber === pickNumber,
    );
    if (!ann) continue;
    const pickNote = ann.note;
    const cardNote = selectedCard ? ann.cardNotes[selectedCard] : undefined;
    if (pickNote || cardNote) {
      remoteNotes.push({ userName: layer.userName, userColor: layer.userColor, note: pickNote, cardNote });
    }
  }

  if (remoteNotes.length === 0) return null;

  return (
    <div style={{ borderTop: `1px solid ${T.line0}`, paddingTop: 6, marginTop: 6 }}>
      <div style={{ ...label, marginBottom: 4 }}>Others' notes</div>
      {remoteNotes.map((r, i) => (
        <div
          key={i}
          style={{ marginBottom: 6, paddingLeft: 8, borderLeft: `3px solid ${r.userColor}` }}
        >
          <div style={{ color: r.userColor, fontSize: T.fs.t1, fontWeight: 700, marginBottom: 2 }}>
            {r.userName.toUpperCase()}
          </div>
          {r.note && (
            <div style={{ color: T.ink1, fontSize: T.fs.t3, marginBottom: 2, lineHeight: 1.45 }}>
              {r.note}
            </div>
          )}
          {r.cardNote && (
            <div style={{ color: T.ink2, fontSize: T.fs.t2, fontStyle: 'italic' }}>
              {selectedCard}: {r.cardNote}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

function truncateName(name: string): string {
  return name.length > 14 ? name.slice(0, 12) + '…' : name;
}

/** Phone-only: selected card + its note in a centered modal */
function CardNoteModal({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, []);

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 100, backgroundColor: 'rgba(0,0,0,0.75)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 'max(12px, env(safe-area-inset-top)) 12px max(12px, env(safe-area-inset-bottom))',
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '100%', maxWidth: 420, maxHeight: '100%', overflowY: 'auto', backgroundColor: T.bg1,
          border: `1px solid ${T.line1}`, borderRadius: T.radius.l,
          padding: '0 12px 12px', fontFamily: T.mono,
        }}
      >
        <div
          style={{
            position: 'sticky', top: 0, zIndex: 1, display: 'flex', justifyContent: 'flex-end',
            padding: '8px 0', backgroundColor: T.bg1,
          }}
        >
          <button
            onClick={onClose}
            aria-label="Close"
            style={{
              minWidth: 44, minHeight: 40, backgroundColor: T.bg2, color: T.ink0,
              border: `1px solid ${T.line1}`, borderRadius: T.radius.m, fontFamily: T.mono,
              fontSize: T.fs.t4, cursor: 'pointer',
            }}
          >
            Done
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

/** Phone modal: the few numbers that matter, one wrapping row, no chart */
function CompactStats({ entry }: { entry: CardSignalEntry | null }) {
  if (!entry) return <div style={{ color: T.ink3, fontSize: T.fs.t2, textAlign: 'center', marginTop: 8 }}>No 17Lands data</div>;
  const best = (Object.entries(entry.archetypeGihwr) as [ArchetypeId, number][])
    .filter(([, wr]) => wr != null)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 2);
  const pct = (n: number) => `${(n * 100).toFixed(1)}%`;
  const stat = (k: string, v: string) => (
    <span key={k} style={{ whiteSpace: 'nowrap' }}>
      <span style={{ color: T.ink2 }}>{k} </span>
      <span style={{ color: T.ink0, fontWeight: 700 }}>{v}</span>
    </span>
  );
  return (
    <div
      style={{
        display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '4px 12px',
        marginTop: 8, fontSize: T.fs.t3,
      }}
    >
      {stat('GIHWR', pct(entry.overallGihwr))}
      {best.map(([arch, wr]) => stat(ARCHETYPE_ABBREV[arch] ?? arch, pct(wr)))}
      {stat('ALSA', entry.alsa.toFixed(1))}
      {entry.ata != null && stat('ATA', entry.ata.toFixed(1))}
      <span style={{ ...label }}>{entry.signalTier}</span>
    </div>
  );
}
