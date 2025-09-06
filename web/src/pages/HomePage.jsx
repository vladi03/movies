import Layout from '../ui/Layout.jsx';
import HeroCarousel from '../ui/home/HeroCarousel.jsx';
import GenreRow from '../ui/home/GenreRow.jsx';
import useMoviesQuery from '../hooks/useMoviesQuery.js';

const GENRES = ['Action', 'Adventure', 'Comedy', 'Drama', 'Sci-Fi'];

export default function HomePage() {
  const { items, loading, error } = useMoviesQuery();

  // Prepare top carousel and genre groupings
  const topItems = items.slice(0, 5);
  const genreGroups = GENRES.map((g) => ({
    genre: g,
    items: items.filter((m) => Array.isArray(m.genre) && m.genre.includes(g)),
  }));

  return (
    <Layout search={''} onSearchChange={() => {}}>
      {loading && items.length === 0 && <p>Loading...</p>}
      {!loading && topItems.length > 0 && <HeroCarousel items={topItems} />}
      {genreGroups.map(({ genre, items }) => (
        <GenreRow key={genre} genre={genre} items={items} />
      ))}
      {error && <p className="text-error mt-4">{error}</p>}
    </Layout>
  );
}
