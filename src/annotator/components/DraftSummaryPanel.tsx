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
    backgroundColor: '#1a1a1a',
    color: '#ccc',
    border: '1px solid #333',
    borderRadius: 4,
    fontFamily: 'monospace',
    fontSize: 13,
    resize: 'vertical',
    boxSizing: 'border-box',
  };

  return (
    <div style={{
      padding: 16,
      fontFamily: 'monospace',
      maxWidth: 700,
      margin: '0 auto',
    }}>
      <h2 style={{ color: '#fff', fontSize: 16, marginBottom: 16 }}>
        Draft Summary
      </h2>

      <div style={{ marginBottom: 16 }}>
        <div style={{ color: '#888', fontSize: 11, marginBottom: 8 }}>
          Rate this draft
        </div>
        <div style={{ display: 'flex', gap: 4 }}>
          {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => (
            <button
              key={n}
              onClick={() => isEditable && onChange({ ...summary, rating: summary.rating === n ? null : n })}
              style={{
                width: 36,
                height: 36,
                padding: 0,
                backgroundColor: summary.rating === n ? '#64B5F6' : summary.rating && n <= summary.rating ? '#2a4a6a' : '#222',
                color: summary.rating === n ? '#000' : summary.rating && n <= summary.rating ? '#64B5F6' : '#555',
                border: `1px solid ${summary.rating && n <= summary.rating! ? '#64B5F6' : '#333'}`,
                borderRadius: 4,
                cursor: isEditable ? 'pointer' : 'default',
                fontFamily: 'monospace',
                fontSize: 14,
                fontWeight: 700,
              }}
            >
              {n}
            </button>
          ))}
          {summary.rating && (
            <span style={{ color: '#64B5F6', fontSize: 14, fontWeight: 700, alignSelf: 'center', marginLeft: 8 }}>
              {summary.rating}/10
            </span>
          )}
        </div>
      </div>

      <div style={{ marginBottom: 16 }}>
        <div style={{ color: '#888', fontSize: 11, marginBottom: 4 }}>
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
        <div style={{ color: '#888', fontSize: 11, marginBottom: 4 }}>
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
