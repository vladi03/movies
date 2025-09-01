import { useEffect, useRef, useState } from 'react';
import { collection, getDocs, limit, orderBy, query, startAfter, where } from 'firebase/firestore';
import { useSearchParams } from 'react-router-dom';
import { db } from '../firebase.js';

const PAGE_SIZE = 24;

export default function useMoviesQuery() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  // Internal background pagination cursor
  const cursorRef = useRef(null);
  const fetchingRef = useRef(false);
  const doneRef = useRef(false);

  const q = searchParams.get('q') || '';
  const genre = searchParams.get('genre') || '';
  const sort = searchParams.get('sort') || 'title';
  const dir = searchParams.get('dir') || 'asc';
  const page = Number(searchParams.get('page') || 0);

  async function fetchAllPagesBackground() {
    if (fetchingRef.current || doneRef.current) return;
    fetchingRef.current = true;
    try {
      const col = collection(db, import.meta.env.VITE_MOVIES_COLLECTION || 'items');
      let keepGoing = true;
      while (keepGoing) {
        const constraints = [];
        if (genre) constraints.push(where('genre', 'array-contains', genre));
        constraints.push(orderBy(sort, dir));
        constraints.push(limit(PAGE_SIZE));
        if (cursorRef.current) constraints.push(startAfter(cursorRef.current));
        const qRef = query(col, ...constraints);
        const snap = await getDocs(qRef);
        let docs = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        // Basic client-side search filter if q provided
        if (q) {
          const qlc = q.toLowerCase();
          docs = docs.filter((d) => (d.title || d.name || '').toLowerCase().includes(qlc));
        }
        if (docs.length > 0) {
          setItems((prev) => prev.concat(docs));
        }
        cursorRef.current = snap.docs[snap.docs.length - 1] || null;
        keepGoing = snap.size === PAGE_SIZE; // stop when last page smaller than limit
        if (!keepGoing) {
          doneRef.current = true;
        }
      }
    } catch (err) {
      setError(err.message || 'Failed to load');
    } finally {
      fetchingRef.current = false;
      setLoading(false);
    }
  }

  // Kick off background loading; reset when query shape changes
  const queryKeyRef = useRef('');
  useEffect(() => {
    const key = JSON.stringify({ q, genre, sort, dir });
    if (key !== queryKeyRef.current) {
      // reset state
      queryKeyRef.current = key;
      cursorRef.current = null;
      doneRef.current = false;
      setItems([]);
    }
    setLoading(true);
    fetchAllPagesBackground();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, genre, sort, dir]);

  function setQuery(params) {
    const next = new URLSearchParams(searchParams);
    Object.entries(params).forEach(([key, value]) => {
      if (value === null || value === undefined || value === '') next.delete(key);
      else next.set(key, value);
    });
    setSearchParams(next);
  }

  function nextPage() {
    // no-op; background loader fetches all pages automatically
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
