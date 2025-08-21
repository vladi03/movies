import { useEffect, useState } from 'react';
import { collection, onSnapshot, orderBy, query } from 'firebase/firestore';
import { db } from '../firebase.js';
import { useAuth } from '../auth/AuthGate.jsx';

export default function ItemsPage() {
  const [items, setItems] = useState([]);
  const { user } = useAuth();

  useEffect(() => {
    const q = query(collection(db, 'items'), orderBy('createdAt', 'desc'));
    const unsub = onSnapshot(q, (snap) => {
      setItems(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });
    return () => unsub();
  }, []);

  return (
    <div>
      <h2>Items</h2>
      {user && <p>Signed in as {user.displayName}</p>}
      <p>This UI is read-only. Use the MCP server to modify items.</p>
      <ul>
        {items.map((item) => (
          <li key={item.id}>{item.title}</li>
        ))}
      </ul>
    </div>
  );
}
