import MovieCard from './MovieCard.jsx';

export default function MoviesGrid({ items, onSelect }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-6 gap-4">
      {items.map((m) => (
        <MovieCard key={m.id} movie={m} onSelect={onSelect} />
      ))}
    </div>
  );
}
