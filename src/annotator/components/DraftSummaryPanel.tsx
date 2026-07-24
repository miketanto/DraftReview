import { T, label } from '../../shared/theme';
import type { DraftSummary } from '../types';

interface DraftSummaryPanelProps {
  summary: DraftSummary;
  isEditable: boolean;
  onChange: (summary: DraftSummary) => void;
}

export function DraftSummaryPanel({ summary, isEditable, onChange }: DraftSummaryPanelProps) {
  const textareaStyle: React.CSSProperties = {
    width: '100%',
    minHeight: 80,
    padding: 8,
    backgroundColor: T.bg3,
    color: T.ink1,
    border: `1px solid ${T.line1}`,
    borderRadius: T.radius.m,
    fontFamily: T.mono,
    fontSize: T.fs.t4,
    resize: 'vertical',
    boxSizing: 'border-box',
  };

  return (
    <div
      style={{
        padding: 12,
        fontFamily: T.mono,
        backgroundColor: T.bg1,
        border: `1px solid ${T.line0}`,
        borderRadius: T.radius.l,
      }}
    >
      <div style={{ ...label, color: T.ink1, marginBottom: 12 }}>
        Draft Summary
      </div>

      <div style={{ marginBottom: 14 }}>
        <div style={{ ...label, marginBottom: 8 }}>
          Rate this draft
        </div>
        <div style={{ display: 'flex', gap: 4 }}>
          {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => {
            const isCurrent = summary.rating === n;
            const isFilled = !!summary.rating && n <= summary.rating;
            return (
              <button
                key={n}
                onClick={() => isEditable && onChange({ ...summary, rating: isCurrent ? null : n })}
                style={{
                  width: 36,
                  height: 36,
                  padding: 0,
                  backgroundColor: isCurrent ? T.sel : isFilled ? 'rgba(77,159,255,0.12)' : T.bg2,
                  color: isCurrent ? T.bg0 : isFilled ? T.sel : T.ink3,
                  border: `1px solid ${isCurrent ? T.sel : isFilled ? 'rgba(77,159,255,0.45)' : T.line1}`,
                  borderRadius: T.radius.m,
                  cursor: isEditable ? 'pointer' : 'default',
                  fontFamily: T.mono,
                  fontSize: T.fs.t4,
                  fontWeight: 700,
                }}
              >
                {n}
              </button>
            );
          })}
          {summary.rating && (
            <span style={{ color: T.sel, fontSize: T.fs.t4, fontWeight: 700, alignSelf: 'center', marginLeft: 8 }}>
              {summary.rating}/10
            </span>
          )}
        </div>
      </div>

      <div style={{ marginBottom: 14 }}>
        <div style={{ ...label, marginBottom: 4 }}>
          Closing thoughts
        </div>
        <textarea
          value={summary.closingThoughts}
          onChange={(e) => onChange({ ...summary, closingThoughts: e.target.value })}
          readOnly={!isEditable}
          placeholder={isEditable ? 'How did this draft go overall? What archetype did you end up in?' : '(no thoughts)'}
          style={textareaStyle}
        />
      </div>

      <div>
        <div style={{ ...label, marginBottom: 4 }}>
          Ways to improve
        </div>
        <textarea
          value={summary.improvements}
          onChange={(e) => onChange({ ...summary, improvements: e.target.value })}
          readOnly={!isEditable}
          placeholder={isEditable ? 'What would you do differently next time? Key mistakes or missed signals?' : '(none)'}
          style={textareaStyle}
        />
      </div>
    </div>
  );
}
