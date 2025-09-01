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

// POST /createItem  { title, description? }
exports.createItem = onRequest(async (req, res) => {
  handleOptions(req, res);
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  const body = await readJson(req);
  const title = typeof body.title === 'string' ? body.title.trim() : '';
  const description = typeof body.description === 'string' ? body.description : undefined;
  if (!title) return res.status(400).json({ error: 'title is required' });
  try {
    const now = Date.now();
    const ref = await col().add({ title, description, createdAt: now, updatedAt: now });
    const snap = await ref.get();
    setCors(res);
    return res.status(201).json({ id: ref.id, ...snap.data() });
  } catch (err) {
    logger.error('createItem failed', err);
    return res.status(500).json({ error: 'Internal error' });
  }
});

// PATCH /updateItem  { id, title?, description? }
exports.updateItem = onRequest(async (req, res) => {
  handleOptions(req, res);
  if (req.method !== 'PATCH' && req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  const body = await readJson(req);
  const id = typeof body.id === 'string' ? body.id : '';
  if (!id) return res.status(400).json({ error: 'id is required' });
  const patch = {};
  if (typeof body.title === 'string') patch.title = body.title;
  if (typeof body.description === 'string') patch.description = body.description;
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
