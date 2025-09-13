// HTTPS Functions exposing Firestore-backed tools (2nd gen)
const { onRequest } = require('firebase-functions/v2/https');
const logger = require('firebase-functions/logger');
const admin = require('firebase-admin');

// Initialize Admin SDK once
if (!admin.apps.length) {
  admin.initializeApp();
}
const db = admin.firestore();
const collectionName = process.env.FIRESTORE_COLLECTION || 'items';
const col = () => db.collection(collectionName);

function setCors(res) {
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Access-Control-Allow-Methods', 'GET,POST,PATCH,DELETE,OPTIONS');
  res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
}

function handleOptions(req, res) {
  setCors(res);
  if (req.method === 'OPTIONS') {
    return res.status(204).send('');
  }
}

async function readJson(req) {
  if (req.body && typeof req.body === 'object') return req.body;
  try {
    return JSON.parse(req.rawBody?.toString() || '{}');
  } catch {
    return {};
  }
}

// GET /listItems?limit=10
exports.listItems = onRequest(async (req, res) => {
  handleOptions(req, res);
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });
  try {
    const limit = req.query.limit ? parseInt(String(req.query.limit), 10) : undefined;
    // Order by release year to include older imports that may lack createdAt
    let q = col().orderBy('year', 'desc');
    if (limit && !Number.isNaN(limit)) q = q.limit(limit);
    const snap = await q.get();
    const items = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    setCors(res);
    return res.status(200).json(items);
  } catch (err) {
    logger.error('listItems failed', err);
    return res.status(500).json({ error: 'Internal error' });
  }
});

// GET /getItem?id=ABC
exports.getItem = onRequest(async (req, res) => {
  handleOptions(req, res);
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });
  const id = String(req.query.id || '');
  if (!id) return res.status(400).json({ error: 'Missing id' });
  try {
    const doc = await col().doc(id).get();
    if (!doc.exists) return res.status(404).json({ error: 'Not found' });
    setCors(res);
    return res.status(200).json({ id: doc.id, ...doc.data() });
  } catch (err) {
    logger.error('getItem failed', err);
    return res.status(500).json({ error: 'Internal error' });
  }
});

// POST /createItem  { title, description?, ...movie fields }
exports.createItem = onRequest(async (req, res) => {
  handleOptions(req, res);
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  const body = await readJson(req);
  const title = typeof body.title === 'string' ? body.title.trim() : '';
  if (!title) return res.status(400).json({ error: 'title is required' });
  try {
    const now = Date.now();
    // Whitelist known movie fields and drop undefined values
    const allowed = ['name', 'title', 'year', 'actors', 'genre', 'poster_link', 'landscape_poster_link', 'description', 'createdAt', 'updatedAt'];
    const doc = {};
    for (const key of allowed) {
      if (Object.prototype.hasOwnProperty.call(body, key) && body[key] !== undefined) {
        doc[key] = body[key];
      }
    }
    // Ensure required fields and timestamps
    doc.title = title;
    if (!('createdAt' in doc)) doc.createdAt = now;
    doc.updatedAt = now;

    const ref = await col().add(doc);
    const snap = await ref.get();
    setCors(res);
    return res.status(201).json({ id: ref.id, ...snap.data() });
  } catch (err) {
    logger.error('createItem failed', err);
    return res.status(500).json({ error: 'Internal error' });
  }
});

// PATCH /updateItem  { id, ...movie fields }
exports.updateItem = onRequest(async (req, res) => {
  handleOptions(req, res);
  if (req.method !== 'PATCH' && req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  const body = await readJson(req);
  const id = typeof body.id === 'string' ? body.id : '';
  if (!id) return res.status(400).json({ error: 'id is required' });
  // Whitelist updatable fields and ignore undefined values
  const allowed = ['name', 'title', 'year', 'actors', 'genre', 'poster_link', 'landscape_poster_link', 'description'];
  const patch = {};
  for (const key of allowed) {
    if (Object.prototype.hasOwnProperty.call(body, key) && body[key] !== undefined) {
      patch[key] = body[key];
    }
  }
  try {
    const ref = col().doc(id);
    const snap = await ref.get();
    if (!snap.exists) return res.status(404).json({ error: 'Not found' });
    await ref.update({ ...patch, updatedAt: Date.now() });
    const updated = await ref.get();
    setCors(res);
    return res.status(200).json({ id: updated.id, ...updated.data() });
  } catch (err) {
    logger.error('updateItem failed', err);
    return res.status(500).json({ error: 'Internal error' });
  }
});

// DELETE /deleteItem?id=ABC  or POST with { id }
exports.deleteItem = onRequest(async (req, res) => {
  handleOptions(req, res);
  if (!['DELETE', 'POST'].includes(req.method)) return res.status(405).json({ error: 'Method not allowed' });
  const id = req.method === 'DELETE' ? String(req.query.id || '') : String((await readJson(req)).id || '');
  if (!id) return res.status(400).json({ error: 'id is required' });
  try {
    await col().doc(id).delete();
    setCors(res);
    return res.status(200).json({ ok: true, id });
  } catch (err) {
    logger.error('deleteItem failed', err);
    return res.status(500).json({ error: 'Internal error' });
  }
});

// GET/POST /findMovie?title=&year=
// Fetches movie data from TMDB, returning cast, genres and poster URLs
exports.findMovie = onRequest({ timeoutSeconds: 60 }, async (req, res) => {
  handleOptions(req, res);
  if (!['GET', 'POST'].includes(req.method)) {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  try {
    const body = req.method === 'POST' ? await readJson(req) : req.query;
    const title = typeof body.title === 'string' ? body.title.trim() : '';
    const year = body.year !== undefined ? String(body.year).trim() : '';
    if (!title || !year) return res.status(400).json({ error: 'title and year are required' });

    const token = process.env.TMDB_BEARER;
    if (!token) return res.status(500).json({ error: 'Server missing TMDB_BEARER' });

    const headers = { Authorization: `Bearer ${token}`, accept: 'application/json' };
    const searchUrl = `https://api.themoviedb.org/3/search/movie?query=${encodeURIComponent(title)}&include_adult=false&language=en-US&year=${encodeURIComponent(year)}&page=1`;
    const searchResp = await fetch(searchUrl, { headers });
    const searchData = await searchResp.json();
    const first = Array.isArray(searchData.results) ? searchData.results[0] : null;
    if (!first) {
      setCors(res);
      return res.status(404).json({ error: 'Movie not found' });
    }

    const detailUrl = `https://api.themoviedb.org/3/movie/${first.id}?append_to_response=credits`;
    const detailResp = await fetch(detailUrl, { headers });
    const detail = await detailResp.json();

    const genres = Array.isArray(detail.genres) ? detail.genres.map(g => g.name) : [];
    const actors = Array.isArray(detail.credits?.cast)
      ? detail.credits.cast.slice(0, 10).map(c => c.name).filter(Boolean)
      : [];

    const poster_link = first.poster_path
      ? `https://image.tmdb.org/t/p/w500${first.poster_path}`
      : undefined;
    const landscape_poster_link = first.backdrop_path
      ? `https://image.tmdb.org/t/p/w780${first.backdrop_path}`
      : undefined;

    const result = {
      title: detail.title || first.title,
      name: detail.title ? `${detail.title} (${year})` : first.title,
      year: Number(year),
      actors,
      genre: genres,
      poster_link,
      landscape_poster_link,
    };

    setCors(res);
    return res.status(200).json(result);
  } catch (err) {
    logger.error('findMovie failed', err);
    return res.status(500).json({ error: 'Internal error' });
  }
});
