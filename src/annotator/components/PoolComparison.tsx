import { useState, useRef, useCallback } from 'react';
import type { RawDraftCard } from '../../data/types';
import { T, label } from '../../shared/theme';
import { useSignals } from '../SignalContext';
import { CardHoverCard } from './CardHoverCard';

interface PoolComparisonProps {
  actualPool: RawDraftCard[];
  alternatePool: RawDraftCard[] | null;
}

type ViewMode = 'grid' | 'stack';

type CardEnterHandler = (card: RawDraftCard, el: HTMLElement) => void;

export function PoolComparison({ actualPool, alternatePool }: PoolComparisonProps) {
  const [viewMode, setViewMode] = useState<ViewMode>('stack');
  const actualNames = new Set(actualPool.map((c) => c.name));
  const altNames = alternatePool ? new Set(alternatePool.map((c) => c.name)) : null;

  const signals = useSignals();

  // Pool hover-stats popover: same timing discipline as the workspace grid —
  // 150ms open intent, 60ms close grace, instant retarget when already open
  const [hoverCard, setHoverCard] = useState<{ card: RawDraftCard; rect: DOMRect } | null>(null);
  const hoverOpenRef = useRef(false);
  const openTimer = useRef<number | null>(null);
  const closeTimer = useRef<number | null>(null);

  const handleCardEnter = useCallback<CardEnterHandler>((card, el) => {
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

  const handleCardLeave = useCallback(() => {
    if (openTimer.current) { window.clearTimeout(openTimer.current); openTimer.current = null; }
    closeTimer.current = window.setTimeout(() => {
      hoverOpenRef.current = false;
      setHoverCard(null);
    }, 60);
  }, []);

  const dismissHover = useCallback(() => {
    if (openTimer.current) { window.clearTimeout(openTimer.current); openTimer.current = null; }
    if (closeTimer.current) { window.clearTimeout(closeTimer.current); closeTimer.current = null; }
    hoverOpenRef.current = false;
    setHoverCard(null);
  }, []);

  const headerStyle: React.CSSProperties = {
    ...label,
    marginBottom: 4,
    padding: '2px 0',
    borderBottom: `1px solid ${T.line0}`,
  };

  const toggleStyle = (active: boolean): React.CSSProperties => ({
    padding: '2px 8px',
    backgroundColor: active ? T.bg3 : T.bg2,
    color: active ? T.sel : T.ink2,
    border: `1px solid ${active ? T.sel : T.line1}`,
    borderRadius: T.radius.m,
    cursor: 'pointer',
    fontFamily: T.mono,
    fontSize: T.fs.t1,
    fontWeight: 600,
    letterSpacing: '0.08em',
    textTransform: 'uppercase',
    transition: `border-color ${T.fast} ${T.ease}`,
  });

  return (
    <div style={{ padding: '4px 8px', fontFamily: T.mono }}>
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 4, marginBottom: 4 }}>
        <button onClick={() => setViewMode('stack')} style={toggleStyle(viewMode === 'stack')}>
          Stack
        </button>
        <button onClick={() => setViewMode('grid')} style={toggleStyle(viewMode === 'grid')}>
          Grid
        </button>
      </div>

      <div style={{ display: 'flex', gap: 8 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={headerStyle}>{alternatePool ? 'Actual' : 'Pool'} ({actualPool.length})</div>
          {viewMode === 'grid' ? (
            <GridView
              pool={actualPool}
              diffSet={altNames}
              onCardEnter={handleCardEnter}
              onCardLeave={handleCardLeave}
            />
          ) : (
            <StackView
              pool={actualPool}
              diffSet={altNames}
              onCardEnter={handleCardEnter}
              onCardLeave={handleCardLeave}
              onHoverDismiss={dismissHover}
            />
          )}
        </div>
        {alternatePool && (
          <>
            <div style={{ width: 1, backgroundColor: T.line0, flexShrink: 0 }} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={headerStyle}>Alternate ({alternatePool.length})</div>
              {viewMode === 'grid' ? (
                <GridView
                  pool={alternatePool}
                  diffSet={actualNames}
                  onCardEnter={handleCardEnter}
                  onCardLeave={handleCardLeave}
                />
              ) : (
                <StackView
                  pool={alternatePool}
                  diffSet={actualNames}
                  onCardEnter={handleCardEnter}
                  onCardLeave={handleCardLeave}
                  onHoverDismiss={dismissHover}
                />
              )}
            </div>
          </>
        )}
      </div>

      {hoverCard && signals.status === 'ready' && signals.config && (
        <CardHoverCard
          card={hoverCard.card}
          anchorRect={hoverCard.rect}
          signalEntry={signals.signalMap?.[hoverCard.card.name] ?? null}
          pickSignal={null}
          isWheel={false}
          config={signals.config}
          packNumber={0}
          pickNumber={0}
          showPickSignal={false}
        />
      )}
    </div>
  );
}

function GridView({
  pool,
  diffSet,
  onCardEnter,
  onCardLeave,
}: {
  pool: RawDraftCard[];
  diffSet: Set<string> | null;
  onCardEnter: CardEnterHandler;
  onCardLeave: () => void;
}) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(8, 1fr)', gap: 2 }}>
      {pool.map((card, i) => (
        <CardThumbnail
          key={`${card.name}-${i}`}
          card={card}
          isDifferent={diffSet ? !diffSet.has(card.name) : false}
          onCardEnter={onCardEnter}
          onCardLeave={onCardLeave}
        />
      ))}
    </div>
  );
}

