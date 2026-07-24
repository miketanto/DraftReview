import { useState, useEffect } from 'react';
import type { SignalMap } from '../../signals/types';
import { signalMapUrl } from '../../shared/sets';

export function useSignalMap(setCode: string = 'SOS'): {
  signalMap: SignalMap | null;
  loading: boolean;
  error: string | null;
} {
  const [signalMap, setSignalMap] = useState<SignalMap | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    fetch(signalMapUrl(setCode))
      .then((res) => {
        if (!res.ok) throw new Error(`Failed to load signal map: ${res.status}`);
        return res.json();
      })
      .then((data) => {
        setSignalMap(data);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  }, [setCode]);

  return { signalMap, loading, error };
}
