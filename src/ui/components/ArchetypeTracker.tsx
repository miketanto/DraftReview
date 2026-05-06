import type { ArchetypeScore } from '../../signals/types';
import type { ArchetypePosterior } from '../../model/types';
import { ARCHETYPES, ARCHETYPE_ABBREV, ARCHETYPE_COLORS } from '../../shared/constants';

interface ArchetypeTrackerProps {
  scores: ArchetypeScore[];
  convergeViability: number;
  posterior?: ArchetypePosterior | null;
}

function commitmentLabel(entropy: number): { text: string; color: string } {
  const maxEntropy = Math.log(6);
  const ratio = entropy / maxEntropy;
  if (ratio > 0.8) return { text: 'EXPLORING', color: '#FFC107' };
  if (ratio > 0.4) return { text: 'COMMITTED', color: '#4CAF50' };
  return { text: 'LOCKED', color: '#4A90D9' };
}

export function ArchetypeTracker({ scores, convergeViability, posterior }: ArchetypeTrackerProps) {
  const sorted = [...scores].sort(
    (a, b) => b.cumulativeSignal - a.cumulativeSignal
  );
  const strongestId = sorted[0]?.archetypeId;

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
        ARCHETYPE OPENNESS
      </div>
      {sorted.map((score) => {
        const id = score.archetypeId;
        const color = ARCHETYPE_COLORS[id];
        const isStrongest = id === strongestId;

        return (
          <div
            key={id}
            style={{
              display: 'flex',
              alignItems: 'center',
              marginBottom: 4,
              gap: 6,
            }}
          >
            <span style={{ color, width: 24, fontWeight: 700 }}>
              {ARCHETYPE_ABBREV[id]}
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
                  width: `${score.normalizedScore}%`,
                  height: '100%',
                  backgroundColor: color,
                  opacity: 0.7,
                  transition: 'width 0.3s',
                }}
              />
            </div>
            <span style={{ color: '#aaa', width: 36, textAlign: 'right' }}>
              {score.normalizedScore.toFixed(0)}%
            </span>
            {isStrongest && (
              <span style={{ color: '#4CAF50', fontSize: 10, fontWeight: 700 }}>
                TOP
              </span>
            )}
          </div>
        );
      })}
      {convergeViability > 0.3 && (
        <div style={{ color: '#D4A843', marginTop: 8, fontSize: 11 }}>
          Converge viability: {(convergeViability * 100).toFixed(0)}%
        </div>
      )}

      {posterior && (
        <div style={{ marginTop: 10, borderTop: '1px solid #333', paddingTop: 8 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
            <span style={{ color: '#888', fontWeight: 700, fontSize: 11 }}>
              INFERENCE
            </span>
            <span style={{ color: commitmentLabel(posterior.entropy).color, fontSize: 10, fontWeight: 700 }}>
              {commitmentLabel(posterior.entropy).text}
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
            <span style={{ color: ARCHETYPE_COLORS[posterior.mapArchetype], fontWeight: 700 }}>
              {ARCHETYPES[posterior.mapArchetype].name}
            </span>
            <span style={{ color: '#aaa', fontSize: 10 }}>
              {(posterior.confidence * 100).toFixed(0)}%
            </span>
          </div>

          {/* Probability bars */}
          {Object.entries(posterior.probabilities)
            .sort(([, a], [, b]) => b - a)
            .map(([arch, prob]) => (
              <div
                key={arch}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  marginBottom: 2,
                  gap: 4,
                }}
              >
                <span
                  style={{
                    color: ARCHETYPE_COLORS[arch as keyof typeof ARCHETYPE_COLORS],
                    width: 24,
                    fontSize: 10,
                  }}
                >
                  {ARCHETYPE_ABBREV[arch as keyof typeof ARCHETYPE_ABBREV]}
                </span>
                <div
                  style={{
                    flex: 1,
                    height: 8,
                    backgroundColor: '#222',
                    borderRadius: 2,
                    overflow: 'hidden',
                  }}
                >
                  <div
                    style={{
                      width: `${prob * 100}%`,
                      height: '100%',
                      backgroundColor: ARCHETYPE_COLORS[arch as keyof typeof ARCHETYPE_COLORS],
                      opacity: 0.5,
                      transition: 'width 0.3s',
                    }}
                  />
                </div>
                <span style={{ color: '#666', fontSize: 9, width: 28, textAlign: 'right' }}>
                  {(prob * 100).toFixed(0)}%
                </span>
              </div>
            ))}

          {posterior.pivotCandidate && (
            <div
              style={{
                marginTop: 6,
                padding: '3px 6px',
                backgroundColor: '#2a2200',
                borderRadius: 3,
                color: '#FFC107',
                fontSize: 10,
              }}
            >
              PIVOT? Consider {ARCHETYPES[posterior.pivotCandidate].name}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
