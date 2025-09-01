import { useCallback, useEffect, useState } from 'react';
import { collection, getDocs, limit, orderBy, query, startAfter, where } from 'firebase/firestore';
import { useSearchParams } from 'react-router-dom';
import { db } from '../firebase.js';

const PAGE_SIZE = 24;

export default function useMoviesQuery() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [cursor, setCursor] = useState(null);

  const q = searchParams.get('q') || '';
  const genre = searchParams.get('genre') || '';
  const sort = searchParams.get('sort') || 'title';
  const dir = searchParams.get('dir') || 'asc';
  const page = Number(searchParams.get('page') || 0);

  const fetchMovies = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const col = collection(db, import.meta.env.VITE_MOVIES_COLLECTION || 'items');
      const constraints = [];
      if (genre) constraints.push(where('genre', 'array-contains', genre));
      constraints.push(orderBy(sort, dir));
      constraints.push(limit(PAGE_SIZE));
      if (page > 0 && cursor) constraints.push(startAfter(cursor));
      const qRef = query(col, ...constraints);
      const snap = await getDocs(qRef);
      let docs = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      if (q) {
        docs = docs.filter((d) => (d.title || '').toLowerCase().includes(q.toLowerCase()));
      }
      setItems(docs);
      setCursor(snap.docs[snap.docs.length - 1]);
    } catch (err) {
      setError(err.message || 'Failed to load');
    } finally {
      setLoading(false);
    }
  }, [q, genre, sort, dir, page, cursor]);

  useEffect(() => {
    fetchMovies();
  }, [fetchMovies]);

  function setQuery(params) {
    const next = new URLSearchParams(searchParams);
    Object.entries(params).forEach(([key, value]) => {
      if (value === null || value === undefined || value === '') next.delete(key);
      else next.set(key, value);
    });
    setSearchParams(next);
  }

  function nextPage() {
    setQuery({ page: page + 1 });
  }

  function prevPage() {
    setQuery({ page: Math.max(page - 1, 0) });
  }

  return {
    items,
    loading,
    error,
    setQuery,
    next: nextPage,
    prev: prevPage,
    query: { q, genre, sort, dir, page },
  };
}
