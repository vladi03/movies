import { createContext, useContext, useEffect, useMemo, useState, useCallback } from 'react';
import { auth, provider } from '../firebase.js';
import { onAuthStateChanged, signInWithPopup, signOut } from 'firebase/auth';

const AuthContext = createContext(null);
// eslint-disable-next-line react-refresh/only-export-components
export const useAuth = () => useContext(AuthContext);

export default function AuthGate({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  const login = useCallback(() => signInWithPopup(auth, provider), []);
  const logout = useCallback(() => signOut(auth), []);

  const value = useMemo(() => ({ user, login, logout, loading }), [user, login, logout, loading]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-base-200 text-base-content">
        <span className="loading loading-spinner loading-lg" aria-label="Loading" />
      </div>
    );
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
