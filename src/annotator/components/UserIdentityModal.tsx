import { useState } from 'react';
import { COLLAB_COLORS } from '../hooks/useCollabUser';

interface UserIdentityModalProps {
  onSave: (name: string, color: string) => void;
}

export function UserIdentityModal({ onSave }: UserIdentityModalProps) {
  const [name, setName] = useState('');
  const [color, setColor] = useState(COLLAB_COLORS[0]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim()) onSave(name.trim(), color);
  };

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      backgroundColor: 'rgba(0,0,0,0.7)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
    }}>
      <form
        onSubmit={handleSubmit}
        style={{
          backgroundColor: '#1a1a1a',
          border: '1px solid #333',
          borderRadius: 8,
          padding: 24,
          width: 320,
          fontFamily: 'monospace',
        }}
      >
        <div style={{ color: '#fff', fontSize: 16, marginBottom: 16 }}>
          Choose your identity
        </div>

        <div style={{ marginBottom: 12 }}>
          <label style={{ color: '#888', fontSize: 11, display: 'block', marginBottom: 4 }}>
            Name
          </label>
          <input
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Your name"
            style={{
              width: '100%',
              padding: '8px 10px',
              backgroundColor: '#222',
              color: '#fff',
              border: '1px solid #444',
              borderRadius: 4,
              fontFamily: 'monospace',
              fontSize: 13,
              boxSizing: 'border-box',
            }}
          />
        </div>

        <div style={{ marginBottom: 16 }}>
          <label style={{ color: '#888', fontSize: 11, display: 'block', marginBottom: 6 }}>
            Color
          </label>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {COLLAB_COLORS.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setColor(c)}
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: '50%',
                  backgroundColor: c,
                  border: color === c ? '3px solid #fff' : '3px solid transparent',
                  cursor: 'pointer',
                  padding: 0,
                }}
              />
            ))}
          </div>
        </div>

        <button
          type="submit"
          disabled={!name.trim()}
          style={{
            width: '100%',
            padding: '8px 0',
            backgroundColor: name.trim() ? '#64B5F6' : '#333',
            color: name.trim() ? '#000' : '#666',
            border: 'none',
            borderRadius: 4,
            cursor: name.trim() ? 'pointer' : 'default',
            fontFamily: 'monospace',
            fontSize: 13,
            fontWeight: 700,
          }}
        >
          Join Review
        </button>
      </form>
    </div>
  );
}
