import { useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../auth/AuthGate.jsx';

export default function LoginPage() {
  const { user, login, authError, clearAuthError } = useAuth();
  const location = useLocation();
  const [error, setError] = useState('');
  const [signingIn, setSigningIn] = useState(false);

  const fromPath = location.state?.from?.pathname;
  const redirectTo = fromPath && fromPath !== '/login' ? fromPath : '/';

  if (user) {
    return <Navigate to={redirectTo} replace />;
  }

  async function handleLogin() {
    setError('');
    clearAuthError?.();
    setSigningIn(true);
    try {
      await login();
    } catch (err) {
      setError(err.message || 'Failed to sign in. Please try again.');
      setSigningIn(false);
    }
  }

  useEffect(() => {
    if (authError && signingIn) {
      setSigningIn(false);
    }
  }, [authError, signingIn]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-base-200 text-base-content p-4">
      <div className="w-full max-w-md bg-base-100 shadow-xl rounded-box p-8 space-y-6">
        <div className="space-y-2 text-center">
          <h1 className="text-3xl font-semibold">Welcome back</h1>
          <p className="opacity-80">Sign in to continue to the movie catalog.</p>
        </div>
        {fromPath && (
          <div className="alert alert-info text-sm">
            Sign in to view <span className="font-semibold">{fromPath}</span>.
          </div>
        )}
        {(error || authError) && (
          <div className="alert alert-error text-sm">
            {error || authError?.message}
          </div>
        )}
        <button
          type="button"
          onClick={handleLogin}
          className={`btn btn-primary w-full ${signingIn ? 'loading' : ''}`}
          disabled={signingIn}
        >
          {signingIn ? 'Signing in…' : 'Sign in with Google'}
        </button>
        <p className="text-xs text-center opacity-70">
          We use Firebase Authentication to keep your account secure.
        </p>
      </div>
    </div>
  );
}
