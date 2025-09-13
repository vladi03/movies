import React from 'react';

export default function MovieDialog({ movie, open, onClose }) {
  if (!movie) return null;
  const title = movie.title || movie.name || '(untitled)';
  const year = movie.year ? `(${movie.year})` : '';
  const genres = Array.isArray(movie.genre) ? movie.genre : [];
  const actors = Array.isArray(movie.actors) ? movie.actors : [];
  return (
    <dialog className={`modal ${open ? 'modal-open' : ''}`} onClose={onClose}>
      <div className="modal-box w-screen h-screen max-w-none rounded-none sm:max-w-xl sm:h-auto sm:rounded-box">
        <button
          type="button"
          className="btn btn-sm btn-circle btn-ghost absolute right-2 top-2"
          aria-label="Close"
          onClick={onClose}
        >
          ✕
        </button>
        {movie.poster_link && (
          <img
            src={movie.poster_link}
            alt={title}
            className="object-cover w-full h-80 mb-4"
          />
        )}
        <h3 className="font-bold text-lg mb-2">
          {title} <span className="opacity-70">{year}</span>
        </h3>
        {genres.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-4">
            {genres.map((g) => (
              <span key={g} className="badge badge-outline">
                {g}
              </span>
            ))}
          </div>
        )}
        {actors.length > 0 && (
          <div>
            <h4 className="font-semibold mb-1">Actors</h4>
            <ul className="list-disc list-inside">
              {actors.map((a) => (
                <li key={a}>{a}</li>
              ))}
            </ul>
          </div>
        )}
      </div>
      <form method="dialog" className="modal-backdrop" onClick={onClose}>
        <button>close</button>
      </form>
    </dialog>
  );
}
