import { createContext, useContext, useEffect, useState } from 'react';
import { auth, provider } from '../firebase.js';
import { onAuthStateChanged, signInWithPopup, signOut } from 'firebase/auth';

const AuthContext = createContext(null);
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

  const login = () => signInWithPopup(auth, provider);
  const logout = () => signOut(auth);

  if (loading) return <p>Loading...</p>;
  if (!user) return <button onClick={login}>Sign in with Google</button>;

  return (
    <AuthContext.Provider value={{ user }}>
      <div>
        <button onClick={logout}>Sign out</button>
        {children}
      </div>
    </AuthContext.Provider>
  );
}
