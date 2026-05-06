import { useState, useEffect } from 'react';
import type { SignalMap } from '../../signals/types';

export function useSignalMap(): {
  signalMap: SignalMap | null;
  loading: boolean;
  error: string | null;
} {
  const [signalMap, setSignalMap] = useState<SignalMap | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch('/data/sos_signal_map.json')
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
  }, []);

  return { signalMap, loading, error };
}
