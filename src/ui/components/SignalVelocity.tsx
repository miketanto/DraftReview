import type { VelocityMetrics } from '../../model/types';
import { ARCHETYPE_ABBREV, ARCHETYPE_COLORS } from '../../shared/constants';

interface SignalVelocityProps {
  metrics: VelocityMetrics;
}

const ARROW: Record<string, string> = { up: '▲', down: '▼', flat: '–' };
const ARROW_COLOR: Record<string, string> = { up: '#4CAF50', down: '#f44336', flat: '#666' };

export function SignalVelocity({ metrics }: SignalVelocityProps) {
  const maxWindowed = Math.max(...Object.values(metrics.windowedScores), 0.001);

  return (
    <div
      style={{
        padding: '8px 12px',
        backgroundColor: '#111',
        borderRadius: 6,
        fontFamily: 'monospace',
        fontSize: 12,
        minWidth: 0,
      }}
    >
      <div style={{ color: '#888', marginBottom: 6, fontWeight: 700 }}>
        SIGNAL VELOCITY
      </div>
      {metrics.trending.map(({ archetype, velocity: _velocity, direction }) => {
        const color = ARCHETYPE_COLORS[archetype];
        const windowed = metrics.windowedScores[archetype];
        const barWidth = (windowed / maxWindowed) * 100;
        const dir = metrics.directionSignals[archetype];
        const isDual = metrics.dualConfirmed.includes(archetype);

        return (
          <div
            key={archetype}
            style={{
              display: 'flex',
              alignItems: 'center',
              marginBottom: 4,
              gap: 4,
            }}
          >
            <span style={{ color, width: 24, fontWeight: 700 }}>
              {ARCHETYPE_ABBREV[archetype]}
            </span>
            <span
              style={{
                color: ARROW_COLOR[direction],
                width: 14,
                fontWeight: 700,
                fontSize: 10,
              }}
            >
              {ARROW[direction]}
            </span>
            <div
              style={{
                flex: 1,
                height: 14,
                backgroundColor: '#222',
                borderRadius: 2,
                overflow: 'hidden',
              }}
            >
              <div
                style={{
                  width: `${barWidth}%`,
                  height: '100%',
                  backgroundColor: color,
                  opacity: 0.6,
                  transition: 'width 0.3s',
                }}
              />
            </div>
            <span
              style={{
                color: '#666',
                fontSize: 10,
                width: 26,
                textAlign: 'center',
              }}
            >
              {dir.left > 0 && dir.right > 0
                ? 'LR'
                : dir.left > 0
                  ? 'L'
                  : dir.right > 0
                    ? 'R'
                    : ''}
            </span>
            {isDual && (
              <span style={{ color: '#FFD700', fontSize: 9, fontWeight: 700 }}>
                ✓
              </span>
            )}
          </div>
        );
      })}
      {metrics.dualConfirmed.length > 0 && (
        <div style={{ color: '#FFD700', marginTop: 6, fontSize: 10 }}>
          Dual-confirmed: {metrics.dualConfirmed.map((a) => ARCHETYPE_ABBREV[a]).join(', ')}
        </div>
      )}
    </div>
  );
}
