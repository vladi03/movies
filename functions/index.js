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

// GET /randomItems
exports.randomItems = onRequest(async (req, res) => {
  handleOptions(req, res);
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });
  try {
    const snap = await col().limit(50).get();
    const docs = snap.docs
      .map((d) => ({ id: d.id, ...d.data() }))
      .filter((m) => m.landscape_poster_link || m.poster_link);
    const withLandscape = docs.filter((m) => m.landscape_poster_link);
    const others = docs.filter((m) => !m.landscape_poster_link);
    function shuffle(arr) {
      for (let i = arr.length - 1; i > 0; i -= 1) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
      }
      return arr;
    }
    const selected = shuffle(withLandscape).slice(0, 4);
    if (selected.length < 4) {
      selected.push(...shuffle(others).slice(0, 4 - selected.length));
    }
    setCors(res);
    return res.status(200).json({ movies: selected });
  } catch (err) {
    logger.error('randomItems failed', err);
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

// POST /aiFindMovie  { title, year }  or GET with ?title=&year=
// Calls OpenAI Responses API with web_search tool to fetch authoritative movie info
exports.aiFindMovie = onRequest({ timeoutSeconds: 120 }, async (req, res) => {
  handleOptions(req, res);
  if (!['GET', 'POST'].includes(req.method)) return res.status(405).json({ error: 'Method not allowed' });
  try {
    const body = req.method === 'POST' ? await readJson(req) : req.query;
    const title = typeof body.title === 'string' ? body.title.trim() : '';
    const year = body.year !== undefined ? String(body.year).trim() : '';
    if (!title || !year) return res.status(400).json({ error: 'title and year are required' });

    const apiKey = process.env.OPENAI_API_KEY || process.env.OPENAI_API_TOKEN;
    if (!apiKey) return res.status(500).json({ error: 'Server missing OPENAI_API_KEY' });

    const input = `Find authoritative information about the movie "${title}" (${year}). Provide both a vertical poster_link and a horizontal landscape_poster_link as working image URLs (prefer TMDB or Wikipedia).`;

    const payload = {
      model: 'gpt-5-nano',
      tools: [{ type: 'web_search' }],
      input,
    };
    payload.text = {
      format: {
        type: 'json_schema',
        name: 'movie_info',
        schema: {
          type: 'object',
          properties: {
            title: { type: 'string', description: 'only the title, not the year' },
            name: { type: 'string', description: 'the title and year' },
            year: { type: 'integer' },
            actors: { type: 'array', items: { type: 'string' } },
            genre: { type: 'array', items: { type: 'string' } },
            poster_link: { type: 'string' },
            landscape_poster_link: { type: 'string' }
          },
          required: ['title','name','year','actors','genre','poster_link','landscape_poster_link'],
          additionalProperties: false
        }
      }
    };

    const resp = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const text = await resp.text();
    let data;
    try {
      data = JSON.parse(text);
    } catch {
      data = { raw: text };
    }

    // Extract the JSON object from OpenAI Responses output
    function extractMovieObject(d) {
      // 1) Direct output_text string
      if (typeof d?.output_text === 'string') {
        try { return JSON.parse(d.output_text); } catch {}
      }
      // 2) New Responses shape: d.output[].content[].text
      if (Array.isArray(d?.output)) {
        for (const item of d.output) {
          if (item?.type === 'message' && Array.isArray(item.content)) {
            for (const c of item.content) {
              if (c?.type === 'output_text' && typeof c.text === 'string') {
                try { return JSON.parse(c.text); } catch {}
              }
            }
          }
        }
      }
      return null;
    }

    const movie = extractMovieObject(data);
    setCors(res);
    if (movie) {
      if (typeof movie.poster_link === 'string') {
        const match = movie.poster_link.match(/https?:\/\/\S+/);
        if (match) movie.poster_link = match[0];
      }
      if (typeof movie.landscape_poster_link === 'string') {
        const match2 = movie.landscape_poster_link.match(/https?:\/\/\S+/);
        if (match2) movie.landscape_poster_link = match2[0];
      }
      return res.status(200).json(movie);
    }
    // Fallback: return raw API JSON to aid debugging
    return res.status(200).json(data);
  } catch (err) {
    logger.error('aiFindMovie failed', err);
    return res.status(500).json({ error: 'Internal error' });
  }
});
