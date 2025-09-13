#!/usr/bin/env node
/*
  Populate poster_link and landscape_poster_link for all movies in Firestore.

  Strategy:
    - Iterate documents in the target collection (default: 'items').
    - For each doc with a title (or name) and year, call the deployed
      HTTPS Cloud Function `findMovie` to resolve poster URLs.
    - Update Firestore with any missing poster fields (or overwrite with --force).

  Why call the Cloud Function vs. hitting TMDB directly?
    - The function already encapsulates the search logic and uses the
      server-side TMDB token. This avoids needing TMDB_BEARER locally.

  Usage examples:
    node mcp/scripts/update_posters.js
    node mcp/scripts/update_posters.js --collection items --limit 100
    node mcp/scripts/update_posters.js --force
    node mcp/scripts/update_posters.js --dry-run

  Environment/project resolution:
    - Project id: FIREBASE_PROJECT_ID | GOOGLE_CLOUD_PROJECT | .firebaserc | web/.env.local
    - Admin credentials: GOOGLE_APPLICATION_CREDENTIALS or secrets/*.json
*/

import fs from 'fs';
import path from 'path';
import url from 'url';
import admin from 'firebase-admin';

const __dirname = path.dirname(url.fileURLToPath(import.meta.url));

function parseArgs() {
  const args = process.argv.slice(2);
  const out = {};
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a.startsWith('--')) {
      const key = a.replace(/^--/, '');
      const val = args[i + 1] && !args[i + 1].startsWith('--') ? args[++i] : true;
      out[key] = val;
    }
  }
  return out;
}

function sleep(ms) {
  return new Promise((res) => setTimeout(res, ms));
}

async function resolveProjectId(repoRoot) {
  try {
    if (process.env.FIREBASE_PROJECT_ID) return process.env.FIREBASE_PROJECT_ID;
    if (process.env.GOOGLE_CLOUD_PROJECT) return process.env.GOOGLE_CLOUD_PROJECT;
    const firebaserc = path.join(repoRoot, '.firebaserc');
    if (fs.existsSync(firebaserc)) {
      const json = JSON.parse(fs.readFileSync(firebaserc, 'utf8'));
      const id = json?.projects?.default;
      if (id && typeof id === 'string' && !id.includes('<')) return id;
    }
    const viteEnv = path.join(repoRoot, 'web', '.env.local');
    if (fs.existsSync(viteEnv)) {
      const txt = fs.readFileSync(viteEnv, 'utf8');
      for (const line of txt.split(/\r?\n/)) {
        const m = line.match(/^VITE_FIREBASE_PROJECT_ID=(.+)$/);
        if (m) return m[1].trim();
      }
    }
  } catch {}
  return undefined;
}

function initAdmin(projectId, repoRoot) {
  let credSource = 'Application Default Credentials (gcloud)';
  if (!admin.apps.length) {
    const secretsDir = path.join(repoRoot, 'secrets');
    const useSecrets = !process.env.GOOGLE_APPLICATION_CREDENTIALS && fs.existsSync(secretsDir);
    let initialized = false;
    if (useSecrets) {
      const jsonFiles = fs.readdirSync(secretsDir).filter(f => f.toLowerCase().endsWith('.json'));
      if (jsonFiles.length > 0) {
        const chosen = jsonFiles.find(f => f.includes(projectId)) || jsonFiles[0];
        const saPath = path.join(secretsDir, chosen);
        try {
          const sa = JSON.parse(fs.readFileSync(saPath, 'utf8'));
          admin.initializeApp({ credential: admin.credential.cert(sa), projectId });
          credSource = `secrets/${chosen}`;
          initialized = true;
        } catch (e) {
          console.warn(`Failed to use secrets JSON at ${saPath}:`, e?.message || e);
        }
      }
    }
    if (!initialized) {
      try {
        admin.initializeApp({ credential: admin.credential.applicationDefault(), projectId });
        if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
          credSource = `GOOGLE_APPLICATION_CREDENTIALS=${process.env.GOOGLE_APPLICATION_CREDENTIALS}`;
        }
      } catch (e) {
        console.error('\nFailed to initialize Firebase Admin credentials.');
        console.error('- Place a service account JSON under repo-root /secrets/, or');
        console.error('- Set GOOGLE_APPLICATION_CREDENTIALS to the JSON path, or');
        console.error('- Run "gcloud auth application-default login" to create ADC, then retry.');
        console.error('Original error:', e?.message || e);
        process.exit(1);
      }
    }
  }
  return credSource;
}

