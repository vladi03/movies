import { Routes, Route } from 'react-router-dom';
import AuthGate from './auth/AuthGate.jsx';
import ProtectedRoute from './auth/ProtectedRoute.jsx';
import MoviesPage from './pages/MoviesPage.jsx';
import AIFindMovie from './pages/AIFindMovie.jsx';
import WeeklyPicks from './pages/WeeklyPicks.jsx';
import LoginPage from './pages/LoginPage.jsx';
import ProfilePage from './pages/ProfilePage.jsx';

export default function App() {
  return (
    <AuthGate>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route element={<ProtectedRoute />}>
          <Route path="/" element={<MoviesPage />} />
          <Route path="/weekly" element={<WeeklyPicks />} />
          <Route path="/ai" element={<AIFindMovie />} />
          <Route path="/profile" element={<ProfilePage />} />
        </Route>
      </Routes>
    </AuthGate>
  );
}
