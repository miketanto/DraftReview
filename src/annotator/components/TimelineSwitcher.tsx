import { useState } from 'react';
import type { Timeline } from '../types';
import { v4 as uuid } from 'uuid';

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
    borderBottom: active ? '2px solid #64B5F6' : '2px solid transparent',
    backgroundColor: 'transparent',
    color: active ? '#64B5F6' : '#888',
    cursor: 'pointer',
    fontFamily: 'monospace',
    fontSize: 12,
    fontWeight: active ? 700 : 400,
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
                backgroundColor: '#222',
                color: '#fff',
                border: '1px solid #64B5F6',
                borderRadius: 3,
                fontFamily: 'monospace',
                fontSize: 12,
                width: 120,
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
                <span style={{ marginLeft: 4, color: '#aaa', fontSize: 10 }}>
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
                color: '#666',
                border: 'none',
                cursor: 'pointer',
                fontSize: 14,
                lineHeight: 1,
              }}
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
            backgroundColor: '#222',
            color: '#64B5F6',
            border: '1px solid #333',
            borderRadius: 4,
            cursor: 'pointer',
            fontFamily: 'monospace',
            fontSize: 11,
            marginLeft: 4,
          }}
        >
          + Timeline
        </button>
      )}
    </div>
  );
}
