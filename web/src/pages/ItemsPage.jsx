import { useEffect, useState } from 'react';
import { collection, onSnapshot, orderBy, query } from 'firebase/firestore';
import { db } from '../firebase.js';
import { useAuth } from '../auth/AuthGate.jsx';
import { createItem, deleteItem } from '../api/functions.js';

export default function ItemsPage() {
  const [items, setItems] = useState([]);
  const { user } = useAuth();
  const collectionName = import.meta.env.VITE_MOVIES_COLLECTION || 'items';
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    // Order by 'title' so imported movies (which may not have createdAt) display
    const q = query(collection(db, collectionName), orderBy('title'));
    const unsub = onSnapshot(q, (snap) => {
      setItems(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });
    return () => unsub();
  }, [collectionName]);

  return (
    <div>
      <h2>Items</h2>
      {user && <p>Signed in as {user.displayName}</p>}

      {user && (
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            setError('');
            if (!title.trim()) return setError('Title is required');
            setSubmitting(true);
            try {
              const token = await user.getIdToken().catch(() => undefined);
              await createItem({ title: title.trim(), description: description || undefined }, token);
              setTitle('');
              setDescription('');
            } catch (err) {
              setError(err?.message || 'Failed to create');
            } finally {
              setSubmitting(false);
            }
          }}
          style={{ marginBottom: 16 }}
        >
          <h3>Create Item</h3>
          <div>
            <input
              placeholder="Title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              disabled={submitting}
            />
          </div>
          <div>
            <input
              placeholder="Description (optional)"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              disabled={submitting}
            />
          </div>
          <button type="submit" disabled={submitting}>Add</button>
          {error && <p style={{ color: 'crimson' }}>{error}</p>}
        </form>
      )}
      <ul style={{ listStyle: 'none', padding: 0 }}>
        {items.map((item) => {
          const title = item.title || item.name || '(untitled)';
          const year = item.year ? ` (${item.year})` : '';
          const poster = item.poster_link;
          const genres = Array.isArray(item.genre) ? item.genre.join(', ') : item.genre;
          return (
            <li key={item.id} style={{ display: 'flex', alignItems: 'center', marginBottom: 12 }}>
              {poster && (
                <img src={poster} alt={title} style={{ width: 60, height: 'auto', marginRight: 12, borderRadius: 4 }} />
              )}
              <div style={{ flex: 1 }}>
                <div><strong>{title}</strong>{year}</div>
                {genres && <div style={{ color: '#666', fontSize: 12 }}>{genres}</div>}
              </div>
              {user && (
                <button
                  onClick={async () => {
                    try {
                      const token = await user.getIdToken().catch(() => undefined);
                      await deleteItem(item.id, token);
                    } catch (err) {
                      alert(err?.message || 'Failed to delete');
                    }
                  }}
                >
                  Delete
                </button>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
