import { useState } from 'react';
import type { RawDraftCard } from '../../data/types';

interface PoolComparisonProps {
  actualPool: RawDraftCard[];
  alternatePool: RawDraftCard[] | null;
}

type ViewMode = 'grid' | 'stack';

export function PoolComparison({ actualPool, alternatePool }: PoolComparisonProps) {
  const [viewMode, setViewMode] = useState<ViewMode>('stack');
  const actualNames = new Set(actualPool.map((c) => c.name));
  const altNames = alternatePool ? new Set(alternatePool.map((c) => c.name)) : null;

  const headerStyle: React.CSSProperties = {
    color: '#aaa',
    fontSize: 11,
    fontFamily: 'monospace',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 4,
    padding: '2px 0',
    borderBottom: '1px solid #333',
  };

  const toggleStyle = (active: boolean): React.CSSProperties => ({
    padding: '2px 8px',
    backgroundColor: active ? '#333' : '#222',
    color: active ? '#64B5F6' : '#666',
    border: '1px solid #333',
    borderRadius: 3,
    cursor: 'pointer',
    fontFamily: 'monospace',
    fontSize: 10,
  });

  return (
    <div style={{ padding: '4px 8px' }}>
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
            <GridView pool={actualPool} diffSet={altNames} />
          ) : (
            <StackView pool={actualPool} diffSet={altNames} />
          )}
        </div>
        {alternatePool && (
          <>
            <div style={{ width: 1, backgroundColor: '#333', flexShrink: 0 }} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={headerStyle}>Alternate ({alternatePool.length})</div>
              {viewMode === 'grid' ? (
                <GridView pool={alternatePool} diffSet={actualNames} />
              ) : (
                <StackView pool={alternatePool} diffSet={actualNames} />
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function GridView({ pool, diffSet }: { pool: RawDraftCard[]; diffSet: Set<string> | null }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(8, 1fr)', gap: 2 }}>
      {pool.map((card, i) => (
        <CardThumbnail
          key={`${card.name}-${i}`}
          card={card}
          isDifferent={diffSet ? !diffSet.has(card.name) : false}
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

function StackView({ pool, diffSet }: { pool: RawDraftCard[]; diffSet: Set<string> | null }) {
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
            color: '#555',
            fontSize: 9,
            fontFamily: 'monospace',
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
                  style={{
                    position: stackIdx === 0 ? 'relative' : 'absolute',
                    top: stackIdx === 0 ? 0 : offset,
                    left: 0,
                    right: 0,
                    zIndex: isDragging ? 100 : stackIdx,
                    transform: isDragging ? `translate(${dragState.x}px, ${dragState.y}px)` : undefined,
                    transition: isDragging ? 'none' : 'transform 0.15s',
                    cursor: 'grab',
                    borderRadius: 3,
                    overflow: 'hidden',
                    border: (diffSet && !diffSet.has(card.name))
                      ? '2px solid #ffb74d'
                      : '1px solid #333',
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

function CardThumbnail({ card, isDifferent }: { card: RawDraftCard; isDifferent: boolean }) {
  return (
    <div
      style={{
        borderRadius: 3,
        overflow: 'hidden',
        border: isDifferent ? '2px solid #ffb74d' : '1px solid #333',
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
          backgroundColor: '#ffb74d',
        }} />
      )}
    </div>
  );
}