async function callFindMovie(projectId, title, year) {
  // Use cloudfunctions.net proxy for Gen2 (works for Gen1 too)
  const base = `https://us-central1-${projectId}.cloudfunctions.net/findMovie`;
  const url = `${base}?title=${encodeURIComponent(title)}&year=${encodeURIComponent(String(year))}`;
  const resp = await fetch(url, { method: 'GET', headers: { accept: 'application/json' } });
  const text = await resp.text();
  let json;
  try {
    json = JSON.parse(text);
  } catch {
    throw new Error(`findMovie non-JSON response (status ${resp.status}): ${text.slice(0, 200)}`);
  }
  if (!resp.ok) {
    const msg = json?.error || resp.statusText || `HTTP ${resp.status}`;
    throw new Error(`findMovie failed for "${title}" (${year}): ${msg}`);
  }
  return json;
}

async function main() {
  const args = parseArgs();
  const repoRoot = path.resolve(__dirname, '..', '..');
  const projectId = await resolveProjectId(repoRoot);
  if (!projectId) {
    console.error('Project id is required. Set FIREBASE_PROJECT_ID or GOOGLE_CLOUD_PROJECT, or configure .firebaserc or web/.env.local');
    process.exit(1);
  }
  const collection = args.collection || process.env.FIRESTORE_COLLECTION || 'items';
  const force = Boolean(args.force);
  const dryRun = Boolean(args.dryRun || args['dry-run']);
  const limit = args.limit ? Number(args.limit) : undefined;
  const delayMs = args.delay ? Number(args.delay) : 400; // be nice to the API

  const credSource = initAdmin(projectId, repoRoot);
  console.log(`Using project: ${projectId}`);
  console.log(`Credentials: ${credSource}`);
  console.log(`Collection: ${collection}`);
  if (dryRun) console.log('Mode: DRY RUN (no writes)');
  if (force) console.log('Mode: FORCE (overwrite existing poster links)');

  const db = admin.firestore();
  let q = db.collection(collection);
  if (limit && !Number.isNaN(limit)) q = q.limit(limit);
  const snap = await q.get();
  const docs = snap.docs;
  console.log(`Fetched ${docs.length} documents`);

  let processed = 0;
  let updated = 0;
  let skipped = 0;
  let failures = 0;

  for (const d of docs) {
    processed += 1;
    const m = d.data() || {};
    const id = d.id;
    const title = (m.title || m.name || '').toString().trim();
    const year = m.year !== undefined && m.year !== null ? Number(m.year) : undefined;
    const havePoster = Boolean(m.poster_link);
    const haveLandscape = Boolean(m.landscape_poster_link);
    const haveBoth = havePoster && haveLandscape;

    if (!title || !year) {
      skipped += 1;
      console.log(`[skip] ${id}: missing title/year`);
      continue;
    }
    if (haveBoth && !force) {
      skipped += 1;
      console.log(`[skip] ${id}: already has both URLs`);
      continue;
    }

    try {
      const res = await callFindMovie(projectId, title, year);
      const patch = {};
      if (res.poster_link && (force || !havePoster)) patch.poster_link = res.poster_link;
      if (res.landscape_poster_link && (force || !haveLandscape)) patch.landscape_poster_link = res.landscape_poster_link;
      if (Object.keys(patch).length === 0) {
        skipped += 1;
        console.log(`[skip] ${id}: no new data`);
      } else {
        patch.updatedAt = Date.now();
        if (!dryRun) await d.ref.update(patch);
        updated += 1;
        console.log(`[ok]   ${id}: ${patch.poster_link ? 'poster' : ''} ${patch.landscape_poster_link ? 'landscape' : ''}`.trim());
      }
    } catch (e) {
      failures += 1;
      console.warn(`[fail] ${id}: ${e?.message || e}`);
    }

    await sleep(delayMs);
  }

  console.log('\nDone');
  console.log(`Processed: ${processed}`);
  console.log(`Updated:   ${updated}`);
  console.log(`Skipped:   ${skipped}`);
  console.log(`Failures:  ${failures}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

