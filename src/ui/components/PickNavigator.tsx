interface PickNavigatorProps {
  packNumber: number;
  pickNumber: number;
  currentIndex: number;
  totalPicks: number;
  onPrev: () => void;
  onNext: () => void;
  label?: string;
}

export function PickNavigator({
  packNumber,
  pickNumber,
  currentIndex,
  totalPicks,
  onPrev,
  onNext,
  label,
}: PickNavigatorProps) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '4px 12px',
        backgroundColor: '#111',
        borderRadius: 6,
        fontFamily: 'monospace',
        marginBottom: 4,
      }}
    >
      <button
        onClick={onPrev}
        disabled={currentIndex <= 0}
        style={{
          padding: '4px 12px',
          backgroundColor: '#333',
          color: '#fff',
          border: 'none',
          borderRadius: 4,
          cursor: currentIndex <= 0 ? 'not-allowed' : 'pointer',
          opacity: currentIndex <= 0 ? 0.4 : 1,
          fontFamily: 'monospace',
        }}
      >
        ← Prev
      </button>

      <span style={{ color: '#fff', fontSize: 16, fontWeight: 700 }}>
        {label ?? `Pack ${packNumber}, Pick ${pickNumber}`}
      </span>

      <span style={{ color: '#666', fontSize: 12 }}>
        {currentIndex + 1} / {totalPicks}
      </span>

      <button
        onClick={onNext}
        disabled={currentIndex >= totalPicks - 1}
        style={{
          padding: '4px 12px',
          backgroundColor: '#333',
          color: '#fff',
          border: 'none',
          borderRadius: 4,
          cursor: currentIndex >= totalPicks - 1 ? 'not-allowed' : 'pointer',
          opacity: currentIndex >= totalPicks - 1 ? 0.4 : 1,
          fontFamily: 'monospace',
        }}
      >
        Next →
      </button>
    </div>
  );
}
