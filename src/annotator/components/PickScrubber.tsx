import { T } from '../../shared/theme';

export interface ScrubberCursor {
  color: string;
  name: string;
  index: number;
}

interface PickScrubberProps {
  totalPicks: number;
  /** equals totalPicks when the summary pseudo-pick is current */
  currentIndex: number;
  onJump: (index: number) => void;
  /**
   * Archetype color of the card picked at each index (from the signal
   * layer), or null — neutral cell — when the set has no signal data.
   */
  cellColors: (string | null)[];
  /** index -> colors of everyone with a note on that pick */
  noteTicks: Record<number, string[]>;
  /** live collaborator positions */
  cursors: ScrubberCursor[];
  /** 0-based pack boundaries after which to add a gap (e.g. [14, 28]) */
  packBreaks: number[];
}

/**
 * The draft's color story as a clickable timeline: one archetype-colored
 * cell per pick, note-density ticks below, live cursor carets above, and
 * a Σ summary cell at the end. Doubles as jump navigation.
 */
export function PickScrubber({
  totalPicks,
  currentIndex,
  onJump,
  cellColors,
  noteTicks,
  cursors,
  packBreaks,
}: PickScrubberProps) {
  const cells = [];
  for (let i = 0; i < totalPicks; i++) {
    const color = cellColors[i] ?? null;
    const isCurrent = i === currentIndex;
    const ticks = noteTicks[i] ?? [];
    const cellCursors = cursors.filter((c) => c.index === i);
    cells.push(
      <div
        key={i}
        onClick={() => onJump(i)}
        title={`P${Math.floor(i / 14) + 1}P${(i % 14) + 1}`}
        style={{
          flex: 1,
          minWidth: 0,
          height: 14,
          borderRadius: T.radius.s,
          backgroundColor: color ?? T.bg2,
          border: color ? '1px solid transparent' : `1px solid ${T.line0}`,
          opacity: color && !isCurrent ? 0.75 : 1,
          outline: isCurrent ? `2px solid ${T.ink0}` : 'none',
          outlineOffset: 1,
          cursor: 'pointer',
          position: 'relative',
          marginRight: packBreaks.includes(i) ? 8 : 0,
          transition: `opacity ${T.fast} ${T.ease}`,
        }}
      >
        {cellCursors.map((c, ci) => (
          <span
            key={ci}
            title={c.name}
            style={{
              position: 'absolute',
              top: -9,
              left: '50%',
              transform: 'translateX(-50%)',
              fontSize: 8,
              lineHeight: 1,
              color: c.color,
            }}
          >
            ▼
          </span>
        ))}
        {ticks.length > 0 && (
          <span
            style={{
              position: 'absolute',
              bottom: -6,
              left: '20%',
              right: '20%',
              display: 'flex',
              gap: 1,
              justifyContent: 'center',
            }}
          >
            {ticks.slice(0, 3).map((tc, ti) => (
              <span
                key={ti}
                style={{
                  width: 4,
                  height: 3,
                  borderRadius: 1,
                  backgroundColor: tc,
                }}
              />
            ))}
          </span>
        )}
      </div>
    );
  }

  const summaryActive = currentIndex >= totalPicks;

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        padding: '10px 0 8px',
      }}
    >
      <button
        onClick={() => onJump(Math.max(0, currentIndex - 1))}
        disabled={currentIndex <= 0}
        style={keycapStyle(currentIndex <= 0)}
      >
        ← Prev
      </button>
      <div style={{ flex: 1, display: 'flex', gap: 2, alignItems: 'center' }}>
        {cells}
        <div
          onClick={() => onJump(totalPicks)}
          title="Draft summary"
          style={{
            width: 22,
            height: 14,
            marginLeft: 8,
            borderRadius: T.radius.s,
            backgroundColor: T.bg2,
            border: `1px solid ${summaryActive ? T.ink0 : T.gold}`,
            outline: summaryActive ? `2px solid ${T.ink0}` : 'none',
            outlineOffset: 1,
            color: T.gold,
            fontSize: 9,
            fontWeight: 700,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            flexShrink: 0,
          }}
        >
          Σ
        </div>
      </div>
      <button
        onClick={() => onJump(Math.min(totalPicks, currentIndex + 1))}
        disabled={currentIndex >= totalPicks}
        style={keycapStyle(currentIndex >= totalPicks)}
      >
        Next →
      </button>
    </div>
  );
}

function keycapStyle(disabled: boolean): React.CSSProperties {
  return {
    fontFamily: T.mono,
    fontSize: T.fs.t1,
    fontWeight: 600,
    letterSpacing: '0.08em',
    textTransform: 'uppercase',
    backgroundColor: T.bg3,
    border: `1px solid ${T.line1}`,
    borderBottom: `2px solid ${T.line2}`,
    borderRadius: T.radius.m,
    color: disabled ? T.ink3 : T.ink1,
    padding: '4px 10px',
    cursor: disabled ? 'default' : 'pointer',
    flexShrink: 0,
  };
}
