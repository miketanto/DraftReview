import type { SaveStatus } from '../hooks/useReview';

const STATUS_CONFIG: Record<SaveStatus, { text: string; color: string }> = {
  idle: { text: '', color: 'transparent' },
  saving: { text: 'Saving...', color: '#888' },
  saved: { text: 'Saved', color: '#4CAF50' },
  error: { text: 'Save failed', color: '#f44336' },
};

export function SaveIndicator({ status }: { status: SaveStatus }) {
  const { text, color } = STATUS_CONFIG[status];
  if (!text) return null;

  return (
    <span style={{ color, fontSize: 11, fontFamily: 'monospace' }}>
      {text}
    </span>
  );
}
