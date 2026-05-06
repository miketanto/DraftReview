import type { PickSuggestion } from '../../model/types';
import { ARCHETYPE_ABBREV, ARCHETYPE_COLORS } from '../../shared/constants';

interface PickSuggestionPanelProps {
  suggestions: PickSuggestion[];
  pickedCardName: string;
}

function ScoreBar({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 1 }}>
      <span style={{ color: '#666', fontSize: 9, width: 28 }}>{label}</span>
      <div style={{ flex: 1, height: 6, backgroundColor: '#222', borderRadius: 2, overflow: 'hidden' }}>
        <div style={{ width: `${Math.max(value * 100, 0)}%`, height: '100%', backgroundColor: color, opacity: 0.7 }} />
      </div>
    </div>
  );
}

export function PickSuggestionPanel({ suggestions, pickedCardName }: PickSuggestionPanelProps) {
  if (suggestions.length === 0) return null;

  const top3 = suggestions.slice(0, 3);
  const pickedInTop3 = top3.some((s) => s.cardName === pickedCardName);
  const pickedSuggestion = !pickedInTop3
    ? suggestions.find((s) => s.cardName === pickedCardName)
    : null;

  const pickedRank = suggestions.findIndex((s) => s.cardName === pickedCardName) + 1;
  const matchColor = pickedRank === 1 ? '#4CAF50' : pickedRank <= 3 ? '#FFC107' : '#f44336';

  return (
    <div
      style={{
        padding: '8px 12px',
        backgroundColor: '#111',
        borderRadius: 6,
        fontFamily: 'monospace',
        fontSize: 12,
        minWidth: 0,
        border: `1px solid ${matchColor}33`,
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
        <span style={{ color: '#888', fontWeight: 700 }}>SUGGESTED PICKS</span>
        {pickedRank > 0 && (
          <span style={{ color: matchColor, fontSize: 10 }}>
            Picked #{pickedRank}
          </span>
        )}
      </div>

      {top3.map((s, i) => {
        const isPicked = s.cardName === pickedCardName;
        const archColor = ARCHETYPE_COLORS[s.evaluatedArchetype];

        return (
          <div
            key={s.cardName}
            style={{
              marginBottom: 8,
              padding: '4px 6px',
              backgroundColor: isPicked ? '#1a2a1a' : '#0d0d0d',
              borderRadius: 4,
              borderLeft: `3px solid ${isPicked ? '#4CAF50' : archColor}`,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
              <span style={{ color: '#fff', fontWeight: 700, fontSize: 14 }}>
                {i + 1}.
              </span>
              <span style={{ color: isPicked ? '#4CAF50' : '#ddd', flex: 1, fontWeight: isPicked ? 700 : 400 }}>
                {s.cardName}
              </span>
              <span style={{ color: archColor, fontSize: 10 }}>
                {ARCHETYPE_ABBREV[s.evaluatedArchetype]}
              </span>
              <span style={{ color: '#888', fontSize: 10 }}>
                {(s.totalScore * 100).toFixed(0)}
              </span>
            </div>
            <div style={{ color: '#999', fontSize: 10, marginBottom: 3 }}>
              {s.explanation}
            </div>
            <ScoreBar label="GIH" value={s.components.archetypeGihwr} color="#4A90D9" />
            <ScoreBar label="VEL" value={s.components.signalVelocity} color="#4CAF50" />
            <ScoreBar label="FIT" value={s.components.poolFit} color="#FFC107" />
            <ScoreBar label="OPT" value={s.components.optionality} color="#9B8EC1" />
            {s.components.pivotCost > 0.05 && (
              <ScoreBar label="PVT" value={s.components.pivotCost} color="#f44336" />
            )}
          </div>
        );
      })}

      {pickedSuggestion && (
        <div
          style={{
            marginTop: 4,
            padding: '4px 6px',
            backgroundColor: '#1a1515',
            borderRadius: 4,
            borderLeft: '3px solid #f44336',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ color: '#f44336', fontWeight: 700, fontSize: 10 }}>
              YOU PICKED #{pickedSuggestion.rank}
            </span>
            <span style={{ color: '#ddd', flex: 1 }}>
              {pickedSuggestion.cardName}
            </span>
            <span style={{ color: '#888', fontSize: 10 }}>
              {(pickedSuggestion.totalScore * 100).toFixed(0)}
            </span>
          </div>
          <div style={{ color: '#999', fontSize: 10 }}>
            {pickedSuggestion.explanation}
          </div>
        </div>
      )}
    </div>
  );
}
