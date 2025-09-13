import { useState } from 'react';
import Layout from '../ui/Layout.jsx';
import { findMovie, createItem } from '../api/functions.js';

export default function AIFindMovie() {
  const [title, setTitle] = useState('Jurassic World Rebirth');
  const [year, setYear] = useState(2025);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState(null);
  const [addOk, setAddOk] = useState('');

  async function onSearch(e) {
    e?.preventDefault();
    setError('');
    setAddOk('');
    setResult(null);
    setLoading(true);
    try {
      const data = await findMovie({ title, year });
      setResult(data);
    } catch (err) {
      setError(err.message || 'Failed to fetch movie');
    } finally {
      setLoading(false);
    }
  }

  async function onAdd() {
    if (!result) return;
    setError('');
    setAddOk('');
    try {
      console.log("-------------");
      console.log(result);
      const created = await createItem(result);
      setAddOk(`Added: ${created.id}`);
    } catch (err) {
      setError(err.message || 'Failed to add');
    }
  }

  return (
    <Layout>
      <div className="max-w-2xl mx-auto">
        <h1 className="text-2xl font-semibold mb-4">TMDB: Find Movie</h1>
        <form onSubmit={onSearch} className="flex gap-2 mb-4">
          <input
            className="input input-bordered flex-1"
            placeholder="Title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
          <input
            className="input input-bordered w-28"
            type="number"
            placeholder="Year"
            value={year}
            onChange={(e) => setYear(Number(e.target.value))}
          />
          <button className={`btn btn-primary ${loading ? 'loading' : ''}`} type="submit">
            {loading ? 'Searching' : 'Search'}
          </button>
        </form>

        {error && <div className="alert alert-error mb-3">{error}</div>}
        {addOk && <div className="alert alert-success mb-3">{addOk}</div>}

        {result && (
          <div className="card bg-base-200 shadow mb-6">
            <div className="card-body">
              <div className="flex gap-4">
                <div className="flex flex-col gap-2">
                  {result.poster_link && (
                    <img
                      src={result.poster_link}
                      alt={result.title || 'poster'}
                      className="w-32 h-48 object-cover rounded"
                      onError={(e) => {
                        e.currentTarget.style.display = 'none';
                      }}
                    />
                  )}
                  {result.landscape_poster_link && (
                    <img
                      src={result.landscape_poster_link}
                      alt={result.title || 'landscape poster'}
                      className="w-48 h-28 object-cover rounded"
                      onError={(e) => {
                        e.currentTarget.style.display = 'none';
                      }}
                    />
                  )}
                </div>
                <div>
                  <h2 className="card-title">{result.title} {result.year ? `(${result.year})` : ''}</h2>
                  {Array.isArray(result.genre) && (
                    <p className="opacity-80">Genres: {result.genre.join(', ')}</p>
                  )}
                  {Array.isArray(result.actors) && (
                    <p className="opacity-80">Actors: {result.actors.slice(0, 6).join(', ')}</p>
                  )}
                </div>
              </div>
              <div className="card-actions justify-end mt-4">
                <button className="btn btn-accent" onClick={onAdd}>Add to Firestore</button>
              </div>
              <pre className="mt-4 p-3 bg-base-300 rounded text-sm overflow-x-auto">
                {JSON.stringify(result, null, 2)}
              </pre>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}

