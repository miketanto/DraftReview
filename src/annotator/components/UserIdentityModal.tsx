import { useState } from 'react';
import { COLLAB_COLORS } from '../hooks/useCollabUser';
import { T, label } from '../../shared/theme';

interface UserIdentityModalProps {
  onSave: (name: string, color: string) => void;
  /** Browse-first: dismiss without joining. */
  onCancel?: () => void;
}

export function UserIdentityModal({ onSave, onCancel }: UserIdentityModalProps) {
  const [name, setName] = useState('');
  const [color, setColor] = useState(COLLAB_COLORS[0]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim()) onSave(name.trim(), color);
  };

  return (
    <div
      onClick={onCancel}
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0,0,0,0.7)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
      }}
    >
      <form
        onSubmit={handleSubmit}
        onClick={(e) => e.stopPropagation()}
        className="glass"
        style={{
          border: `1px solid ${T.line1}`,
          borderRadius: T.radius.l,
          padding: 20,
          width: 330,
          fontFamily: T.mono,
          boxShadow: '0 16px 48px rgba(0,0,0,0.7)',
        }}
      >
        <div style={{ color: T.ink0, fontSize: T.fs.t5, fontWeight: 700, marginBottom: 4 }}>
          Join this review
        </div>
        <div style={{ color: T.ink2, fontSize: T.fs.t2, marginBottom: 14, lineHeight: 1.45 }}>
          Your notes go in your own colored layer — the creator's review is
          never overwritten.
        </div>

        <div style={{ marginBottom: 12 }}>
          <label style={{ ...label, display: 'block', marginBottom: 4 }}>Name</label>
          <input
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Your name"
            style={{
              width: '100%',
              padding: '8px 10px',
              backgroundColor: T.bg3,
              color: T.ink0,
              border: `1px solid ${T.line1}`,
              borderRadius: T.radius.m,
              fontFamily: T.mono,
              fontSize: T.fs.t4,
            }}
          />
        </div>

        <div style={{ marginBottom: 16 }}>
          <label style={{ ...label, display: 'block', marginBottom: 6 }}>Layer color</label>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {COLLAB_COLORS.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setColor(c)}
                aria-label={`color ${c}`}
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: '50%',
                  backgroundColor: c,
                  border: color === c ? `3px solid ${T.ink0}` : '3px solid transparent',
                  cursor: 'pointer',
                  padding: 0,
                }}
              />
            ))}
          </div>
        </div>

        <div style={{ display: 'flex', gap: 8 }}>
          <button
            type="submit"
            disabled={!name.trim()}
            style={{
              flex: 1,
              padding: '8px 0',
              backgroundColor: name.trim() ? T.sel : T.bg3,
              color: name.trim() ? '#00121F' : T.ink3,
              border: 'none',
              borderRadius: T.radius.m,
              cursor: name.trim() ? 'pointer' : 'default',
              fontFamily: T.mono,
              fontSize: T.fs.t3,
              fontWeight: 700,
              letterSpacing: '0.06em',
            }}
          >
            JOIN
          </button>
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              style={{
                padding: '8px 14px',
                backgroundColor: 'transparent',
                color: T.ink2,
                border: `1px solid ${T.line1}`,
                borderRadius: T.radius.m,
                cursor: 'pointer',
                fontFamily: T.mono,
                fontSize: T.fs.t3,
              }}
            >
              Just browse
            </button>
          )}
        </div>
      </form>
    </div>
  );
}
