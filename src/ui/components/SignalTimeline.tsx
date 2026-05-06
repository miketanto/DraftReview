import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import type { ArchetypeId } from '../../shared/types';
import { ARCHETYPES, ARCHETYPE_COLORS } from '../../shared/constants';

interface SignalTimelineProps {
  timeline: Record<ArchetypeId, number[]>;
  totalPicks: number;
}

const ARCHETYPE_ORDER: ArchetypeId[] = [
  'silverquill', 'lorehold', 'prismari', 'quandrix', 'witherbloom', 'converge',
];

export function SignalTimeline({ timeline, totalPicks }: SignalTimelineProps) {
  const data = Array.from({ length: totalPicks }, (_, i) => {
    const pack = Math.floor(i / 14) + 1;
    const pick = (i % 14) + 1;
    const entry: Record<string, number | string> = {
      label: `P${pack}P${pick}`,
    };
    for (const id of ARCHETYPE_ORDER) {
      entry[id] = timeline[id]?.[i] ?? 0;
    }
    return entry;
  });

  return (
    <div style={{ width: '100%', height: 300 }}>
      <ResponsiveContainer>
        <LineChart data={data} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
          <XAxis
            dataKey="label"
            tick={{ fontSize: 9, fill: '#666' }}
            interval={4}
          />
          <YAxis
            tick={{ fontSize: 10, fill: '#666' }}
            domain={[0, 100]}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: '#1a1a1a',
              border: '1px solid #333',
              fontFamily: 'monospace',
              fontSize: 11,
            }}
          />
          <Legend
            wrapperStyle={{ fontFamily: 'monospace', fontSize: 11 }}
          />
          {ARCHETYPE_ORDER.map((id) => (
            <Line
              key={id}
              type="monotone"
              dataKey={id}
              name={ARCHETYPES[id].name}
              stroke={ARCHETYPE_COLORS[id]}
              strokeWidth={2}
              dot={false}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
