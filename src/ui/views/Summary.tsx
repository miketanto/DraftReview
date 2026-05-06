import type { DraftSummary } from '../../signals/types';
import { ARCHETYPES, ARCHETYPE_COLORS } from '../../shared/constants';
import { SignalTimeline } from '../components/SignalTimeline';

interface SummaryProps {
  summary: DraftSummary;
  totalPicks: number;
}

export function Summary({ summary, totalPicks }: SummaryProps) {
  const mostOpen = ARCHETYPES[summary.mostOpenArchetype];
  const userArch = ARCHETYPES[summary.userArchetype];
  const match = summary.mostOpenArchetype === summary.userArchetype;

  return (
    <div
      style={{
        fontFamily: 'monospace',
        color: '#ccc',
        padding: 12,
      }}
    >
      <div
        style={{
          backgroundColor: '#111',
          borderRadius: 6,
          padding: 16,
          marginBottom: 12,
        }}
      >
        <h2 style={{ color: '#fff', margin: '0 0 12px', fontSize: 16 }}>
          DRAFT SIGNAL SUMMARY
        </h2>

        <div style={{ display: 'flex', gap: 32, marginBottom: 12 }}>
          <div>
            <div style={{ color: '#888', fontSize: 11 }}>Most Open Archetype</div>
            <div
              style={{
                color: ARCHETYPE_COLORS[summary.mostOpenArchetype],
                fontSize: 18,
                fontWeight: 700,
              }}
            >
              {mostOpen.name} ({mostOpen.colors})
            </div>
          </div>
          <div>
            <div style={{ color: '#888', fontSize: 11 }}>Your Archetype</div>
            <div
              style={{
                color: ARCHETYPE_COLORS[summary.userArchetype],
                fontSize: 18,
                fontWeight: 700,
              }}
            >
              {userArch.name} ({userArch.colors})
            </div>
          </div>
          <div>
            <div style={{ color: '#888', fontSize: 11 }}>Match</div>
            <div
              style={{
                color: match ? '#4CAF50' : '#f44336',
                fontSize: 18,
                fontWeight: 700,
              }}
            >
              {match ? 'YES' : 'NO'}
            </div>
          </div>
        </div>
      </div>

      <div
        style={{
          backgroundColor: '#111',
          borderRadius: 6,
          padding: 16,
          marginBottom: 12,
        }}
      >
        <h3 style={{ color: '#fff', margin: '0 0 8px', fontSize: 14 }}>
          Signal Strength Over Time
        </h3>
        <SignalTimeline timeline={summary.signalTimeline} totalPicks={totalPicks} />
      </div>

      {summary.pivotPoints.length > 0 && (
        <div
          style={{
            backgroundColor: '#111',
            borderRadius: 6,
            padding: 16,
            marginBottom: 12,
          }}
        >
          <h3 style={{ color: '#fff', margin: '0 0 8px', fontSize: 14 }}>
            Pivot Points
          </h3>
          {summary.pivotPoints.map((p, i) => (
            <div key={i} style={{ marginBottom: 6 }}>
              <span style={{ color: '#FFD700', fontWeight: 700 }}>
                P{p.packNumber}P{p.pickNumber}:
              </span>{' '}
              {p.reason}
            </div>
          ))}
        </div>
      )}

      {summary.missedSignals.length > 0 && (
        <div
          style={{
            backgroundColor: '#111',
            borderRadius: 6,
            padding: 16,
          }}
        >
          <h3 style={{ color: '#fff', margin: '0 0 8px', fontSize: 14 }}>
            Key Missed Signals
          </h3>
          {summary.missedSignals.map((m, i) => (
            <div key={i} style={{ marginBottom: 6 }}>
              <span style={{ color: '#f44336', fontWeight: 700 }}>
                P{m.packNumber}P{m.pickNumber}:
              </span>{' '}
              <span style={{ color: '#fff' }}>{m.cardName}</span>{' '}
              <span style={{ color: '#888' }}>
                ({ARCHETYPES[m.archetype].name}) — {m.explanation}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
