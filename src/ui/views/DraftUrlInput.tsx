import { useState } from 'react';

interface DraftUrlInputProps {
  onSubmit: (url: string) => void;
  loading: boolean;
  error: string | null;
}

export function DraftUrlInput({ onSubmit, loading, error }: DraftUrlInputProps) {
  const [url, setUrl] = useState('');

  const isValid = /17lands\.com\/draft\/[a-f0-9]+/.test(url);

  return (
    <div
      style={{
        padding: '16px 12px',
        backgroundColor: '#111',
        borderRadius: 6,
        marginBottom: 8,
        fontFamily: 'monospace',
      }}
    >
      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        <input
          type="text"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="Paste 17Lands draft URL..."
          style={{
            flex: 1,
            padding: '8px 12px',
            backgroundColor: '#222',
            color: '#fff',
            border: '1px solid #333',
            borderRadius: 4,
            fontFamily: 'monospace',
            fontSize: 13,
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && isValid && !loading) onSubmit(url);
          }}
        />
        <button
          onClick={() => onSubmit(url)}
          disabled={!isValid || loading}
          style={{
            padding: '8px 20px',
            backgroundColor: isValid ? '#4CAF50' : '#333',
            color: '#fff',
            border: 'none',
            borderRadius: 4,
            cursor: isValid && !loading ? 'pointer' : 'not-allowed',
            fontFamily: 'monospace',
            fontWeight: 700,
          }}
        >
          {loading ? 'Loading...' : 'Load Draft'}
        </button>
      </div>
      {error && (
        <div style={{ color: '#f44336', marginTop: 6, fontSize: 12 }}>
          {error}
        </div>
      )}
    </div>
  );
}
