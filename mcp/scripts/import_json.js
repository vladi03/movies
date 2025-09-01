#!/usr/bin/env node
/*
  Import a JSON file into Firestore using Firebase Admin SDK.

  Usage examples (run from repo root or mcp/):
    # Defaults: file=import_data/complete_movie_data.json, collection=items
    npm --prefix mcp run import

    # Custom args
    node mcp/scripts/import_json.js --file import_data/complete_movie_data.json --collection movies --idField id

  Project id resolution order (no env needed):
    1) FIREBASE_PROJECT_ID (if set)
    2) GOOGLE_CLOUD_PROJECT (if set)
    3) ./.firebaserc → projects.default
    4) ./web/.env.local → VITE_FIREBASE_PROJECT_ID

  Required env:
    - GOOGLE_APPLICATION_CREDENTIALS=path/to/service-account.json (Admin SDK)
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

function chunk(arr, size) {
  const res = [];
  for (let i = 0; i < arr.length; i += size) res.push(arr.slice(i, i + size));
  return res;
}

async function main() {
  const args = parseArgs();
  // Resolve repo root (mcp/scripts -> repo root)
  const repoRoot = path.resolve(__dirname, '..', '..');

  function readFirebaserc(root) {
    try {
      const p = path.join(root, '.firebaserc');
      if (!fs.existsSync(p)) return undefined;
      const json = JSON.parse(fs.readFileSync(p, 'utf8'));
      const id = json?.projects?.default;
      if (id && typeof id === 'string' && !id.includes('<')) return id;
    } catch {}
    return undefined;
  }

  function readViteEnvProjectId(root) {
    try {
      const p = path.join(root, 'web', '.env.local');
      if (!fs.existsSync(p)) return undefined;
      const txt = fs.readFileSync(p, 'utf8');
      for (const line of txt.split(/\r?\n/)) {
        const m = line.match(/^VITE_FIREBASE_PROJECT_ID=(.+)$/);
        if (m) return m[1].trim();
      }
    } catch {}
    return undefined;
  }

  const projectId = process.env.FIREBASE_PROJECT_ID
    || process.env.GOOGLE_CLOUD_PROJECT
    || readFirebaserc(repoRoot)
    || readViteEnvProjectId(repoRoot);

  if (!projectId) {
    console.error('Project id is required. Set FIREBASE_PROJECT_ID or GOOGLE_CLOUD_PROJECT, or configure .firebaserc projects.default or web/.env.local VITE_FIREBASE_PROJECT_ID');
    process.exit(1);
  }
  // Credentials: prefer GOOGLE_APPLICATION_CREDENTIALS if set; otherwise rely on
  // Application Default Credentials (e.g., gcloud ADC). We'll attempt init and
  // surface a helpful message if it fails.

  const fileArg = args.file || 'import_data/complete_movie_data.json';
  // Resolve relative to repo root
  const filePath = path.isAbsolute(fileArg) ? fileArg : path.resolve(repoRoot, fileArg);
  const collection = args.collection || 'items';
  const idField = args.idField; // optional

  if (!fs.existsSync(filePath)) {
    console.error(`File not found: ${filePath}`);
    process.exit(1);
  }

  const raw = fs.readFileSync(filePath, 'utf8');
  let data;
  try {
    data = JSON.parse(raw);
  } catch (e) {
    console.error('Failed to parse JSON:', e.message);
    process.exit(1);
  }

  // Normalize to array of {id?, ...}
  let records = [];
  if (Array.isArray(data)) {
    records = data;
  } else if (data && typeof data === 'object') {
    // Treat keys as IDs
    records = Object.entries(data).map(([id, doc]) => ({ id, ...(doc || {}) }));
  } else {
    console.error('Unsupported JSON shape. Provide an array or an object map.');
    process.exit(1);
  }

  if (records.length === 0) {
    console.log('No records to import.');
    return;
  }

  let credSource = 'Application Default Credentials (gcloud)';
  if (!admin.apps.length) {
    // If GOOGLE_APPLICATION_CREDENTIALS is set, applicationDefault() will pick it up.
    // Otherwise, auto-discover a JSON in repo-root /secrets/ and use cert() from that.
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
        admin.initializeApp({
          credential: admin.credential.applicationDefault(),
          projectId
        });
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

  console.log(`Using project: ${projectId}\nCredentials: ${credSource}`);
  const db = admin.firestore();

  console.log(`Importing ${records.length} documents into collection '${collection}' (project: ${projectId})`);

  const CHUNK_SIZE = 450; // under Firestore 500 writes limit
  let written = 0;

  for (const batchRecords of chunk(records, CHUNK_SIZE)) {
    const batch = db.batch();
    for (const rec of batchRecords) {
      const { id: recId, ...doc } = rec || {};
      const id = idField && rec && rec[idField] ? String(rec[idField]) : recId ? String(recId) : undefined;
      const ref = id ? db.collection(collection).doc(id) : db.collection(collection).doc();
      batch.set(ref, doc, { merge: true });
    }
    await batch.commit();
    written += batchRecords.length;
    console.log(`Committed ${written}/${records.length}`);
  }

  console.log('Import complete');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
