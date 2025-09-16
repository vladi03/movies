import React, { useEffect, useState } from 'react';
import { deleteItem, updateItem } from '../../api/functions.js';

export default function MovieDialog({ movie, open, onClose, onDeleted }) {



  if (!movie) return null;
  const title = movie.title || movie.name || '(untitled)';
  const year = movie.year ? `(${movie.year})` : '';
  const genres = Array.isArray(movie.genre) ? movie.genre : [];
  const actors = Array.isArray(movie.actors) ? movie.actors : [];
  const [deleting, setDeleting] = useState(false);
  const [markingWatched, setMarkingWatched] = useState(false);
  const [lastWatched, setLastWatched] = useState(movie.lastWatched);

  useEffect(() => {
    if (!movie) setDeleting(false);
  }, [movie]);

  useEffect(() => {
    setLastWatched(movie.lastWatched);
    setMarkingWatched(false);
    setDeleting(false);
  }, [movie]);

  let lastWatchedInfo = null;
  if (lastWatched !== undefined && lastWatched !== null) {
    let date;
    if (typeof lastWatched === 'number' || typeof lastWatched === 'string') {
      date = new Date(lastWatched);
    } else if (
      typeof lastWatched === 'object' &&
      lastWatched !== null &&
      typeof lastWatched.seconds === 'number'
    ) {
      date = new Date(lastWatched.seconds * 1000);
    }
    if (date && !Number.isNaN(date.getTime())) {
      lastWatchedInfo = {
        iso: date.toISOString(),
        label: date.toLocaleString(),
      };
    }
  }

  async function handleWatched() {
    if (!movie?.id || markingWatched) return;
    try {
      setMarkingWatched(true);
      const now = Date.now();
      const updated = await updateItem({ id: movie.id, lastWatched: now });
      setLastWatched(updated?.lastWatched ?? now);
    } catch (err) {
      alert(err?.message || 'Failed to update movie');
    } finally {
      setMarkingWatched(false);
    }
  }

  async function handleDelete() {
    if (!movie?.id) return;
    const ok = window.confirm('Are you sure you want to delete this movie?');
    if (!ok) return;
    try {
      setDeleting(true);
      await deleteItem(movie.id);
      onDeleted?.(movie);
      onClose?.();
    } catch (err) {
      // Basic error surfacing; keep it simple
      alert(err?.message || 'Failed to delete');
    } finally {
      setDeleting(false);
    }
  }
  return (
    <dialog open={open} className={`modal ${open ? 'modal-open' : ''}`} onClose={onClose}>
      {/* Constrain dialog to viewport and use a portrait layout */}
      <div className="modal-box w-[92vw] max-w-sm sm:max-w-md md:max-w-lg max-h-[92dvh] overflow-y-auto p-0">
        <button
          type="button"
          className="btn btn-sm btn-circle absolute right-2 top-2 z-10 bg-white text-gray-800 border border-base-300 shadow hover:bg-white/90"
          aria-label="Close"
          onClick={onClose}
        >
          ✕
        </button>
        {movie.poster_link && (
          <div className="w-full bg-base-200" style={{ aspectRatio: '2 / 3' }}>
            <img
              src={movie.poster_link}
              alt={title}
              className="w-full h-full object-cover"
            />
          </div>
        )}
        <div className="p-4">
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
          <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            {lastWatchedInfo && (
              <p className="text-sm text-base-content/70">
                Last watched:{' '}
                <time dateTime={lastWatchedInfo.iso}>{lastWatchedInfo.label}</time>
              </p>
            )}
            <div className="flex justify-end gap-2">
              <button
                type="button"
                className={`btn btn-primary ${markingWatched ? 'btn-disabled loading' : ''}`}
                onClick={handleWatched}
                disabled={markingWatched || deleting}
              >
                {markingWatched ? 'Saving…' : 'Watched'}
              </button>
              <button
                type="button"
                className={`btn btn-error ${deleting ? 'btn-disabled loading' : ''}`}
                onClick={handleDelete}
                disabled={deleting}
              >
                {deleting ? 'Deleting…' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      </div>
      <form method="dialog" className="modal-backdrop" onClick={onClose}>
        <button>close</button>
      </form>
    </dialog>
  );
}
