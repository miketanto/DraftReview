import type { ArchetypeId } from '../../shared/types';
import type { SignalTier } from '../../signals/types';
import { ARCHETYPE_ABBREV, ARCHETYPE_COLORS } from '../../shared/constants';

interface SignalBadgeProps {
  archetype: ArchetypeId;
  tier: SignalTier;
  isWheel?: boolean;
}

const DOTS: Record<SignalTier, string> = {
  staple: '●●●',
  strong: '●●',
  moderate: '●',
  weak: '',
  fixing: '◆',
};

export function SignalBadge({ archetype, tier, isWheel }: SignalBadgeProps) {
  const abbrev = ARCHETYPE_ABBREV[archetype];
  const color = ARCHETYPE_COLORS[archetype];
  const dots = DOTS[tier];

  if (!dots && !isWheel) return null;

  return (
    <span
      style={{
        display: 'inline-block',
        padding: '0px 2px',
        margin: '0px',
        borderRadius: 2,
        fontSize: 8,
        fontWeight: 700,
        fontFamily: 'monospace',
        backgroundColor: color + '30',
        color,
        border: isWheel ? `1px solid ${color}` : 'none',
        lineHeight: 1.2,
      }}
    >
      {isWheel && '⟳ '}
      {abbrev} {dots}
    </span>
  );
}
