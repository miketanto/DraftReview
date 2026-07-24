import { T } from '../../shared/theme';

export interface ToastState {
  message: string;
  actionLabel?: string;
  onAction?: () => void;
}

/**
 * Single bottom-center toast. Owner keeps the state (with its own
 * auto-dismiss timer); this is purely presentational.
 */
export function Toast({ toast }: { toast: ToastState | null }) {
  if (!toast) return null;
  return (
    <div
      style={{
        position: 'fixed',
        bottom: 24,
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 1100,
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        padding: '8px 14px',
        backgroundColor: T.bg3,
        border: `1px solid ${T.line2}`,
        borderRadius: T.radius.m,
        boxShadow: '0 8px 24px rgba(0,0,0,0.6)',
        fontFamily: T.mono,
        fontSize: T.fs.t2,
        color: T.ink0,
        fontWeight: 600,
        letterSpacing: '0.04em',
      }}
    >
      {toast.message}
      {toast.actionLabel && toast.onAction && (
        <button
          onClick={toast.onAction}
          style={{
            padding: '3px 10px',
            backgroundColor: 'transparent',
            color: T.sel,
            border: `1px solid ${T.sel}`,
            borderRadius: T.radius.s,
            cursor: 'pointer',
            fontFamily: T.mono,
            fontSize: T.fs.t1,
            fontWeight: 700,
            letterSpacing: '0.08em',
          }}
        >
          {toast.actionLabel}
        </button>
      )}
    </div>
  );
}
