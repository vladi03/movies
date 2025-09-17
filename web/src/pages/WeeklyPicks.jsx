import { useEffect, useMemo, useState } from 'react';
import Layout from '../ui/Layout.jsx';
import { randomItems, getWeeklyPicks, saveWeeklyPicks } from '../api/functions.js';
import { useAuth } from '../auth/AuthGate.jsx';

const DAYS_TO_PICK = 7;
const dayLabelFormatter = new Intl.DateTimeFormat(undefined, {
  weekday: 'long',
  month: 'short',
  day: 'numeric',
});
const savedAtFormatter = new Intl.DateTimeFormat(undefined, {
  dateStyle: 'medium',
  timeStyle: 'short',
});

function formatIsoDate(date) {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function parseIsoDate(value) {
  if (typeof value !== 'string') return null;
  const parts = value.split('-').map((part) => Number(part));
  if (parts.length !== 3) return null;
  const [year, month, day] = parts;
  if (!Number.isFinite(year) || !Number.isFinite(month) || !Number.isFinite(day)) return null;
  const parsed = new Date(Date.UTC(year, month - 1, day, 12, 0, 0));
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed;
}

function createEmptySchedule(startDate = new Date()) {
  const base = new Date(startDate);
  base.setHours(12, 0, 0, 0);
  return Array.from({ length: DAYS_TO_PICK }, (_, index) => {
    const date = new Date(base);
    date.setDate(base.getDate() + index);
    return {
      date: formatIsoDate(date),
      label: dayLabelFormatter.format(date),
      movie: null,
    };
  });
}

function sortAndFormatPicks(picks) {
  const scheduleFallback = createEmptySchedule();
  return picks
    .slice()
    .sort((a, b) => {
      const left = typeof a?.date === 'string' ? a.date : '';
      const right = typeof b?.date === 'string' ? b.date : '';
      return left.localeCompare(right);
    })
    .map((pick, index) => {
      const fallback = scheduleFallback[index] || scheduleFallback[scheduleFallback.length - 1];
      const date = typeof pick?.date === 'string' && pick.date ? pick.date : fallback.date;
      const parsedDate = parseIsoDate(date);
      const label = parsedDate ? dayLabelFormatter.format(parsedDate) : fallback.label;
      const movie = pick?.movie && typeof pick.movie === 'object' ? pick.movie : null;
      return { date, label, movie };
    });
}

function extractMillis(value) {
  if (!value) return null;
  if (typeof value === 'number') return value;
  if (value instanceof Date) return value.getTime();
  if (typeof value.toDate === 'function') return value.toDate().getTime();
  if (typeof value._seconds === 'number') return value._seconds * 1000;
  return null;
}

function WeeklyPickCard({ pick, onSelect, disabled }) {
  const { label, date, movie } = pick;
  const poster = movie?.landscape_poster_link || movie?.poster_link;
  const interactive = typeof onSelect === 'function';

  return (
    <button
      type="button"
      onClick={onSelect}
      disabled={disabled || !interactive}
      className={`card bg-base-200 shadow-sm text-left transition-shadow w-full disabled:cursor-not-allowed ${
        interactive ? 'hover:shadow-md focus-visible:ring focus-visible:ring-primary/60 focus:outline-none' : ''
      } ${disabled ? 'opacity-60' : ''}`}
    >
      <div className="card-body">
        <h3 className="card-title text-lg">{label}</h3>
        <p className="text-sm opacity-70">{date}</p>
        {movie ? (
          <div className="mt-3 flex gap-4 items-start">
            {poster && (
              <img
                src={poster}
                alt={movie.title || movie.name || 'Movie poster'}
                className="w-32 h-20 sm:w-36 sm:h-24 object-cover rounded"
                onError={(event) => {
                  event.currentTarget.style.visibility = 'hidden';
                }}
              />
            )}
            <div>
              <p className="font-semibold text-base">
                {movie.title || movie.name || 'Untitled Movie'}
              </p>
              {movie.year && (
                <p className="text-sm opacity-80">Released: {movie.year}</p>
              )}
              {Array.isArray(movie.genre) && movie.genre.length > 0 && (
                <p className="text-sm opacity-80">Genres: {movie.genre.slice(0, 3).join(', ')}</p>
              )}
              {Array.isArray(movie.actors) && movie.actors.length > 0 && (
                <p className="text-sm opacity-80">Cast: {movie.actors.slice(0, 4).join(', ')}</p>
              )}
            </div>
          </div>
        ) : (
          <p className="italic opacity-70 mt-3">No movie selected yet.</p>
        )}
        {interactive && (
          <p className="mt-4 text-sm font-medium text-primary">Click to spin this day</p>
        )}
      </div>
    </button>
  );
}

function SingleDayDialog({ open, pick, onClose, onSpin, spinning, disabled }) {
  if (!pick) return null;
  const { label, date, movie } = pick;
  const poster = movie?.landscape_poster_link || movie?.poster_link;
  const title = movie?.title || movie?.name || 'Untitled Movie';
  const genres = Array.isArray(movie?.genre) ? movie.genre.slice(0, 3) : [];
  const actors = Array.isArray(movie?.actors) ? movie.actors.slice(0, 4) : [];

  return (
    <dialog open={open} className={`modal ${open ? 'modal-open' : ''}`} onClose={onClose}>
      <div className="modal-box w-[92vw] max-w-md">
        <button
          type="button"
          className="btn btn-sm btn-circle absolute right-2 top-2"
          onClick={onClose}
          aria-label="Close"
        >
          ✕
        </button>
        <div className="flex flex-col gap-4">
          <div>
            <h3 className="text-xl font-semibold">{label}</h3>
            <p className="text-sm opacity-70">{date}</p>
          </div>
          {poster && (
            <div className="w-full rounded-lg overflow-hidden bg-base-200" style={{ aspectRatio: '16 / 9' }}>
              <img
                src={poster}
                alt={title}
                className="w-full h-full object-cover"
                onError={(event) => {
                  event.currentTarget.style.visibility = 'hidden';
                }}
              />
            </div>
          )}
          {movie ? (
            <div className="space-y-2">
              <p className="font-semibold text-base">{title}</p>
              {movie.year && <p className="text-sm opacity-80">Released: {movie.year}</p>}
              {genres.length > 0 && (
                <p className="text-sm opacity-80">Genres: {genres.join(', ')}</p>
              )}
              {actors.length > 0 && (
                <p className="text-sm opacity-80">Cast: {actors.join(', ')}</p>
              )}
            </div>
          ) : (
            <p className="italic opacity-70">
              No movie selected yet. Spin to pick one for this day.
            </p>
          )}
          <div className="modal-action mt-2">
            <button type="button" className="btn btn-ghost" onClick={onClose}>
              Close
            </button>
            <button
              type="button"
              className={`btn btn-secondary ${spinning ? 'loading' : ''}`}
              onClick={onSpin}
              disabled={spinning || disabled}
            >
              {spinning ? 'Spinning…' : 'Spin'}
            </button>
          </div>
        </div>
      </div>
      <form method="dialog" className="modal-backdrop" onClick={onClose}>
        <button>close</button>
      </form>
    </dialog>
  );
}

export default function WeeklyPicks() {
  const { user } = useAuth();
  const [picks, setPicks] = useState(() => createEmptySchedule());
  const [initialLoading, setInitialLoading] = useState(true);
  const [spinLoading, setSpinLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [lastSavedDoc, setLastSavedDoc] = useState(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [selectedDayIndex, setSelectedDayIndex] = useState(null);
  const [dayDialogOpen, setDayDialogOpen] = useState(false);
  const [singleSpinLoading, setSingleSpinLoading] = useState(false);

  const hasMovies = useMemo(() => picks.some((pick) => !!pick.movie), [picks]);
  const lastSavedMillis = useMemo(() => extractMillis(lastSavedDoc?.updatedAt || lastSavedDoc?.createdAt), [lastSavedDoc]);
  const selectedDay = useMemo(() => {
    if (!Array.isArray(picks)) return null;
    if (selectedDayIndex === null || selectedDayIndex === undefined) return null;
    const index = Number(selectedDayIndex);
    if (!Number.isInteger(index) || index < 0 || index >= picks.length) {
      return null;
    }
    return picks[index] || null;
  }, [picks, selectedDayIndex]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setInitialLoading(true);
      setError('');
      try {
        const data = await getWeeklyPicks();
        if (cancelled) return;
        if (data && Array.isArray(data.picks) && data.picks.length > 0) {
          setPicks(sortAndFormatPicks(data.picks));
          setLastSavedDoc(data);
          setHasUnsavedChanges(false);
        } else {
          setPicks(createEmptySchedule());
          setLastSavedDoc(null);
          setHasUnsavedChanges(false);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err.message || 'Failed to load saved picks');
          setPicks(createEmptySchedule());
        }
      } finally {
        if (!cancelled) setInitialLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!selectedDay) {
      setDayDialogOpen(false);
    }
  }, [selectedDay]);

  function handleDayClick(index) {
    if (spinLoading || singleSpinLoading || saving) {
      return;
    }
    setSelectedDayIndex(index);
    setDayDialogOpen(true);
  }

  function handleCloseDayDialog() {
    setDayDialogOpen(false);
  }

  async function handlePickMovies() {
    setError('');
    setSuccess('');
    setDayDialogOpen(false);
    setSelectedDayIndex(null);
    setSpinLoading(true);
    try {
      const movies = await randomItems({ count: DAYS_TO_PICK });
      if (!Array.isArray(movies) || movies.length < DAYS_TO_PICK) {
        throw new Error('Not enough movies returned from picker');
      }
      const schedule = createEmptySchedule();
      const next = schedule.map((slot, index) => ({
        ...slot,
        movie: movies[index] || null,
      }));
      if (next.some((slot) => !slot.movie)) {
        throw new Error('Missing movie data for one or more days');
      }
      setPicks(next);
      setHasUnsavedChanges(true);
    } catch (err) {
      setError(err.message || 'Failed to pick movies');
    } finally {
      setSpinLoading(false);
    }
  }

  async function handleSpinOne(targetIndex) {
    if (!Array.isArray(picks) || picks.length === 0) {
      setError('No schedule available to update.');
      return;
    }
    if (targetIndex === null || targetIndex === undefined) {
      setError('Select a valid day to spin.');
      return;
    }
    const resolvedIndex = Number(targetIndex);
    if (!Number.isFinite(resolvedIndex) || resolvedIndex < 0 || resolvedIndex >= picks.length) {
      setError('Select a valid day to spin.');
      return;
    }
    setError('');
    setSuccess('');
    setSingleSpinLoading(true);
    try {
      const movies = await randomItems({ count: 1 });
      const movie = Array.isArray(movies) ? movies[0] : null;
      if (!movie) {
        throw new Error('No movie returned from picker');
      }
      setPicks((current) =>
        current.map((slot, index) => (index === resolvedIndex ? { ...slot, movie } : slot)),
      );
      setHasUnsavedChanges(true);
    } catch (err) {
      setError(err.message || 'Failed to pick a movie');
    } finally {
      setSingleSpinLoading(false);
    }
  }

  async function handleSave() {
    if (picks.some((pick) => !pick.movie)) {
      setError('Pick movies for each day before saving.');
      return;
    }
    setSaving(true);
    setError('');
    setSuccess('');
    try {
      let token;
      if (user && typeof user.getIdToken === 'function') {
        try {
          token = await user.getIdToken();
        } catch (tokenErr) {
          console.warn('Failed to fetch auth token', tokenErr);
        }
      }
      const payload = picks.map((pick) => ({ date: pick.date, movie: pick.movie }));
      const saved = await saveWeeklyPicks(payload, token);
      if (saved && Array.isArray(saved.picks)) {
        setPicks(sortAndFormatPicks(saved.picks));
        setLastSavedDoc(saved);
      }
      setHasUnsavedChanges(false);
      setSuccess('Weekly picks saved to Firestore.');
    } catch (err) {
      setError(err.message || 'Failed to save weekly picks');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Layout>
      <div className="max-w-5xl mx-auto">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
          <div>
            <h1 className="text-3xl font-semibold">Weekly Picks</h1>
            <p className="opacity-80">Plan the next seven days of movie nights.</p>
          </div>
          {!hasMovies ? (
            <button
              type="button"
              onClick={handlePickMovies}
              className={`btn btn-primary ${spinLoading ? 'loading' : ''}`}
              disabled={spinLoading || singleSpinLoading}
            >
              {spinLoading ? 'Picking…' : 'Pick Movies'}
            </button>
          ) : (
            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleSave}
                className={`btn btn-primary ${saving ? 'loading' : ''}`}
                disabled={saving || !hasUnsavedChanges || singleSpinLoading}
              >
                {saving ? 'Saving…' : hasUnsavedChanges ? 'Save Picks' : 'Saved'}
              </button>
              <button
                type="button"
                onClick={handlePickMovies}
                className={`btn btn-secondary ${spinLoading ? 'loading' : ''}`}
                disabled={spinLoading || singleSpinLoading}
              >
                {spinLoading ? 'Spinning…' : 'Spin Again'}
              </button>
            </div>
          )}
        </div>

        <SingleDayDialog
          open={dayDialogOpen && Boolean(selectedDay)}
          pick={selectedDay}
          onClose={handleCloseDayDialog}
          onSpin={() => handleSpinOne(selectedDayIndex)}
          spinning={singleSpinLoading}
          disabled={spinLoading || saving}
        />

        {lastSavedMillis && (
          <p className="text-sm opacity-70 mb-3">
            Last saved {savedAtFormatter.format(new Date(lastSavedMillis))}
            {hasUnsavedChanges ? ' — unsaved changes pending.' : '.'}
          </p>
        )}
        {!lastSavedMillis && hasUnsavedChanges && (
          <p className="text-sm opacity-70 mb-3">Unsaved picks — don’t forget to save them.</p>
        )}

        {error && <div className="alert alert-error mb-4">{error}</div>}
        {success && <div className="alert alert-success mb-4">{success}</div>}

        {initialLoading ? (
          <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: DAYS_TO_PICK }).map((_, index) => (
              <div key={index} className="skeleton h-40" />
            ))}
          </div>
        ) : (
          <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
            {picks.map((pick, index) => (
              <WeeklyPickCard
                key={pick.date || index}
                pick={pick}
                onSelect={() => handleDayClick(index)}
                disabled={spinLoading || singleSpinLoading || saving}
              />
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
}
