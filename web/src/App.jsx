import { Routes, Route } from 'react-router-dom';
import AuthGate from './auth/AuthGate.jsx';
import MoviesPage from './pages/MoviesPage.jsx';

export default function App() {
  return (
    <AuthGate>
      <Routes>
        <Route path="/" element={<MoviesPage />} />
      </Routes>
    </AuthGate>
  );
}
