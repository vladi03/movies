import { Routes, Route } from 'react-router-dom';
import AuthGate from './auth/AuthGate.jsx';
import ItemsPage from './pages/ItemsPage.jsx';

export default function App() {
  return (
    <AuthGate>
      <Routes>
        <Route path="/" element={<ItemsPage />} />
      </Routes>
    </AuthGate>
  );
}
