import { useState } from 'react';
import type { Timeline } from '../types';
import { v4 as uuid } from 'uuid';
import { T } from '../../shared/theme';

interface TimelineSwitcherProps {
  timelines: Timeline[];
  activeTimelineId: string | null;
  isEditable: boolean;
  onSwitch: (id: string | null) => void;
  onTimelinesChange: (timelines: Timeline[]) => void;
}

export function TimelineSwitcher({
  timelines,
  activeTimelineId,
  isEditable,
  onSwitch,
  onTimelinesChange,
}: TimelineSwitcherProps) {
  const [renaming, setRenaming] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');

  const createTimeline = () => {
    const newTimeline: Timeline = {
      id: uuid(),
      name: `What-if ${timelines.length + 1}`,
      divergences: [],
    };
    const updated = [...timelines, newTimeline];
    onTimelinesChange(updated);
    onSwitch(newTimeline.id);
  };

  const deleteTimeline = (id: string) => {
    onTimelinesChange(timelines.filter((t) => t.id !== id));
    if (activeTimelineId === id) onSwitch(null);
  };

  const startRename = (t: Timeline) => {
    setRenaming(t.id);
    setRenameValue(t.name);
  };

  const commitRename = () => {
    if (renaming && renameValue.trim()) {
      onTimelinesChange(
        timelines.map((t) => t.id === renaming ? { ...t, name: renameValue.trim() } : t),
      );
    }
    setRenaming(null);
  };

  const tabStyle = (active: boolean): React.CSSProperties => ({
    padding: '5px 12px',
    border: 'none',
    borderBottom: active ? `2px solid ${T.amber}` : '2px solid transparent',
    backgroundColor: 'transparent',
    color: active ? T.amber : T.ink2,
    cursor: 'pointer',
    fontFamily: T.mono,
    fontSize: T.fs.t3,
    fontWeight: active ? 700 : 400,
    transition: `color ${T.fast} ${T.ease}, border-color ${T.fast} ${T.ease}`,
  });

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
      <button
        style={tabStyle(activeTimelineId === null)}
        onClick={() => onSwitch(null)}
      >
        Actual
      </button>

      {timelines.map((t) => (
        <div key={t.id} style={{ display: 'flex', alignItems: 'center' }}>
          {renaming === t.id ? (
            <input
              autoFocus
              value={renameValue}
              onChange={(e) => setRenameValue(e.target.value)}
              onBlur={commitRename}
              onKeyDown={(e) => { if (e.key === 'Enter') commitRename(); }}
              style={{
                padding: '4px 8px',
                backgroundColor: T.bg3,
                color: T.ink0,
                border: `1px solid ${T.amber}`,
                borderRadius: T.radius.m,
                fontFamily: T.mono,
                fontSize: T.fs.t3,
                width: 120,
                outline: 'none',
                boxShadow: T.amberGlow,
              }}
            />
          ) : (
            <button
              style={tabStyle(activeTimelineId === t.id)}
              onClick={() => onSwitch(t.id)}
              onDoubleClick={() => isEditable && startRename(t)}
            >
              {t.name}
              {activeTimelineId === t.id && t.divergences.length > 0 && (
                <span style={{ marginLeft: 4, color: T.ink1, fontSize: T.fs.t1 }}>
                  ({t.divergences.length})
                </span>
              )}
            </button>
          )}
          {isEditable && activeTimelineId === t.id && (
            <button
              onClick={() => deleteTimeline(t.id)}
              style={{
                marginLeft: 2,
                padding: '2px 5px',
                backgroundColor: 'transparent',
                color: T.ink2,
                border: 'none',
                cursor: 'pointer',
                fontSize: 14,
                lineHeight: 1,
                transition: `color ${T.fast} ${T.ease}`,
              }}
              onMouseEnter={(e) => { e.currentTarget.style.color = T.danger; }}
              onMouseLeave={(e) => { e.currentTarget.style.color = T.ink2; }}
              title="Delete timeline"
            >
              x
            </button>
          )}
        </div>
      ))}

      {isEditable && (
        <button
          onClick={createTimeline}
          style={{
            padding: '4px 10px',
            backgroundColor: T.bg3,
            color: T.amber,
            border: `1px solid ${T.line1}`,
            borderBottom: `1px solid ${T.line2}`,
            borderRadius: T.radius.m,
            cursor: 'pointer',
            fontFamily: T.mono,
            fontSize: T.fs.t1,
            fontWeight: 600,
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            marginLeft: 4,
            transition: `border-color ${T.fast} ${T.ease}, background-color ${T.fast} ${T.ease}`,
          }}
          onMouseEnter={(e) => { e.currentTarget.style.borderColor = T.line2; }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = T.line1;
            e.currentTarget.style.borderBottomColor = T.line2;
          }}
        >
          + Timeline
        </button>
      )}
    </div>
  );
}
