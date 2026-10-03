import { useSyncExternalStore } from 'react';
// Keep in sync with @media (max-width: 767px) in src/index.css
const mq = typeof window !== 'undefined' ? window.matchMedia('(max-width: 767px)') : null;
const subscribe = (cb: () => void) => { mq?.addEventListener('change', cb); return () => mq?.removeEventListener('change', cb); };
export function useIsNarrow(): boolean {
  return useSyncExternalStore(subscribe, () => mq?.matches ?? false, () => false);
}
