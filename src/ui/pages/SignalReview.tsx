import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useSignalMap } from '../hooks/useSignalMap';
import { useDraftData } from '../hooks/useDraftData';
import { useSignalEngine } from '../hooks/useSignalEngine';
import { DraftUrlInput } from '../views/DraftUrlInput';
import { DraftReview } from '../views/DraftReview';
import { Summary } from '../views/Summary';

type Tab = 'review' | 'summary';

export function SignalReview() {
  const { signalMap, loading: mapLoading, error: mapError } = useSignalMap();
  const { draft, loading: draftLoading, error: draftError, loadDraft } = useDraftData();
  const {
    analysis, currentPickIndex, currentPickAnalysis,
    velocityMetrics, poolState, suggestions, posterior,
    goToNext, goToPrev,
  } = useSignalEngine(draft, signalMap);

  const [activeTab, setActiveTab] = useState<Tab>('review');

  const handleLoadDraft = (url: string) => {
    loadDraft(url, signalMap);
  };

  return (
    <>
      <div
        style={{
          display: 'flex',
          alignItems: 'baseline',
          justifyContent: 'space-between',
          margin: '0 0 8px',
        }}
      >
        <h1 style={{ color: '#fff', fontSize: 18, margin: 0 }}>
          DraftRewind — Signal Review
        </h1>
        <Link
          to="/"
          style={{ color: '#888', fontSize: 11, fontFamily: 'monospace' }}
        >
          ← annotated reviews
        </Link>
      </div>

      {mapLoading && (
        <div style={{ color: '#888', padding: 12 }}>Loading signal map...</div>
      )}
      {mapError && (
        <div style={{ color: '#f44336', padding: 12 }}>
          Signal map error: {mapError}
        </div>
      )}

      <DraftUrlInput
        onSubmit={handleLoadDraft}
        loading={draftLoading}
        error={draftError}
      />

      {draft && signalMap && analysis && (
        <>
          <div
            style={{
              display: 'flex',
              gap: 2,
              marginBottom: 8,
            }}
          >
            {(['review', 'summary'] as Tab[]).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                style={{
                  padding: '6px 16px',
                  backgroundColor: activeTab === tab ? '#333' : '#1a1a1a',
                  color: activeTab === tab ? '#fff' : '#666',
                  border: 'none',
                  borderRadius: '4px 4px 0 0',
                  cursor: 'pointer',
                  fontFamily: 'monospace',
                  fontWeight: activeTab === tab ? 700 : 400,
                  fontSize: 12,
                  textTransform: 'uppercase',
                }}
              >
                {tab}
              </button>
            ))}
          </div>

          {activeTab === 'review' && (
            <DraftReview
              draft={draft}
              signalMap={signalMap}
              analysis={currentPickAnalysis}
              currentPickIndex={currentPickIndex}
              totalPicks={analysis.picks.length}
              onPrev={goToPrev}
              onNext={goToNext}
              velocityMetrics={velocityMetrics}
              poolState={poolState}
              suggestions={suggestions}
              posterior={posterior}
            />
          )}

          {activeTab === 'summary' && (
            <Summary
              summary={analysis.summary}
              totalPicks={analysis.picks.length}
            />
          )}
        </>
      )}
    </>
  );
}
