import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { extractDraftId, fetchDraftLog } from '../../data/fetcher';
import { createReview } from '../api';

export function CreateReview() {
  const navigate = useNavigate();
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isValid = /17lands\.com\/draft\/[a-f0-9]+/.test(url);

  const handleSubmit = async () => {
    const draftId = extractDraftId(url);
    if (!draftId) {
      setError('Invalid 17Lands URL');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const log = await fetchDraftLog(draftId);
      const { id, editToken } = await createReview(
        draftId,
        log.picks,
        log.expansion
      );
      localStorage.setItem(`review:${id}`, editToken);
      navigate(`/review/${id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create review');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', margin: '0 0 8px' }}>
        <h1 style={{ color: '#fff', fontSize: 18, margin: 0 }}>
          DraftRewind
        </h1>
        <a
          href="https://buymeacoffee.com/miketanto"
          target="_blank"
          rel="noopener noreferrer"
          style={{
            padding: '4px 10px',
            backgroundColor: '#FFDD00',
            color: '#000',
            borderRadius: 4,
            fontFamily: 'monospace',
            fontSize: 11,
            fontWeight: 700,
            textDecoration: 'none',
          }}
        >
          Leave a tip
        </a>
      </div>
      <div
        style={{
          padding: '16px 12px',
          backgroundColor: '#111',
          borderRadius: 6,
          marginBottom: 8,
          fontFamily: 'monospace',
        }}
      >
        <div style={{ color: '#888', fontSize: 12, marginBottom: 8 }}>
          Paste a 17Lands draft URL to create a new annotated review.
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <input
            type="text"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://www.17lands.com/draft/..."
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
              if (e.key === 'Enter' && isValid && !loading) handleSubmit();
            }}
          />
          <button
            onClick={handleSubmit}
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
            {loading ? 'Creating...' : 'Create Review'}
          </button>
        </div>
        {error && (
          <div style={{ color: '#f44336', marginTop: 6, fontSize: 12 }}>
            {error}
          </div>
        )}
        <div style={{ marginTop: 10, fontSize: 11 }}>
          <span style={{ color: '#666' }}>
            Signals (stats, archetype openness, hover data) light up
            automatically for supported sets: SOS, MSH, DSK, OTJ, ECL.
            Other sets work as a plain annotator.
          </span>
        </div>
      </div>
      <div style={{ fontSize: 11 }}>
        <Link to="/signal-review" style={{ color: '#888' }}>
          solo signal scan (no annotations) →
        </Link>
      </div>
    </>
  );
}
