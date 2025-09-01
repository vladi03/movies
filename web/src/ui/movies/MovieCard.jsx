export default function MovieCard({ movie }) {
  const title = movie.title || movie.name || '(untitled)';
  const year = movie.year ? `(${movie.year})` : '';
  const genres = Array.isArray(movie.genre) ? movie.genre : [];
  return (
    <div className="card bg-base-200 shadow">
      {movie.poster_link && (
        <figure>
          <img src={movie.poster_link} alt={title} className="object-cover w-full h-72" />
        </figure>
      )}
      <div className="card-body p-4">
        <h3 className="card-title text-sm">
          {title} <span className="opacity-70">{year}</span>
        </h3>
        <div className="flex flex-wrap gap-1">
          {genres.map((g) => (
            <span key={g} className="badge badge-outline">
              {g}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
