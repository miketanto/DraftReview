import { useMemo } from 'react';
import { useSignals } from '../SignalContext';
import { DraftSummaryPanel } from './DraftSummaryPanel';
import { ARCHETYPES, ARCHETYPE_COLORS, ARCHETYPE_ABBREV } from '../../shared/constants';
import { T, label } from '../../shared/theme';
import type { ArchetypeId, Archetype } from '../../shared/types';
import type { SetConfig } from '../../shared/sets';
import type {
  PickAnalysis,
  PivotPoint,
  DraftSummary as SignalSummaryData,
} from '../../signals/types';
import type { DraftSummary as ReviewSummary } from '../types';

interface SummaryTabProps {
  summary: ReviewSummary;
  isEditable: boolean;
  onChange: (summary: ReviewSummary) => void;
}

/**
 * The Σ destination — verdict, signal timeline, pivots, missed signals,
 * plus the owner's own rating/notes. Set-aware: without signal data it
 * degrades to the notes editor alone.
 */
export function SummaryTab({ summary, isEditable, onChange }: SummaryTabProps) {
  const { status, config, analysis } = useSignals();

  const ready = status === 'ready' && !!analysis && !!config;

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 10,
        maxWidth: 960,
        margin: '0 auto',
        width: '100%',
        padding: '4px 0 12px',
        fontFamily: T.mono,
      }}
    >
      {ready ? (
        <SignalSummary analysis={analysis!.summary} picks={analysis!.picks} config={config!} />
      ) : (
        <div
          style={{
            ...label,
            color: T.ink3,
            border: `1px dashed ${T.line1}`,
            borderRadius: T.radius.m,
            padding: '6px 10px',
          }}
        >
          {status === 'loading'
            ? 'Loading signal analysis…'
            : 'Signal analysis unavailable for this set — annotator summary only'}
        </div>
      )}

      <DraftSummaryPanel summary={summary} isEditable={isEditable} onChange={onChange} />
    </div>
  );
}

function SignalSummary({
  analysis,
  picks,
  config,
}: {
  analysis: SignalSummaryData;
  picks: PickAnalysis[];
  config: SetConfig;
}) {
  const differ = analysis.mostOpenArchetype !== analysis.userArchetype;
  const mostOpen = archetypeOf(analysis.mostOpenArchetype, config);
  const drafted = archetypeOf(analysis.userArchetype, config);

  const topMissed = useMemo(
    () =>
      [...analysis.missedSignals]
        .sort((a, b) => b.signalStrength - a.signalStrength)
        .slice(0, 8),
    [analysis.missedSignals],
  );

  return (
    <>
      {/* VERDICT ROW */}
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
        <VerdictCell heading="MOST OPEN" archetype={mostOpen} />
        <VerdictCell heading="YOU DRAFTED" archetype={drafted} />
      </div>
      {differ && (
        <div
          style={{
            color: T.amber,
            backgroundColor: 'rgba(224,163,59,0.10)',
            border: `1px solid ${T.amber}`,
            borderRadius: T.radius.m,
            padding: '5px 10px',
            fontSize: T.fs.t3,
            fontWeight: 700,
            letterSpacing: '0.04em',
          }}
        >
          The seat was open in {mostOpen.name} — you were in {drafted.name}
        </div>
      )}

      {/* SIGNAL TIMELINE */}
      <Panel title="SIGNAL TIMELINE">
        <TimelineChart
          timeline={analysis.signalTimeline}
          order={config.archetypes.map((a) => a.id)}
          focus={new Set([analysis.mostOpenArchetype, analysis.userArchetype])}
          picks={picks}
          pivots={analysis.pivotPoints}
        />
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 6 }}>
          {config.archetypes.map((a) => {
            const focused =
              a.id === analysis.mostOpenArchetype || a.id === analysis.userArchetype;
            return (
              <span
                key={a.id}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 4,
                  fontSize: T.fs.t1,
                  fontWeight: 600,
                  letterSpacing: '0.06em',
                  color: focused ? T.ink1 : T.ink3,
                }}
              >
                <span
                  style={{
                    width: 10,
                    height: 3,
                    borderRadius: 1,
                    backgroundColor: ARCHETYPE_COLORS[a.id] ?? T.ink2,
                    opacity: focused ? 1 : 0.35,
                  }}
                />
                {ARCHETYPE_ABBREV[a.id] ?? a.id.toUpperCase()}
              </span>
            );
          })}
          {analysis.pivotPoints.length > 0 && (
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 4,
                fontSize: T.fs.t1,
                fontWeight: 600,
                letterSpacing: '0.06em',
                color: T.ink3,
              }}
            >
              <span style={{ color: T.gold, fontSize: 9 }}>◆</span> pivot
            </span>
          )}
        </div>
      </Panel>

      {/* PIVOT POINTS */}
      {analysis.pivotPoints.length > 0 && (
        <Panel title={`PIVOT POINTS · ${analysis.pivotPoints.length}`}>
          {analysis.pivotPoints.map((p, i) => (
            <div
              key={i}
              style={{
                display: 'flex',
                alignItems: 'baseline',
                gap: 8,
                marginBottom: i < analysis.pivotPoints.length - 1 ? 6 : 0,
                fontSize: T.fs.t3,
              }}
            >
              <span style={{ color: T.gold, fontWeight: 700, flexShrink: 0 }}>
                P{p.packNumber}P{p.pickNumber}
              </span>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, flexShrink: 0 }}>
                <ArchChip id={p.fromArchetype} />
                <span style={{ color: T.ink3 }}>→</span>
                <ArchChip id={p.toArchetype} />
              </span>
              <span style={{ color: T.ink1 }}>{p.reason}</span>
            </div>
          ))}
        </Panel>
      )}

      {/* MISSED SIGNALS */}
      {topMissed.length > 0 && (
        <Panel title={`MISSED SIGNALS · TOP ${topMissed.length}`}>
          {topMissed.map((m, i) => (
            <div
              key={i}
              style={{
                display: 'flex',
                alignItems: 'baseline',
                gap: 8,
                marginBottom: i < topMissed.length - 1 ? 6 : 0,
                fontSize: T.fs.t3,
              }}
            >
              <span style={{ color: T.danger, fontWeight: 700, flexShrink: 0 }}>
                P{m.packNumber}P{m.pickNumber}
              </span>
              <span style={{ color: T.ink0, fontWeight: 600, flexShrink: 0 }}>{m.cardName}</span>
              <ArchChip id={m.archetype} />
              <span style={{ color: T.ink2 }}>{m.explanation}</span>
            </div>
          ))}
        </Panel>
      )}
    </>
  );
}

