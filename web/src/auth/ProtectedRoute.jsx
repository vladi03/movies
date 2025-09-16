import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from './AuthGate.jsx';

export default function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  // Avoid redirecting while auth state is still resolving
  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <span className="loading loading-spinner loading-lg text-primary" aria-label="Loading" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  if (children) {
    return children;
  }

  return <Outlet />;
}
