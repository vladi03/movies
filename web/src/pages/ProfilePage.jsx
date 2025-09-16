import { useEffect, useMemo, useState } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { UserCircleIcon } from '@heroicons/react/24/solid';
import Layout from '../ui/Layout.jsx';
import { useAuth } from '../auth/AuthGate.jsx';
import { db } from '../firebase.js';

function formatKey(key) {
  if (typeof key !== 'string') return 'Field';
  return key
    .replace(/[_-]+/g, ' ')
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/^\w/, (char) => char.toUpperCase());
}

function formatValue(value) {
  if (value === null || value === undefined) {
    return <span className="opacity-60">—</span>;
  }

  if (typeof value === 'string') {
    return value.trim() ? value : <span className="opacity-60">—</span>;
  }

  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }

  if (value instanceof Date) {
    return value.toLocaleString();
  }

  if (value && typeof value.toDate === 'function') {
    const asDate = value.toDate();
    if (asDate instanceof Date && !Number.isNaN(asDate.getTime())) {
      return asDate.toLocaleString();
    }
  }

  if (value && typeof value.seconds === 'number') {
    const asDate = new Date(value.seconds * 1000);
    if (!Number.isNaN(asDate.getTime())) {
      return asDate.toLocaleString();
    }
  }

  if (Array.isArray(value)) {
    if (value.length === 0) {
      return <span className="opacity-60">—</span>;
    }
    return value
      .map((item) => {
        if (item === null || item === undefined) return '—';
        if (typeof item === 'string' || typeof item === 'number' || typeof item === 'boolean') {
          return String(item);
        }
        if (item && typeof item.toDate === 'function') {
          const asDate = item.toDate();
          if (asDate instanceof Date && !Number.isNaN(asDate.getTime())) {
            return asDate.toLocaleString();
          }
        }
        return JSON.stringify(item);
      })
      .join(', ');
  }

  if (typeof value === 'object') {
    return (
      <pre className="whitespace-pre-wrap break-words text-xs bg-base-300/60 rounded-box p-3">
        {JSON.stringify(value, null, 2)}
      </pre>
    );
  }

  return String(value);
}

export default function ProfilePage() {
  const { user } = useAuth();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!user?.uid) {
      setProfile(null);
      setLoading(false);
      return undefined;
    }

    setLoading(true);
    setError('');
    const ref = doc(db, import.meta.env.VITE_PROFILE_COLLECTION || 'profiles', user.uid);
    const unsubscribe = onSnapshot(
      ref,
      (snapshot) => {
        if (snapshot.exists()) {
          setProfile(snapshot.data());
        } else {
          setProfile(null);
        }
        setLoading(false);
      },
      (err) => {
        console.error('Failed to read profile', err);
        setError(err.message || 'Failed to load profile data.');
        setLoading(false);
      },
    );

    return () => unsubscribe();
  }, [user?.uid]);

  const docData = useMemo(() => profile || {}, [profile]);
  const avatarUrl = docData.photoURL || user?.photoURL || '';
  const displayName = docData.displayName || user?.displayName || 'Movie fan';
  const email = docData.email || user?.email || '';

  const detailEntries = useMemo(() => {
    const entries = Object.entries(docData).filter(
      ([key]) => !['displayName', 'email', 'photoURL'].includes(key),
    );
    entries.sort(([a], [b]) => a.localeCompare(b));
    return entries;
  }, [docData]);

  const creationDate = user?.metadata?.creationTime ? new Date(user.metadata.creationTime) : null;
  const lastSignInDate = user?.metadata?.lastSignInTime ? new Date(user.metadata.lastSignInTime) : null;

  return (
    <Layout>
      <div className="max-w-3xl mx-auto">
        <div className="card bg-base-200 shadow-lg">
          <div className="card-body gap-6">
            <div className="flex flex-col sm:flex-row sm:items-center gap-6">
              <div className="avatar">
                <div className="w-24 h-24 rounded-full ring ring-primary ring-offset-base-100 ring-offset-2 bg-base-300 overflow-hidden flex items-center justify-center">
                  {avatarUrl ? (
                    <img src={avatarUrl} alt={displayName} className="w-full h-full object-cover" />
                  ) : (
                    <UserCircleIcon className="w-16 h-16 text-base-content/60" />
                  )}
                </div>
              </div>
              <div className="space-y-1">
                <h1 className="text-3xl font-semibold">{displayName}</h1>
                {email && <p className="text-sm opacity-80">{email}</p>}
                <p className="text-xs opacity-70">UID: {user?.uid}</p>
                <div className="text-xs opacity-70 space-y-1">
                  {creationDate && !Number.isNaN(creationDate.getTime()) && (
                    <p>Account created: {creationDate.toLocaleString()}</p>
                  )}
                  {lastSignInDate && !Number.isNaN(lastSignInDate.getTime()) && (
                    <p>Last sign-in: {lastSignInDate.toLocaleString()}</p>
                  )}
                </div>
              </div>
            </div>

            {error && <div className="alert alert-error text-sm">{error}</div>}

            {loading ? (
              <div className="space-y-3">
                <div className="skeleton h-4 w-1/2" />
                <div className="skeleton h-4 w-2/3" />
                <div className="skeleton h-4 w-1/3" />
              </div>
            ) : detailEntries.length > 0 ? (
              <div className="space-y-4">
                <h2 className="text-lg font-semibold">Profile details</h2>
                <dl className="rounded-box border border-base-300 divide-y divide-base-300">
                  {detailEntries.map(([key, value]) => (
                    <div key={key} className="grid grid-cols-1 sm:grid-cols-3 gap-2 px-4 py-3">
                      <dt className="text-sm font-medium uppercase tracking-wide text-base-content/70">
                        {formatKey(key)}
                      </dt>
                      <dd className="text-sm sm:col-span-2 break-words">{formatValue(value)}</dd>
                    </div>
                  ))}
                </dl>
              </div>
            ) : (
              <p className="opacity-70">No additional profile details stored in Firestore yet.</p>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
}
