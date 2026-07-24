import type { CollabUser } from '../types';
import { T } from '../../shared/theme';

interface PresenceBarProps {
  users: CollabUser[];
  connected: boolean;
}

export function PresenceBar({ users, connected }: PresenceBarProps) {
  if (!connected && users.length === 0) return null;

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
      <div
        title={connected ? 'Connected' : 'Disconnected'}
        style={{
          width: 6,
          height: 6,
          borderRadius: '50%',
          backgroundColor: connected ? T.picked : T.danger,
          boxShadow: connected
            ? '0 0 5px rgba(63,185,80,0.5)'
            : '0 0 5px rgba(240,82,74,0.5)',
          transition: `background-color ${T.fast} ${T.ease}`,
        }}
      />
      {users.map((u) => (
        <div
          key={u.id}
          title={u.name}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 4,
            padding: '2px 6px',
            backgroundColor: T.bg2,
            border: `1px solid ${u.color}`,
            borderRadius: 10,
            fontSize: T.fs.t1,
            fontFamily: T.mono,
            fontWeight: 600,
            letterSpacing: '0.04em',
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
