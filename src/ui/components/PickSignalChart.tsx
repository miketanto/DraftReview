import type { PickSignal } from '../../signals/types';
import type { ArchetypeId } from '../../shared/types';
import {
  ARCHETYPE_ABBREV,
  ARCHETYPE_COLORS,
  ARCHETYPES,
} from '../../shared/constants';

const ARCHETYPE_ORDER: ArchetypeId[] = [
  'silverquill',
  'lorehold',
  'prismari',
  'quandrix',
  'witherbloom',
  'converge',
];

interface PickSignalChartProps {
  cardSignals: PickSignal[];
}

export function PickSignalChart({ cardSignals }: PickSignalChartProps) {
  const buckets: Record<ArchetypeId, { strong: number; weak: number }> = {
    silverquill: { strong: 0, weak: 0 },
    lorehold: { strong: 0, weak: 0 },
    prismari: { strong: 0, weak: 0 },
    quandrix: { strong: 0, weak: 0 },
    witherbloom: { strong: 0, weak: 0 },
    converge: { strong: 0, weak: 0 },
  };

  for (const s of cardSignals) {
    const bucket = buckets[s.archetype];
    if (!bucket) continue;
    if (s.tier === 'weak' || s.tier === 'fixing') {
      bucket.weak++;
    } else {
      bucket.strong++;
    }
  }

  const maxCount = Math.max(
    ...ARCHETYPE_ORDER.map((id) => buckets[id].strong + buckets[id].weak),
    1
  );

  const top3 = cardSignals
    .filter((s) => s.tier !== 'fixing')
    .slice(0, 3);

  const BAR_HEIGHT = 70;

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
      <div style={{ color: '#888', marginBottom: 8, fontWeight: 700 }}>
        THIS PICK — SIGNAL DISTRIBUTION
      </div>

      <div
        style={{
          display: 'flex',
          alignItems: 'flex-end',
          gap: 6,
          height: BAR_HEIGHT + 20,
        }}
      >
        {ARCHETYPE_ORDER.map((id) => {
          const { strong, weak } = buckets[id];
          const total = strong + weak;
          const strongPct = total > 0 ? (strong / maxCount) * BAR_HEIGHT : 0;
          const weakPct = total > 0 ? (weak / maxCount) * BAR_HEIGHT : 0;
          const color = ARCHETYPE_COLORS[id];

          return (
            <div
              key={id}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                flex: 1,
              }}
            >
              {total > 0 && (
                <span style={{ color: '#aaa', fontSize: 10, marginBottom: 2 }}>
                  {total}
                </span>
              )}
              <div
                style={{
                  width: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'flex-end',
                  height: BAR_HEIGHT,
                }}
              >
                <div
                  style={{
                    height: strongPct,
                    backgroundColor: color,
                    opacity: 0.9,
                    borderRadius: weakPct > 0 ? '2px 2px 0 0' : 2,
                    transition: 'height 0.3s',
                  }}
                />
                <div
                  style={{
                    height: weakPct,
                    backgroundColor: color,
                    opacity: 0.35,
                    borderRadius: strongPct > 0 ? '0 0 2px 2px' : 2,
                    transition: 'height 0.3s',
                  }}
                />
              </div>
              <span
                style={{
                  color,
                  fontWeight: 700,
                  fontSize: 10,
                  marginTop: 3,
                }}
              >
                {ARCHETYPE_ABBREV[id]}
              </span>
            </div>
          );
        })}
      </div>

      <div
        style={{
          display: 'flex',
          gap: 12,
          marginTop: 6,
          fontSize: 10,
          color: '#666',
          justifyContent: 'center',
        }}
      >
        <span>
          <span
            style={{
              display: 'inline-block',
              width: 8,
              height: 8,
              backgroundColor: '#888',
              opacity: 0.9,
              borderRadius: 1,
              marginRight: 3,
              verticalAlign: 'middle',
            }}
          />
          strong+
        </span>
        <span>
          <span
            style={{
              display: 'inline-block',
              width: 8,
              height: 8,
              backgroundColor: '#888',
              opacity: 0.35,
              borderRadius: 1,
              marginRight: 3,
              verticalAlign: 'middle',
            }}
          />
          weak
        </span>
      </div>

      {top3.length > 0 && (
        <div style={{ marginTop: 10 }}>
          <div style={{ color: '#888', marginBottom: 4, fontWeight: 700 }}>
            TOP SIGNALS
          </div>
          {top3.map((s, i) => (
            <div
              key={s.cardName}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                marginBottom: 3,
                color: '#ccc',
              }}
            >
              <span
                style={{
                  color: ARCHETYPE_COLORS[s.archetype],
                  fontWeight: 700,
                  width: 14,
                }}
              >
                {i + 1}
              </span>
              <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {s.cardName}
              </span>
              <span
                style={{
                  color: ARCHETYPE_COLORS[s.archetype],
                  fontWeight: 700,
                  fontSize: 10,
                }}
              >
                {ARCHETYPE_ABBREV[s.archetype]}
              </span>
              <span style={{ color: '#888', fontSize: 10 }}>
                {s.signalStrength.toFixed(1)}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