function getCmc(card: RawDraftCard): number {
  if (!card.mana_cost) return 0;
  const symbols = card.mana_cost.match(/\{[^}]+\}/g) ?? [];
  let cmc = 0;
  for (const s of symbols) {
    const inner = s.slice(1, -1);
    const num = parseInt(inner, 10);
    if (!isNaN(num)) cmc += num;
    else if (inner !== 'X') cmc += 1;
  }
  return cmc;
}

function StackView({
  pool,
  diffSet,
  onCardEnter,
  onCardLeave,
  onHoverDismiss,
}: {
  pool: RawDraftCard[];
  diffSet: Set<string> | null;
  onCardEnter: CardEnterHandler;
  onCardLeave: () => void;
  onHoverDismiss: () => void;
}) {
  const [dragState, setDragState] = useState<{ cardIndex: number; startX: number; startY: number; x: number; y: number } | null>(null);
  const [cardOrder, setCardOrder] = useState<number[] | null>(null);

  const grouped = new Map<number, { card: RawDraftCard; originalIdx: number }[]>();
  const order = cardOrder ?? pool.map((_, i) => i);

  for (const idx of order) {
    const card = pool[idx];
    if (!card) continue;
    const cmc = Math.min(getCmc(card), 7);
    if (!grouped.has(cmc)) grouped.set(cmc, []);
    grouped.get(cmc)!.push({ card, originalIdx: idx });
  }

  const columns = Array.from(grouped.entries()).sort((a, b) => a[0] - b[0]);

  const handlePointerDown = (e: React.PointerEvent, cardIndex: number) => {
    e.preventDefault();
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    onHoverDismiss();
    setDragState({ cardIndex, startX: e.clientX, startY: e.clientY, x: 0, y: 0 });
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!dragState) return;
    setDragState({
      ...dragState,
      x: e.clientX - dragState.startX,
      y: e.clientY - dragState.startY,
    });
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (!dragState) return;
    const dx = e.clientX - dragState.startX;

    if (Math.abs(dx) > 40) {
      const currentOrder = cardOrder ?? pool.map((_, i) => i);
      const movingIdx = currentOrder.indexOf(dragState.cardIndex);
      const movingCard = pool[dragState.cardIndex];
      const currentCmc = Math.min(getCmc(movingCard), 7);
      const targetCmc = dx > 0 ? Math.min(currentCmc + 1, 7) : Math.max(currentCmc - 1, 0);

      if (targetCmc !== currentCmc) {
        const newOrder = [...currentOrder];
        newOrder.splice(movingIdx, 1);
        const insertBefore = newOrder.findIndex((idx) => Math.min(getCmc(pool[idx]), 7) >= targetCmc);
        if (insertBefore === -1) newOrder.push(dragState.cardIndex);
        else newOrder.splice(insertBefore, 0, dragState.cardIndex);
        setCardOrder(newOrder);
      }
    }

    setDragState(null);
  };

  const minColumns = 5;
  const fillerCount = Math.max(0, minColumns - columns.length);

  return (
    <div
      style={{ display: 'flex', gap: 2, alignItems: 'flex-start' }}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
    >
      {columns.map(([cmc, cards]) => (
        <div key={cmc} style={{ flex: 1, minWidth: 0, maxWidth: `${100 / minColumns}%` }}>
          <div style={{
            color: T.ink3,
            fontSize: T.fs.t1 - 1,
            fontFamily: T.mono,
            textAlign: 'center',
            marginBottom: 2,
          }}>
            {cmc === 7 ? '7+' : cmc}
          </div>
          <div style={{ position: 'relative' }}>
            {cards.map(({ card, originalIdx }, stackIdx) => {
              const isDragging = dragState?.cardIndex === originalIdx;
              const offset = stackIdx * 22;
              return (
                <div
                  key={`${card.name}-${originalIdx}`}
                  onPointerDown={(e) => handlePointerDown(e, originalIdx)}
                  onMouseEnter={(e) => {
                    // Suppress hover popover while a drag is in progress
                    if (!dragState) onCardEnter(card, e.currentTarget);
                  }}
                  onMouseLeave={onCardLeave}
                  style={{
                    position: stackIdx === 0 ? 'relative' : 'absolute',
                    top: stackIdx === 0 ? 0 : offset,
                    left: 0,
                    right: 0,
                    zIndex: isDragging ? 100 : stackIdx,
                    transform: isDragging ? `translate(${dragState.x}px, ${dragState.y}px)` : undefined,
                    transition: isDragging ? 'none' : 'transform 0.15s',
                    cursor: 'grab',
                    borderRadius: T.radius.m,
                    overflow: 'hidden',
                    border: (diffSet && !diffSet.has(card.name))
                      ? `2px solid ${T.amber}`
                      : `1px solid ${T.line1}`,
                    boxShadow: isDragging ? '0 4px 12px rgba(0,0,0,0.8)' : '0 1px 2px rgba(0,0,0,0.4)',
                  }}
                >
                  <img
                    src={card.image_url}
                    alt={card.name}
                    style={{ width: '100%', display: 'block', pointerEvents: 'none' }}
                    loading="lazy"
                    draggable={false}
                  />
                </div>
              );
            })}
            {/* spacer for absolute positioned cards */}
            {cards.length > 1 && (
              <div style={{ height: (cards.length - 1) * 22 }} />
            )}
          </div>
        </div>
      ))}
      {Array.from({ length: fillerCount }, (_, i) => (
        <div key={`filler-${i}`} style={{ flex: 1, minWidth: 0, maxWidth: `${100 / minColumns}%` }} />
      ))}
    </div>
  );
}

function CardThumbnail({
  card,
  isDifferent,
  onCardEnter,
  onCardLeave,
}: {
  card: RawDraftCard;
  isDifferent: boolean;
  onCardEnter: CardEnterHandler;
  onCardLeave: () => void;
}) {
  return (
    <div
      onMouseEnter={(e) => onCardEnter(card, e.currentTarget)}
      onMouseLeave={onCardLeave}
      style={{
        borderRadius: T.radius.m,
        overflow: 'hidden',
        border: isDifferent ? `2px solid ${T.amber}` : `1px solid ${T.line1}`,
        position: 'relative',
      }}
    >
      <img
        src={card.image_url}
        alt={card.name}
        style={{ width: '100%', display: 'block' }}
        loading="lazy"
      />
      {isDifferent && (
        <div style={{
          position: 'absolute',
          top: 2,
          right: 2,
          width: 6,
          height: 6,
          borderRadius: '50%',
          backgroundColor: T.amber,
        }} />
      )}
    </div>
  );
}
