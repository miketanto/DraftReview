import type { PoolState } from '../../model/types';

interface PoolStatePanelProps {
  pool: PoolState;
}

const COLOR_DISPLAY: Record<string, { label: string; color: string }> = {
  W: { label: 'W', color: '#F9FAF4' },
  U: { label: 'U', color: '#0E68AB' },
  B: { label: 'B', color: '#A69F9D' },
  R: { label: 'R', color: '#D3202A' },
  G: { label: 'G', color: '#00733E' },
};

function RoleRow({ role, have, target }: { role: string; have: number; target: number }) {
  const met = have >= target;
  const close = have >= target * 0.7;
  const color = met ? '#4CAF50' : close ? '#FFC107' : '#f44336';
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}>
      <span style={{ color: '#aaa', textTransform: 'capitalize' }}>{role}</span>
      <span style={{ color }}>{have}/{Math.round(target)}</span>
    </div>
  );
}

export function PoolStatePanel({ pool }: PoolStatePanelProps) {
  if (pool.pickCount === 0) return null;

  const maxCommitment = Math.max(
    ...Object.values(pool.colorCommitment),
    0.001,
  );

  const maxCurve = Math.max(
    ...Object.values(pool.curve),
    ...pool.curveGaps.map((g) => g.ideal),
    1,
  );

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
        POOL ({pool.pickCount} picks)
      </div>

      {/* Color commitment */}
      <div style={{ marginBottom: 8 }}>
        <div style={{ color: '#666', fontSize: 10, marginBottom: 3 }}>COLORS</div>
        {(['W', 'U', 'B', 'R', 'G'] as const).map((c) => {
          const val = pool.colorCommitment[c];
          if (val < 0.01) return null;
          const info = COLOR_DISPLAY[c];
          const width = (val / maxCommitment) * 100;
          const isPrimary = pool.primaryColors.includes(c);
          return (
            <div
              key={c}
              style={{
                display: 'flex',
                alignItems: 'center',
                marginBottom: 2,
                gap: 4,
              }}
            >
              <span
                style={{
                  color: info.color,
                  width: 14,
                  fontWeight: isPrimary ? 700 : 400,
                }}
              >
                {info.label}
              </span>
              <div
                style={{
                  flex: 1,
                  height: 10,
                  backgroundColor: '#222',
                  borderRadius: 2,
                  overflow: 'hidden',
                }}
              >
                <div
                  style={{
                    width: `${width}%`,
                    height: '100%',
                    backgroundColor: info.color,
                    opacity: isPrimary ? 0.7 : 0.3,
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>

      {/* Curve */}
      <div style={{ marginBottom: 8 }}>
        <div style={{ color: '#666', fontSize: 10, marginBottom: 3 }}>CURVE</div>
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 2, height: 40 }}>
          {[1, 2, 3, 4, 5, 6, 7].map((cmc) => {
            const have = pool.curve[cmc] || 0;
            const gap = pool.curveGaps.find((g) => g.cmc === cmc);
            const idealH = gap ? (gap.ideal / maxCurve) * 36 : 0;
            const haveH = (have / maxCurve) * 36;
            const hasGap = gap && gap.deficit > 0.3;
            return (
              <div key={cmc} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1 }}>
                <div style={{ position: 'relative', width: '100%', height: 36, display: 'flex', alignItems: 'flex-end' }}>
                  {idealH > 0 && (
                    <div
                      style={{
                        position: 'absolute',
                        bottom: 0,
                        width: '100%',
                        height: idealH,
                        border: '1px dashed #444',
                        borderRadius: 1,
                        boxSizing: 'border-box',
                      }}
                    />
                  )}
                  <div
                    style={{
                      width: '100%',
                      height: Math.max(haveH, 1),
                      backgroundColor: hasGap ? '#f44336' : '#4CAF50',
                      opacity: 0.6,
                      borderRadius: 1,
                    }}
                  />
                </div>
                <span style={{ color: '#666', fontSize: 9, marginTop: 1 }}>{cmc === 7 ? '7+' : cmc}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Roles */}
      <div>
        <div style={{ color: '#666', fontSize: 10, marginBottom: 3 }}>ROLES</div>
        <RoleRow role="creatures" have={pool.roles.creatures} target={pool.pickCount * (15 / 23)} />
        <RoleRow role="removal" have={pool.roles.removal} target={pool.pickCount * (4 / 23)} />
        <RoleRow role="draw" have={pool.roles.cardDraw} target={pool.pickCount * (3 / 23)} />
        <RoleRow role="fixing" have={pool.roles.fixing} target={pool.pickCount * (2 / 23)} />
      </div>
    </div>
  );
}
