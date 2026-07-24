import { useState, useRef, useEffect, useCallback } from 'react';
import type { PickAnnotation, AnnotationLayer } from '../types';
import type { RawDraftPick, RawDraftCard } from '../../data/types';
import { T, label } from '../../shared/theme';
import { useSignals } from '../SignalContext';
import { CardHoverCard } from './CardHoverCard';

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

      <div>
        <div style={{ ...label, marginBottom: 4 }}>
          {isEditable ? 'Pick note' : 'Your pick note'}
        </div>
        {isEditable || annotation?.note ? (
          <textarea
            value={annotation?.note ?? ''}
            onChange={(e) => onPickNoteChange(e.target.value)}
            readOnly={!isEditable}
            placeholder={
              isEditable ? 'What were you thinking here?' : '(no note)'
            }
            style={{ ...inputStyle, minHeight: 72 }}
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
                onMouseEnter={(e) => handleChipEnter(card, e.currentTarget)}
                onMouseLeave={handleChipLeave}
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

        {selectedCard && (
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
                        width: 22,
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
        {!selectedCard && isEditable && (
          <div style={{ color: T.ink3, fontSize: T.fs.t2, lineHeight: 1.5 }}>
            Click a card in the pack (or a chip above) to note or rank it.
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

      {hoverCard && signals.status === 'ready' && signals.config && (
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
