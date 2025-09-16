import { useEffect, useState } from 'react';
import Layout from '../ui/Layout.jsx';
import FiltersBar from '../ui/FiltersBar.jsx';
import MoviesGrid from '../ui/movies/MoviesGrid.jsx';
import EmptyState from '../ui/movies/EmptyState.jsx';
import SkeletonCard from '../ui/movies/SkeletonCard.jsx';
import MovieDialog from '../ui/movies/MovieDialog.jsx';
import useMoviesQuery from '../hooks/useMoviesQuery.js';
import HeroCarousel from '../ui/movies/HeroCarousel.jsx';
import { randomItems } from '../api/functions.js';

const GENRES = ['Action', 'Adventure', 'Comedy', 'Drama', 'Sci-Fi'];

export default function MoviesPage() {
  const { items, loading, error, setQuery, query } = useMoviesQuery();
  const [selected, setSelected] = useState(null);
  const [hero, setHero] = useState([]);
  const [hiddenIds, setHiddenIds] = useState(() => new Set());

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const movies = await randomItems();
        if (!cancelled) setHero(movies || []);
      } catch {
        // ignore; hero is optional UI
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  function handleDeleted(movie) {
    if (!movie?.id) return;
    setHiddenIds((prev) => {
      const next = new Set(prev);
      next.add(movie.id);
      return next;
    });
    setHero((prev) => prev.filter((m) => m.id !== movie.id));
    setSelected(null);
  }

  return (
    <Layout search={query.q} onSearchChange={(v) => setQuery({ q: v, page: 0 })}>
      <FiltersBar
        genres={GENRES}
        genre={query.genre}
        setGenre={(g) => setQuery({ genre: g, page: 0 })}
        sort={query.sort}
        setSort={(s) =>
          setQuery({ sort: s, dir: s === 'year' ? 'desc' : 'asc' })
        }
      />
      {hero.length > 0 && (
        <HeroCarousel items={hero} onSelect={setSelected} />
      )}
      {loading && items.length === 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-6 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      )}
      {!loading && items.length > 0 && (
        <MoviesGrid
          items={items.filter((m) => !hiddenIds.has(m.id))}
          onSelect={(m) => setSelected(m)}
        />
      )}
      {!loading && items.length === 0 && <EmptyState />}
      {error && <p className="text-error mt-4">{error}</p>}
      <MovieDialog
        movie={selected}
        open={!!selected}
        onClose={() => setSelected(null)}
        onDeleted={handleDeleted}
      />
    </Layout>
  );
}
