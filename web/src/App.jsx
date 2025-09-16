import { Routes, Route } from 'react-router-dom';
import AuthGate from './auth/AuthGate.jsx';
import MoviesPage from './pages/MoviesPage.jsx';
import AIFindMovie from './pages/AIFindMovie.jsx';
import WeeklyPicks from './pages/WeeklyPicks.jsx';

export default function App() {
  return (
    <AuthGate>
      <Routes>
        <Route path="/" element={<MoviesPage />} />
        <Route path="/weekly" element={<WeeklyPicks />} />
        <Route path="/ai" element={<AIFindMovie />} />
      </Routes>
    </AuthGate>
  );
}
