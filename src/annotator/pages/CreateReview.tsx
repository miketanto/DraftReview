import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { extractDraftId, fetchDraftLog } from '../../data/fetcher';
import { createReview } from '../api';
import { SET_REGISTRY } from '../../shared/sets';
import { T, label } from '../../shared/theme';

export function CreateReview() {
  const navigate = useNavigate();
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isValid = /17lands\.com\/draft\/[a-f0-9]+/.test(url);
  const showHint = url.length > 0 && !isValid;

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

  const supported = Object.keys(SET_REGISTRY).join(', ');

  return (
    <div style={{ maxWidth: 640, margin: '0 auto', paddingTop: '10vh', fontFamily: T.mono }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
        <h1 style={{ color: T.ink0, fontSize: 22, margin: 0, letterSpacing: '0.06em' }}>
          DRAFTREWIND_<span className="dr-cursor" />
        </h1>
        <a
          href="https://buymeacoffee.com/miketanto"
          target="_blank"
          rel="noopener noreferrer"
          style={{
            padding: '4px 10px',
            backgroundColor: '#FFDD00',
            color: '#1A1400',
            border: '1px solid #FFDD00',
            borderBottom: '2px solid #C9AE00',
            borderRadius: T.radius.m,
            fontFamily: T.mono,
            fontSize: T.fs.t1,
            fontWeight: 700,
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            textDecoration: 'none',
          }}
        >
          Leave a tip
        </a>
      </div>
      <div style={{ color: T.ink1, fontSize: T.fs.t4, marginBottom: 24, lineHeight: 1.5 }}>
        Walk through your draft pick by pick with 17Lands signal data —
        annotate it, branch what-if timelines, and review it live with friends.
      </div>

      <div
        style={{
          padding: '16px 14px',
          backgroundColor: T.bg1,
          border: `1px solid ${T.line0}`,
          borderRadius: T.radius.l,
          marginBottom: 12,
          boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.04)',
        }}
      >
        <div style={{ ...label, marginBottom: 8 }}>
          Paste a 17Lands draft URL
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <input
            type="text"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://www.17lands.com/draft/…"
            style={{
              flex: 1,
              padding: '9px 12px',
              backgroundColor: T.bg3,
              color: T.ink0,
              border: `1px solid ${showHint ? T.amber : T.line1}`,
              borderRadius: T.radius.m,
              fontFamily: T.mono,
              fontSize: T.fs.t4,
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && isValid && !loading) handleSubmit();
            }}
          />
          <button
            onClick={handleSubmit}
            disabled={!isValid || loading}
            style={{
              padding: '9px 20px',
              backgroundColor: isValid ? T.picked : T.bg3,
              color: isValid ? '#04120A' : T.ink3,
              border: 'none',
              borderRadius: T.radius.m,
              cursor: isValid && !loading ? 'pointer' : 'not-allowed',
              fontFamily: T.mono,
              fontWeight: 700,
              fontSize: T.fs.t3,
              letterSpacing: '0.06em',
            }}
          >
            {loading ? 'CREATING…' : 'CREATE REVIEW'}
          </button>
        </div>
        {showHint && (
          <div style={{ color: T.amber, marginTop: 6, fontSize: T.fs.t2 }}>
            Expected a 17lands.com/draft/… URL — open a draft on 17Lands and copy the address bar.
          </div>
        )}
        {error && (
          <div style={{ color: T.danger, marginTop: 6, fontSize: T.fs.t2 }}>
            {error}
          </div>
        )}
        <div style={{ marginTop: 12, fontSize: T.fs.t2, color: T.ink2, lineHeight: 1.5 }}>
          Signals (stats, archetype openness, hover data) light up
          automatically for supported sets: {supported}. Any other set works
          as a plain annotator.
        </div>
      </div>

      <div style={{ fontSize: T.fs.t2, display: 'flex', justifyContent: 'space-between' }}>
        <span style={{ color: T.ink3 }}>
          New to 17Lands? Install their tracker, draft on Arena, then find
          your draft under My Decks.
        </span>
        <Link to="/signal-review" style={{ color: T.ink2, flexShrink: 0, marginLeft: 16 }}>
          solo signal scan →
        </Link>
      </div>
    </div>
  );
}
