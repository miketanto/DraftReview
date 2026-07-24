import type { PickAnnotation, AnnotationLayer } from '../types';
import type { RawDraftPick } from '../../data/types';

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
}

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
}: AnnotationPanelProps) {
  const cardNote = selectedCard ? (annotation?.cardNotes[selectedCard] ?? '') : '';
  const cardRank = selectedCard ? (annotation?.cardRanks?.[selectedCard] ?? null) : null;

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
        padding: 8,
        backgroundColor: '#111',
        borderRadius: 6,
        fontFamily: 'monospace',
        fontSize: 12,
        height: '100%',
      }}
    >
      <div>
        <div style={{ color: '#888', marginBottom: 4 }}>
          Pick note — P{pick.pack_number + 1}P{pick.pick_number + 1}
        </div>
        <textarea
          value={annotation?.note ?? ''}
          onChange={(e) => onPickNoteChange(e.target.value)}
          readOnly={!isEditable}
          placeholder={isEditable ? 'What were you thinking here?' : '(no note)'}
          style={{
            width: '100%',
            minHeight: 80,
            padding: 8,
            backgroundColor: '#1a1a1a',
            color: '#ccc',
            border: '1px solid #333',
            borderRadius: 4,
            fontFamily: 'monospace',
            fontSize: 12,
            resize: 'vertical',
            boxSizing: 'border-box',
          }}
        />
      </div>

      <div style={{ flex: 1, minHeight: 0 }}>
        <div style={{ color: '#888', marginBottom: 4 }}>Card notes</div>
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: 2,
            marginBottom: 6,
          }}
        >
          {pick.available.map((card) => {
            const hasNote = !!(annotation?.cardNotes[card.name]);
            const isSelected = selectedCard === card.name;
            const isPicked = card.name === pick.pick.name;
            const rank = annotation?.cardRanks?.[card.name];
            const noteCount = (hasNote ? 1 : 0) + (annotation?.note && isPicked ? 1 : 0);
            return (
              <button
                key={card.name}
                onClick={() => onSelectCard(isSelected ? null : card.name)}
                style={{
                  position: 'relative',
                  padding: '4px 8px',
                  paddingRight: noteCount > 0 || rank ? 22 : 8,
                  backgroundColor: isSelected ? '#333' : '#1a1a1a',
                  color: isPicked ? '#4CAF50' : hasNote ? '#ffb74d' : '#666',
                  border: `1px solid ${isSelected ? '#555' : '#2a2a2a'}`,
                  borderRadius: 4,
                  cursor: 'pointer',
                  fontFamily: 'monospace',
                  fontSize: 12,
                  fontWeight: isPicked ? 700 : 400,
                }}
                title={card.name}
              >
                {rank != null && (
                  <span style={{
                    color: '#64B5F6',
                    marginRight: 3,
                    fontWeight: 700,
                  }}>
                    #{rank}
                  </span>
                )}
                {truncateName(card.name)}
                {noteCount > 0 && (
                  <span style={{
                    position: 'absolute',
                    top: -5,
                    right: -5,
                    minWidth: 18,
                    height: 18,
                    borderRadius: 9,
                    backgroundColor: '#ffb74d',
                    color: '#000',
                    fontSize: 11,
                    fontWeight: 700,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    lineHeight: 1,
                  }}>
                    {noteCount}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {selectedCard && (
          <div>
            <div style={{ color: '#aaa', marginBottom: 6, fontSize: 13, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span>
                {selectedCard}
                {selectedCard === pick.pick.name && (
                  <span style={{ color: '#4CAF50', marginLeft: 6 }}>(picked)</span>
                )}
              </span>
              {isEditable && (
                <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <span style={{ color: '#666', fontSize: 11 }}>Rank</span>
                  {[1, 2, 3, 4, 5].map((r) => (
                    <button
                      key={r}
                      onClick={() => onCardRankChange(selectedCard, cardRank === r ? null : r)}
                      style={{
                        width: 24,
                        height: 24,
                        padding: 0,
                        backgroundColor: cardRank === r ? '#64B5F6' : '#222',
                        color: cardRank === r ? '#000' : '#666',
                        border: `1px solid ${cardRank === r ? '#64B5F6' : '#333'}`,
                        borderRadius: 4,
                        cursor: 'pointer',
                        fontFamily: 'monospace',
                        fontSize: 12,
                        fontWeight: 700,
                      }}
                    >
                      {r}
                    </button>
                  ))}
                </span>
              )}
              {!isEditable && cardRank != null && (
                <span style={{ color: '#64B5F6', fontSize: 12, fontWeight: 700 }}>
                  Rank #{cardRank}
                </span>
              )}
            </div>
            <textarea
              value={cardNote}
              onChange={(e) => onCardNoteChange(selectedCard, e.target.value)}
              readOnly={!isEditable}
              placeholder={isEditable ? 'Note on this card...' : '(no note)'}
              style={{
                width: '100%',
                minHeight: 70,
                padding: 8,
                backgroundColor: '#1a1a1a',
                color: '#ccc',
                border: '1px solid #333',
                borderRadius: 4,
                fontFamily: 'monospace',
                fontSize: 13,
                resize: 'vertical',
                boxSizing: 'border-box',
              }}
            />
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
    <div style={{ borderTop: '1px solid #333', paddingTop: 6, marginTop: 6 }}>
      <div style={{ color: '#666', fontSize: 10, marginBottom: 4, fontFamily: 'monospace' }}>
        Others' notes
      </div>
      {remoteNotes.map((r, i) => (
        <div
          key={i}
          style={{
            marginBottom: 6,
            paddingLeft: 8,
            borderLeft: `3px solid ${r.userColor}`,
          }}
        >
          <div style={{ color: r.userColor, fontSize: 10, fontFamily: 'monospace', marginBottom: 2 }}>
            {r.userName}
          </div>
          {r.note && (
            <div style={{ color: '#aaa', fontSize: 12, fontFamily: 'monospace', marginBottom: 2 }}>
              {r.note}
            </div>
          )}
          {r.cardNote && (
            <div style={{ color: '#888', fontSize: 11, fontFamily: 'monospace', fontStyle: 'italic' }}>
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
