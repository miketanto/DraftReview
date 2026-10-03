import { T, label } from '../../shared/theme';
import type { PackInsight } from '../checkpoints';
import type { PackCheckpointNote } from '../types';

interface PackCheckpointProps {
  insight: PackInsight;
  isLastPack: boolean;
  note: PackCheckpointNote | undefined;
  isEditable: boolean;
  onChange: (note: PackCheckpointNote) => void;
}

/** End-of-pack reflection: color breakdown so far + your own two notes */
export function PackCheckpoint({ insight, isLastPack, note, isEditable, onChange }: PackCheckpointProps) {
  const n = insight.packNumber + 1;
  const value = note ?? { thinking: '', nextPack: '' };
  const textarea: React.CSSProperties = {
    width: '100%', minHeight: 64, padding: 8, backgroundColor: T.bg3, color: T.ink0,
    border: `1px solid ${T.line1}`, borderRadius: T.radius.m, fontFamily: T.mono,
    fontSize: T.fs.t3, lineHeight: 1.45, resize: 'vertical', boxSizing: 'border-box',
  };
  const nextLabel = isLastPack ? 'Takeaway for next draft' : `How I should've tackled pack ${n + 1}`;

  return (
    <div
      style={{
        padding: 10, fontFamily: T.mono, fontSize: T.fs.t3, backgroundColor: T.bg1,
        border: `1px solid ${T.line1}`, borderLeft: `3px solid ${T.ink1}`, borderRadius: T.radius.l,
      }}
    >
      <div style={{ ...label, fontSize: T.fs.t3, color: T.ink0, marginBottom: 8 }}>
        Pack {n} checkpoint
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '4px 10px', marginBottom: 10 }}>
        <span style={label}>Colors so far</span>
        {insight.colorCounts.map(([c, count]) => (
          <span key={c} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, color: T.ink0 }}>
            <span style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: T.mana[c] }} />
            {c} {count}
          </span>
        ))}
      </div>

      <div style={{ ...label, marginBottom: 4 }}>What I was thinking</div>
      <textarea
        value={value.thinking}
        onChange={(e) => onChange({ ...value, thinking: e.target.value })}
        readOnly={!isEditable}
        placeholder={isEditable ? `What was your plan going out of pack ${n}?` : '(no note)'}
        style={{ ...textarea, marginBottom: 8 }}
      />
      <div style={{ ...label, marginBottom: 4 }}>{nextLabel}</div>
      <textarea
        value={value.nextPack}
        onChange={(e) => onChange({ ...value, nextPack: e.target.value })}
        readOnly={!isEditable}
        placeholder={isEditable ? (isLastPack ? 'What will you do differently?' : `Knowing what you know now, how should pack ${n + 1} have gone?`) : '(no note)'}
        style={textarea}
      />
    </div>
  );
}
