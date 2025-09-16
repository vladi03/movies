import { createContext, useContext, useEffect, useMemo, useState, useCallback } from 'react';
import { auth, provider } from '../firebase.js';
import {
  onAuthStateChanged,
  signInWithPopup,
  signInWithRedirect,
  signOut,
  getRedirectResult,
  setPersistence,
  browserLocalPersistence,
} from 'firebase/auth';

const AuthContext = createContext(null);
// eslint-disable-next-line react-refresh/only-export-components
export const useAuth = () => useContext(AuthContext);

export default function AuthGate({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState(null);

  useEffect(() => {
    let mounted = true;
    let unsub = () => {};

    (async () => {
      try {
        await setPersistence(auth, browserLocalPersistence);
      } catch (_) {
        // ignore, defaults will apply
      }

      // Start listening for auth state; resolve once we get the first value
      await new Promise((resolve) => {
        unsub = onAuthStateChanged(auth, (u) => {
          if (!mounted) return;
          setUser(u);
          resolve();
        });
      });

      // Complete any pending redirect sign-in to avoid transient null states
      try {
        await getRedirectResult(auth);
        if (mounted) setAuthError(null);
      } catch (e) {
        // Surface redirect errors so the Login page can display them
        if (mounted) {
          const code = e?.code || 'auth/unknown';
          const message = e?.message || 'Authentication failed. Please try again.';
          setAuthError({ code, message });
        }
      }

      if (mounted) setLoading(false);
    })();

    return () => {
      mounted = false;
      unsub && unsub();
    };
  }, []);

  const login = useCallback(async () => {
    setAuthError(null);
    // Prefer redirect to avoid COOP-related popup warnings and blockers
    const preferRedirect = !import.meta.env.VITE_AUTH_POPUP || import.meta.env.PROD;
    if (preferRedirect) {
      return signInWithRedirect(auth, provider);
    }
    try {
      return await signInWithPopup(auth, provider);
    } catch (err) {
      // Fallback to redirect on popup issues or COOP restrictions
      try {
        return await signInWithRedirect(auth, provider);
      } catch (e) {
        const code = e?.code || 'auth/unknown';
        const message = e?.message || 'Authentication failed. Please try again.';
        setAuthError({ code, message });
        throw e;
      }
    }
  }, []);
  const logout = useCallback(() => signOut(auth), []);

  const value = useMemo(
    () => ({ user, login, logout, loading, authError, clearAuthError: () => setAuthError(null) }),
    [user, login, logout, loading, authError],
  );

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-base-200 text-base-content p-4">
        <div className="w-full max-w-md bg-base-100 rounded-box shadow-xl p-6 flex flex-col items-center gap-4">
          <img src="/movie-icon.svg" alt="Movie Catalog" className="w-12 h-12 opacity-90" />
          <span className="loading loading-spinner loading-lg text-primary" aria-label="Loading" />
          <p className="text-sm opacity-70">Signing you in…</p>
          {authError && (
            <div className="alert alert-error text-sm w-full">
              <div>
                <span className="font-semibold">Sign-in error</span>
                <span className="ml-2">{authError.message}</span>
              </div>
              {import.meta.env.DEV && (
                <div className="opacity-70 text-xs mt-1">{authError.code}</div>
              )}
            </div>
          )}
          {authError && (
            <button type="button" className="btn btn-sm" onClick={() => setAuthError(null)}>
              Dismiss
            </button>
          )}
        </div>
      </div>
    );
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
