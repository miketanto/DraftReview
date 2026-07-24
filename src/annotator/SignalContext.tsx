import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import type { ReactNode } from 'react';
import type { DraftReview } from './types';
import type { SignalMap, DraftAnalysis } from '../signals/types';
import type { SetConfig } from '../shared/sets';
import { getSetConfig, signalMapUrl } from '../shared/sets';
import { analyzeDraft } from '../signals/signal-engine';
import { rawPicksToDraft } from '../shared/adapters';
import { fetchDraftLog } from '../data/fetcher';

export type SignalStatus = 'loading' | 'ready' | 'unsupported' | 'error';

interface SignalContextValue {
  status: SignalStatus;
  /** Detected 17Lands expansion code (may be set even when unsupported) */
  setCode: string | null;
  config: SetConfig | null;
  signalMap: SignalMap | null;
  analysis: DraftAnalysis | null;
}

const SignalContext = createContext<SignalContextValue>({
  status: 'loading',
  setCode: null,
  config: null,
  signalMap: null,
  analysis: null,
});

// eslint-disable-next-line react-refresh/only-export-components
export function useSignals(): SignalContextValue {
  return useContext(SignalContext);
}

/**
 * Provides the signal layer for a review when its set is registered;
 * resolves to `unsupported` (plain annotator) otherwise.
 *
 * Set detection: stored `review.expansion` when present; legacy reviews
 * re-fetch the draft log once (the 17Lands payload carries `expansion`).
 */
export function SignalProvider({
  review,
  children,
}: {
  review: DraftReview;
  children: ReactNode;
}) {
  const [setCode, setSetCode] = useState<string | null>(
    review.expansion ?? null
  );
  const [detectFailed, setDetectFailed] = useState(false);
  const [signalMap, setSignalMap] = useState<SignalMap | null>(null);
  const [mapError, setMapError] = useState(false);

  // Legacy reviews: detect the set by re-fetching the draft log
  useEffect(() => {
    if (setCode || detectFailed) return;
    let cancelled = false;
    fetchDraftLog(review.draftId)
      .then((log) => {
        if (cancelled) return;
        if (log.expansion) setSetCode(log.expansion);
        else setDetectFailed(true);
      })
      .catch(() => {
        if (!cancelled) setDetectFailed(true);
      });
    return () => {
      cancelled = true;
    };
  }, [setCode, detectFailed, review.draftId]);

  const config = useMemo(() => getSetConfig(setCode), [setCode]);

  // Load the signal map for supported sets
  useEffect(() => {
    if (!config) return;
    let cancelled = false;
    setSignalMap(null);
    setMapError(false);
    fetch(signalMapUrl(config.code))
      .then((res) => {
        if (!res.ok) throw new Error(`signal map ${res.status}`);
        return res.json();
      })
      .then((data) => {
        if (!cancelled) setSignalMap(data);
      })
      .catch(() => {
        if (!cancelled) setMapError(true);
      });
    return () => {
      cancelled = true;
    };
  }, [config]);

  const analysis = useMemo(() => {
    if (!config || !signalMap) return null;
    const draft = rawPicksToDraft(review.draftId, review.draftLog);
    return analyzeDraft(draft, signalMap, config);
  }, [config, signalMap, review.draftId, review.draftLog]);

  let status: SignalStatus;
  if (detectFailed || (setCode && !config)) {
    status = 'unsupported';
  } else if (mapError) {
    status = 'error';
  } else if (config && signalMap && analysis) {
    status = 'ready';
  } else {
    status = 'loading';
  }

  const value = useMemo(
    () => ({ status, setCode, config, signalMap, analysis }),
    [status, setCode, config, signalMap, analysis]
  );

  return (
    <SignalContext.Provider value={value}>{children}</SignalContext.Provider>
  );
}
