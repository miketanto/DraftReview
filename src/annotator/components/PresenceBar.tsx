import type { CollabUser } from '../types';

interface PresenceBarProps {
  users: CollabUser[];
  connected: boolean;
}

export function PresenceBar({ users, connected }: PresenceBarProps) {
  if (!connected && users.length === 0) return null;

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
      <div style={{
        width: 6,
        height: 6,
        borderRadius: '50%',
        backgroundColor: connected ? '#4CAF50' : '#f44336',
      }} />
      {users.map((u) => (
        <div
          key={u.id}
          title={u.name}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 4,
            padding: '2px 6px',
            backgroundColor: '#222',
            border: `1px solid ${u.color}`,
            borderRadius: 10,
            fontSize: 10,
            fontFamily: 'monospace',
            color: u.color,
          }}
        >
          <div style={{
            width: 8,
            height: 8,
            borderRadius: '50%',
            backgroundColor: u.color,
          }} />
          {u.name}
        </div>
      ))}
    </div>
  );
}
