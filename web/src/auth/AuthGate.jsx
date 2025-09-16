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
      } catch (e) {
        // swallow redirect errors; user may still be signed in
        // console.warn('Auth redirect result error', e);
      }

      if (mounted) setLoading(false);
    })();

    return () => {
      mounted = false;
      unsub && unsub();
    };
  }, []);

  const login = useCallback(async () => {
    // Prefer redirect to avoid COOP-related popup warnings and blockers
    const preferRedirect = !import.meta.env.VITE_AUTH_POPUP || import.meta.env.PROD;
    if (preferRedirect) {
      return signInWithRedirect(auth, provider);
    }
    try {
      return await signInWithPopup(auth, provider);
    } catch (err) {
      // Fallback to redirect on popup issues or COOP restrictions
      return signInWithRedirect(auth, provider);
    }
  }, []);
  const logout = useCallback(() => signOut(auth), []);

  const value = useMemo(() => ({ user, login, logout, loading }), [user, login, logout, loading]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-base-200 text-base-content">
        <div className="flex flex-col items-center gap-4">
          <img src="/movie-icon.svg" alt="Movie Catalog" className="w-12 h-12 opacity-90" />
          <span className="loading loading-spinner loading-lg text-primary" aria-label="Loading" />
          <p className="text-sm opacity-70">Signing you in…</p>
        </div>
      </div>
    );
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