function archetypeOf(id: ArchetypeId, config: SetConfig): Archetype {
  return config.archetypes.find((a) => a.id === id) ?? ARCHETYPES[id];
}

function VerdictCell({ heading, archetype }: { heading: string; archetype: Archetype }) {
  const color = ARCHETYPE_COLORS[archetype.id] ?? T.ink0;
  return (
    <div
      style={{
        flex: 1,
        minWidth: 220,
        backgroundColor: T.bg1,
        border: `1px solid ${T.line0}`,
        borderRadius: T.radius.l,
        padding: 12,
      }}
    >
      <div style={{ ...label, marginBottom: 6 }}>{heading}</div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ color, fontSize: T.fs.t5, fontWeight: 700, letterSpacing: '0.04em' }}>
          {archetype.name.toUpperCase()}
        </span>
        <ArchChip id={archetype.id} />
        <span style={{ display: 'inline-flex', gap: 3 }}>
          {archetype.colors.split('').map((c, i) => (
            <span
              key={i}
              title={c}
              style={{
                width: 11,
                height: 11,
                borderRadius: '50%',
                backgroundColor: T.mana[c] ?? T.ink2,
                border: '1px solid rgba(0,0,0,0.55)',
                display: 'inline-block',
              }}
            />
          ))}
        </span>
      </div>
      <div style={{ color: T.ink2, fontSize: T.fs.t2, marginTop: 5 }}>
        {archetype.mechanic} · {archetype.playstyle}
      </div>
    </div>
  );
}

function ArchChip({ id }: { id: ArchetypeId }) {
  const color = ARCHETYPE_COLORS[id] ?? T.ink1;
  return (
    <span
      style={{
        display: 'inline-block',
        padding: '1px 5px',
        border: `1px solid ${color}`,
        borderRadius: T.radius.s,
        color,
        fontSize: T.fs.t1,
        fontWeight: 700,
        letterSpacing: '0.06em',
        lineHeight: '14px',
        flexShrink: 0,
      }}
    >
      {ARCHETYPE_ABBREV[id] ?? id.toUpperCase()}
    </span>
  );
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div
      style={{
        backgroundColor: T.bg1,
        border: `1px solid ${T.line0}`,
        borderRadius: T.radius.l,
        padding: 12,
      }}
    >
      <div style={{ ...label, marginBottom: 8 }}>{title}</div>
      {children}
    </div>
  );
}

/**
 * Pure-SVG multi-line signal chart. viewBox-scaled to full width, ~180px
 * tall. Focused archetypes (most open + drafted) at full opacity; the
 * field dimmed. Pack boundaries marked; pivots as gold diamonds on the
 * destination archetype's line.
 */
