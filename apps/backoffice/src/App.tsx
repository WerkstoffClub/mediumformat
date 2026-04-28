import { Routes, Route, Navigate } from 'react-router-dom';

// Placeholder — real routes wired in Tasks 9 & 10
export default function App() {
  return (
    <Routes>
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}
