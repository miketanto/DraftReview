import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { SignalReview } from './ui/pages/SignalReview';
import { CreateReview } from './annotator/pages/CreateReview';
import { ReviewWorkspace } from './annotator/pages/ReviewWorkspace';
import { T } from './shared/theme';

function App() {
  const location = useLocation();
  // The review workspace earns the full monitor; entry pages stay narrow.
  const wide = location.pathname.startsWith('/review/');

  return (
    <div
      style={{
        maxWidth: wide ? 1560 : 1200,
        margin: '0 auto',
        padding: '8px 16px',
        backgroundColor: T.bg0,
        minHeight: '100vh',
        color: T.ink1,
        fontFamily: T.mono,
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
