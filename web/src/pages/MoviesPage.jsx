import Layout from '../ui/Layout.jsx';
import FiltersBar from '../ui/FiltersBar.jsx';
import MoviesGrid from '../ui/movies/MoviesGrid.jsx';
import EmptyState from '../ui/movies/EmptyState.jsx';
import SkeletonCard from '../ui/movies/SkeletonCard.jsx';
import useMoviesQuery from '../hooks/useMoviesQuery.js';

const GENRES = ['Action', 'Adventure', 'Comedy', 'Drama', 'Sci-Fi'];

export default function MoviesPage() {
  const { items, loading, error, setQuery, query } = useMoviesQuery();

  return (
    <Layout search={query.q} onSearchChange={(v) => setQuery({ q: v, page: 0 })}>
      <FiltersBar
        genres={GENRES}
        genre={query.genre}
        setGenre={(g) => setQuery({ genre: g, page: 0 })}
        sort={query.sort}
        setSort={(s) => setQuery({ sort: s })}
      />
      {loading && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-6 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      )}
      {!loading && items.length > 0 && <MoviesGrid items={items} />}
      {!loading && items.length === 0 && <EmptyState />}
      {error && <p className="text-error mt-4">{error}</p>}
    </Layout>
  );
}
