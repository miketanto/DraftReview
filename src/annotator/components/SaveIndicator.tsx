import type { SaveStatus } from '../hooks/useReview';
import { T } from '../../shared/theme';

const STATUS_CONFIG: Record<SaveStatus, { text: string; color: string }> = {
  idle: { text: '', color: 'transparent' },
  saving: { text: 'Saving...', color: T.ink2 },
  saved: { text: 'Saved', color: T.picked },
  error: { text: 'Save failed', color: T.danger },
};

export function SaveIndicator({ status }: { status: SaveStatus }) {
  const { text, color } = STATUS_CONFIG[status];
  if (!text) return null;

  return (
    <span
      style={{
        color,
        fontSize: T.fs.t2,
        fontFamily: T.mono,
        transition: `color ${T.fast} ${T.ease}`,
      }}
    >
      {text}
    </span>
  );
}
