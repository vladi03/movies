# Firebase Setup: Firestore and Cloud Functions (Console + CLI)

This guide walks you through enabling Firestore and Cloud Functions in the Firebase Console and deploying from your local repo.

## Prerequisites

- Firebase project Owner/Editor access
- Node.js 18+ and npm
- Firebase CLI: `npm i -g firebase-tools`
- Default project configured locally (repo root `.firebaserc` points to your project id)

## 1) Enable Firestore (Console)

1. Open Firebase Console → Your project.
2. Go to Build → Firestore Database → Create database.
3. Choose a location (pick once; cannot change later).
4. Select Production mode (recommended). For quick local tests you can use Test mode, but update rules before going live.
5. (Optional) Create an initial collection (e.g., `items`) and add a sample document to verify reads.

### Firestore Rules

- You can manage rules in the console (Firestore → Rules), or from this repo via `firestore.rules` at the project root:
  - Path: `firestore.rules:1`
  - Example (authenticated read‑only):
    ```
    rules_version = '2';
    service cloud.firestore {
      match /databases/{database}/documents {
        match /items/{id} {
          allow read: if request.auth != null;
          allow write: if false;
        }
      }
    }
    ```
- Deploy rules from the repo:
  ```sh
  firebase deploy --only firestore:rules
  ```

### Indexes

- If the app prompts for a composite index, follow the error link to create it in the console (Firestore → Indexes → Composite → Add index). Re‑run your query afterwards.

## 2) Enable Cloud Functions (Console)

1. In Firebase Console → Build → Functions → Get started.
2. Choose a default region (e.g., `us-central1`). You’ll deploy functions to this region unless specified otherwise.
3. Ensure required services are enabled (Firebase Console prompts you):
   - Cloud Functions API
   - Cloud Build API
4. Billing: Some triggers and outbound network calls require billing. For basic HTTPS/callable functions without external egress you can start on the free Spark plan. If you need paid features, set up billing under Project Settings → Usage and billing.

Note: The Firebase Console is primarily for enabling services and monitoring. Authoring/deploying function code is done locally with the Firebase CLI.

## 3) Initialize Functions Locally (CLI)

If you don’t have a `functions/` directory yet:

```sh
firebase init functions
# Choose: JavaScript or TypeScript, your Node version, and install deps
```

Example HTTP function (TypeScript names differ slightly):

```js
// functions/index.js
const { onRequest } = require('firebase-functions/v2/https');

exports.helloWorld = onRequest((req, res) => {
  res.send('Hello from Firebase Functions!');
});
```

Deploy functions:

```sh
firebase deploy --only functions
```

After deploy, you’ll see the HTTPS URL in the CLI output and under Console → Build → Functions.

## 4) Environment Config (Functions)

Use Firebase Functions config for server‑side secrets (don’t hardcode in code):

```sh
firebase functions:config:set service.api_key="YOUR_KEY"
firebase deploy --only functions
```

Read it in code:

```js
const functions = require('firebase-functions');
const apiKey = functions.config().service.api_key;
```

## 5) Local Testing (Optional)

- Emulators: `firebase emulators:start --only firestore,functions`
- Add the emulator config to your app as needed (Auth/Firestore/Functions SDKs support emulator hosts).

## 6) Troubleshooting

- Project/Region mismatch: Ensure your function region matches what you selected in the Console (or specify `region()` in code).
- Permissions: If deploys fail, confirm your Google account has `Editor` or `Firebase Admin` on the project.
- Billing required: Outbound HTTP calls, scheduled functions, or certain triggers need billing enabled.
- Firestore denied: Update rules to allow the reads/writes your app requires and re‑deploy `firestore.rules`.

## Quick Commands Recap

```sh
# From repo root
firebase deploy --only firestore:rules
firebase deploy --only functions
```

If you also deploy hosting for the built UI in `web/dist`:

```sh
cd web && npm ci && npm run build && cd ..
firebase deploy --only hosting
```

