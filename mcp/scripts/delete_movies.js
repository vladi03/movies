#!/usr/bin/env node
/*
  Delete movie documents from Firestore by id or by title/year.

  Examples:
    node mcp/scripts/delete_movies.js --id IJT71aSGqg7I9tVdD2WF
    node mcp/scripts/delete_movies.js --title "The Making of 'Alien 3'" --year 1992
    node mcp/scripts/delete_movies.js --title "Foo" --year 2001 --dry-run

  Project/credentials resolution mirrors other MCP scripts.
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

async function main() {
  const args = parseArgs();
  const repoRoot = path.resolve(__dirname, '..', '..');
  const projectId = await resolveProjectId(repoRoot);
  if (!projectId) {
    console.error('Project id is required. Set FIREBASE_PROJECT_ID or GOOGLE_CLOUD_PROJECT, or configure .firebaserc or web/.env.local');
    process.exit(1);
  }
  const collection = args.collection || process.env.FIRESTORE_COLLECTION || 'items';
  const dryRun = Boolean(args.dryRun || args['dry-run']);
  const id = args.id ? String(args.id) : undefined;
  const title = args.title ? String(args.title) : undefined;
  const year = args.year !== undefined ? Number(args.year) : undefined;

  if (!id && (!title || Number.isNaN(year))) {
    console.error('Provide --id OR both --title and --year');
    process.exit(1);
  }

  const credSource = initAdmin(projectId, repoRoot);
  console.log(`Using project: ${projectId}`);
  console.log(`Credentials: ${credSource}`);
  console.log(`Collection: ${collection}`);
  if (dryRun) console.log('Mode: DRY RUN (no writes)');

  const db = admin.firestore();
  const col = db.collection(collection);

  let targets = [];
  if (id) {
    const ref = col.doc(id);
    const snap = await ref.get();
    if (!snap.exists) {
      console.error(`No document found with id: ${id}`);
      process.exit(2);
    }
    targets = [snap];
  } else {
    // Query by title first; filter by year locally to avoid composite index requirements
    const qs = await col.where('title', '==', title).get();
    targets = qs.docs.filter(d => Number(d.data()?.year) === year);
    if (targets.length === 0) {
      console.error(`No documents found for title='${title}' and year=${year}`);
      process.exit(2);
    }
  }

  console.log(`Found ${targets.length} document(s) to delete:`);
  for (const d of targets) {
    const m = d.data() || {};
    console.log(` - ${d.id}: ${m.title || m.name || '(untitled)'} (${m.year ?? '?'})`);
  }

  if (dryRun) return;

  for (const d of targets) {
    await d.ref.delete();
    console.log(`[deleted] ${d.id}`);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