function TimelineChart({
  timeline,
  order,
  focus,
  picks,
  pivots,
}: {
  timeline: Record<ArchetypeId, number[]>;
  order: ArchetypeId[];
  focus: Set<ArchetypeId>;
  picks: PickAnalysis[];
  pivots: PivotPoint[];
}) {
  const n = picks.length;
  const W = 720;
  const H = 180;
  const padL = 30;
  const padR = 10;
  const padT = 10;
  const padB = 20;

  const geometry = useMemo(() => {
    const x = (i: number) =>
      padL + (n > 1 ? (i / (n - 1)) * (W - padL - padR) : 0);
    const y = (v: number) =>
      padT + (1 - Math.max(0, Math.min(100, v)) / 100) * (H - padT - padB);

    // Contiguous pack segments (packNumber is 1-based in analysis)
    const segments: { pack: number; start: number; end: number }[] = [];
    picks.forEach((p, i) => {
      const last = segments[segments.length - 1];
      if (last && last.pack === p.packNumber) last.end = i;
      else segments.push({ pack: p.packNumber, start: i, end: i });
    });

    const pivotMarks = pivots
      .map((p) => {
        const idx = picks.findIndex(
          (pa) => pa.packNumber === p.packNumber && pa.pickNumber === p.pickNumber,
        );
        if (idx < 0) return null;
        const v = timeline[p.toArchetype]?.[idx] ?? 0;
        return { x: x(idx), y: y(v), label: `P${p.packNumber}P${p.pickNumber}` };
      })
      .filter((m): m is { x: number; y: number; label: string } => m !== null);

    return { x, y, segments, pivotMarks };
  }, [n, picks, pivots, timeline]);

  if (n === 0) {
    return <div style={{ ...label, color: T.ink3 }}>No picks to chart</div>;
  }

  const { x, y, segments, pivotMarks } = geometry;

  // Dimmed lines first so the focused pair draws on top
  const drawOrder = [...order].sort(
    (a, b) => Number(focus.has(a)) - Number(focus.has(b)),
  );

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      style={{ width: '100%', height: 'auto', display: 'block' }}
      role="img"
      aria-label="Archetype signal strength per pick"
    >
      {/* Y grid: 0 / 50 / 100 */}
      {[0, 50, 100].map((v) => (
        <g key={v}>
          <line
            x1={padL}
            y1={y(v)}
            x2={W - padR}
            y2={y(v)}
            stroke={T.line0}
            strokeWidth={1}
          />
          <text
            x={padL - 4}
            y={y(v) + 3}
            textAnchor="end"
            fontSize={8}
            fontFamily={T.mono}
            fill={T.ink3}
          >
            {v}
          </text>
        </g>
      ))}

      {/* Pack boundaries + labels */}
      {segments.map((s, i) => (
        <g key={s.pack}>
          {i > 0 && (
            <line
              x1={x(s.start)}
              y1={padT}
              x2={x(s.start)}
              y2={H - padB}
              stroke={T.line1}
              strokeWidth={1}
              strokeDasharray="3 3"
            />
          )}
          <text
            x={(x(s.start) + x(s.end)) / 2}
            y={H - 6}
            textAnchor="middle"
            fontSize={9}
            fontWeight={700}
            fontFamily={T.mono}
            fill={T.ink2}
            letterSpacing="0.08em"
          >
            P{s.pack}
          </text>
        </g>
      ))}

      {/* Archetype lines */}
      {drawOrder.map((id) => {
        const series = timeline[id];
        if (!series || series.length === 0) return null;
        const focused = focus.has(id);
        const points = series
          .slice(0, n)
          .map((v, i) => `${x(i).toFixed(1)},${y(v).toFixed(1)}`)
          .join(' ');
        return (
          <polyline
            key={id}
            points={points}
            fill="none"
            stroke={ARCHETYPE_COLORS[id] ?? T.ink2}
            strokeWidth={focused ? 2 : 1.25}
            strokeOpacity={focused ? 1 : 0.28}
            strokeLinejoin="round"
            strokeLinecap="round"
          />
        );
      })}

      {/* Pivot diamonds */}
      {pivotMarks.map((m, i) => (
        <path
          key={i}
          d={`M ${m.x} ${m.y - 4.5} L ${m.x + 4.5} ${m.y} L ${m.x} ${m.y + 4.5} L ${m.x - 4.5} ${m.y} Z`}
          fill={T.gold}
          stroke="rgba(0,0,0,0.6)"
          strokeWidth={0.75}
        >
          <title>Pivot at {m.label}</title>
        </path>
      ))}
    </svg>
  );
}
