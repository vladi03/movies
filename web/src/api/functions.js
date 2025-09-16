// Minimal client for calling HTTPS Functions
const region = import.meta.env.VITE_FUNCTIONS_REGION || 'us-central1';
const projectId = import.meta.env.VITE_FIREBASE_PROJECT_ID;
// Allow overriding base to hit the local emulator
const useEmulator = String(import.meta.env.VITE_FUNCTIONS_EMULATOR || '').toLowerCase() === 'true';
const overrideBase = import.meta.env.VITE_FUNCTIONS_BASE_URL;
const base = overrideBase
  ? overrideBase.replace(/\/$/, '')
  : useEmulator
    ? `http://127.0.0.1:5001/${projectId}/${region}`
    : `https://${region}-${projectId}.cloudfunctions.net`;

async function call(path, { method = 'GET', body, token } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(`${base}/${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `${method} ${path} failed: ${res.status}`);
  }
  const ct = res.headers.get('content-type') || '';
  return ct.includes('application/json') ? res.json() : res.text();
}

export async function createItem({ title, name, year, actors, genre, poster_link, landscape_poster_link }, token) {
  return call('createItem', { method: 'POST', body: { title, name, year, actors, genre, poster_link, landscape_poster_link }, token });
}

export async function deleteItem(id, token) {
  // Supports DELETE with query param
  return call(`deleteItem?id=${encodeURIComponent(id)}`, { method: 'DELETE', token });
}

export async function getItem(id, token) {
  return call(`getItem?id=${encodeURIComponent(id)}`, { method: 'GET', token });
}

export async function listItems(limit, token) {
  const qp = typeof limit === 'number' ? `?limit=${limit}` : '';
  return call(`listItems${qp}`, { method: 'GET', token });
}

export async function updateItem(data, token) {
  if (!data || typeof data !== 'object') {
    throw new Error('updateItem requires an object with the fields to update');
  }
  return call('updateItem', { method: 'PATCH', body: data, token });
}

// Fetch movie info from TMDB
export async function findMovie({ title, year }, token) {
  return call('findMovie', { method: 'POST', body: { title, year }, token });
}

// Fetch a few random items suitable for hero carousel
export async function randomItems(token) {
  const res = await call('randomItems', { method: 'GET', token });
  // Backend returns { movies: [...] }
  return Array.isArray(res?.movies) ? res.movies : res;
}
