import { Routes, Route, Navigate } from 'react-router-dom';
import { SignalReview } from './ui/pages/SignalReview';
import { CreateReview } from './annotator/pages/CreateReview';
import { ReviewWorkspace } from './annotator/pages/ReviewWorkspace';

function App() {
  return (
    <div
      style={{
        maxWidth: 1200,
        margin: '0 auto',
        padding: '12px 16px',
        backgroundColor: '#0a0a0a',
        minHeight: '100vh',
        color: '#ccc',
        fontFamily: 'monospace',
      }}
    >
      <Routes>
        <Route path="/signal-review" element={<SignalReview />} />
        <Route path="/annotate" element={<Navigate to="/" replace />} />
        <Route path="/review/:id" element={<ReviewWorkspace />} />
        <Route path="/" element={<CreateReview />} />
      </Routes>
    </div>
  );
}

export default App;
