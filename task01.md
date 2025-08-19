
---

# TASK: Read-only React SPA (Firebase Auth + Display) + MCP Server for Firestore CRUD

**Branch to create:** `feat/react-spa-mcp-firestore`
**Default branch:** `main`
**Firebase project id:** `<FIREBASE_PROJECT_ID>`
**Firestore collection:** `items`
**Auth providers:** Google (and Email/Password if available)
**Language:** JavaScript (no TypeScript)

> Goal: The browser UI only authenticates and **displays** data. **All CRUD** operations are performed through an **MCP server** (run locally and invoked from ChatGPT), not from the SPA.

---

## Inputs (set/confirm)

* `<GIT_REPO_URL>`
* `<FIREBASE_PROJECT_ID>`
* Firebase client config (API key, auth domain, etc.)
* A **service account JSON** for local MCP (do **not** commit)

---

## Acceptance Criteria

* [ ] A **React (Vite, JS) SPA** in `/web` that:

  * [ ] Authenticates with Firebase (Google sign-in at minimum).
  * [ ] Displays documents from Firestore collection `items` (real-time or on load).
  * [ ] **No write controls** in the UI (read-only messaging visible).
* [ ] **Firestore rules** that allow **read for authenticated users** and **deny all writes**.
* [ ] An **MCP server** in `/mcp` (Node + `firebase-admin`) that exposes tools:

  * [ ] `listItems(limit?)`
  * [ ] `getItem(id)`
  * [ ] `createItem({ title, description? })`
  * [ ] `updateItem({ id, title?, description? })`
  * [ ] `deleteItem(id)`
* [ ] Clear **README instructions** to run SPA and MCP locally; Deploy SPA to Firebase Hosting.
* [ ] Open a **PR to `main`** with title `feat: read-only React SPA + MCP Firestore CRUD` and the checklist above.

---

## High-Level Plan

1. **Branch & prep**

   * Create `feat/react-spa-mcp-firestore`.
   * Preserve existing static HTML/CSS; we’ll migrate visual layout into React components as needed.

2. **Web app (`/web`)**

   * Scaffold with Vite (React, JS):

     ```bash
     npm create vite@latest web -- --template react
     ```
   * Install deps: `firebase`, `react-router-dom`, `zod`.
   * Add Firebase client init (`web/src/firebase.js`) using **`.env.local`** values:

     ```
     VITE_FIREBASE_API_KEY=...
     VITE_FIREBASE_AUTH_DOMAIN=...
     VITE_FIREBASE_PROJECT_ID=<FIREBASE_PROJECT_ID>
     VITE_FIREBASE_APP_ID=...
     VITE_FIREBASE_STORAGE_BUCKET=...
     VITE_FIREBASE_MESSAGING_SENDER_ID=...
     ```
   * Implement:

     * `AuthGate.jsx`: Google sign-in/out, provides `user` context.
     * `ItemsPage.jsx`: subscribes to `items` (ordered by `createdAt desc`) and renders list only.
     * Add banner/text noting writes are disabled in UI and must be done via MCP.
   * Optional: migrate relevant HTML/CSS from original `index.html` into components (keep look & feel).

3. **Firestore security rules (read-only UI)**

   * Create `firestore.rules`:

     ```
     ```

// DEV/PROD rule for read-only UI (tighten further as needed)
rules\_version = '2';
service cloud.firestore {
match /databases/{database}/documents {
match /items/{id} {
allow read: if request.auth != null;
allow write: if false;
}
}
}
\`\`\`

4. **MCP server (`/mcp`)**

   * Initialize:

     ```bash
     mkdir mcp && cd mcp
     npm init -y
     npm i @modelcontextprotocol/sdk firebase-admin zod dotenv
     ```
   * Files:

     * `/mcp/.env` (not committed)

       ```
       FIREBASE_PROJECT_ID=<FIREBASE_PROJECT_ID>
       FIRESTORE_COLLECTION=items
       GOOGLE_APPLICATION_CREDENTIALS=./serviceAccount.json
       ```
     * `/mcp/package.json` (ensure ESM + bin)

       ```json
       {
         "name": "firestore-mcp",
         "version": "1.0.0",
         "type": "module",
         "bin": { "firestore-mcp": "index.js" },
         "dependencies": {
           "@modelcontextprotocol/sdk": "^1",
           "firebase-admin": "^12",
           "zod": "^3",
           "dotenv": "^16"
         },
         "scripts": {
           "start": "node index.js"
         }
       }
       ```
     * `/mcp/index.js`

       ```js
       import "dotenv/config";
       import admin from "firebase-admin";
       import { z } from "zod";
       import { Server } from "@modelcontextprotocol/sdk/server/index.js";
       import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";

       // firebase-admin init (uses GOOGLE_APPLICATION_CREDENTIALS)
       if (!admin.apps.length) {
         admin.initializeApp({
           credential: admin.credential.applicationDefault(),
           projectId: process.env.FIREBASE_PROJECT_ID
         });
       }
       const db = admin.firestore();
       const col = () => db.collection(process.env.FIRESTORE_COLLECTION || "items");

       const ItemCreate = z.object({
         title: z.string().min(1),
         description: z.string().optional()
       });
       const ItemUpdate = z.object({
         id: z.string().min(1),
         title: z.string().min(1).optional(),
         description: z.string().optional()
       });

       const server = new Server({ name: "firestore-mcp", version: "1.0.0" }, {
         tools: {
           listItems: {
             description: "List items ordered by createdAt desc",
             inputSchema: { type: "object", properties: { limit: { type: "number" } } },
             handler: async ({ limit }) => {
               let q = col().orderBy("createdAt", "desc");
               if (limit) q = q.limit(limit);
               const snap = await q.get();
               return { content: [{ type: "text", text: JSON.stringify(snap.docs.map(d => ({ id: d.id, ...d.data() })), null, 2) }] };
             }
           },
           getItem: {
             description: "Get one item by id",
             inputSchema: { type: "object", required: ["id"], properties: { id: { type: "string" } } },
             handler: async ({ id }) => {
               const doc = await col().doc(id).get();
               if (!doc.exists) return { content: [{ type: "text", text: JSON.stringify({ error: "Not found" }) }] };
               return { content: [{ type: "text", text: JSON.stringify({ id: doc.id, ...doc.data() }, null, 2) }] };
             }
           },
           createItem: {
             description: "Create an item",
             inputSchema: { type: "object", properties: { title: { type: "string" }, description: { type: "string" } } },
             handler: async (input) => {
               const parsed = ItemCreate.safeParse(input);
               if (!parsed.success) return { content: [{ type: "text", text: JSON.stringify(parsed.error.flatten()) }] };
               const now = Date.now();
               const ref = await col().add({ ...parsed.data, createdAt: now, updatedAt: now });
               const snap = await ref.get();
               return { content: [{ type: "text", text: JSON.stringify({ id: ref.id, ...snap.data() }, null, 2) }] };
             }
           },
           updateItem: {
             description: "Update an existing item",
             inputSchema: { type: "object", properties: { id: { type: "string" }, title: { type: "string" }, description: { type: "string" } } },
             handler: async (input) => {
               const parsed = ItemUpdate.safeParse(input);
               if (!parsed.success) return { content: [{ type: "text", text: JSON.stringify(parsed.error.flatten()) }] };
               const ref = col().doc(parsed.data.id);
               const snap = await ref.get();
               if (!snap.exists) return { content: [{ type: "text", text: JSON.stringify({ error: "Not found" }) }] };
               const { id, ...patch } = parsed.data;
               await ref.update({ ...patch, updatedAt: Date.now() });
               const updated = await ref.get();
               return { content: [{ type: "text", text: JSON.stringify({ id: updated.id, ...updated.data() }, null, 2) }] };
             }
           },
           deleteItem: {
             description: "Delete an item by id",
             inputSchema: { type: "object", required: ["id"], properties: { id: { type: "string" } } },
             handler: async ({ id }) => {
               await col().doc(id).delete();
               return { content: [{ type: "text", text: JSON.stringify({ ok: true, id }) }] };
             }
           }
         }
       });

       const transport = new StdioServerTransport();
       await server.connect(transport);
       ```
   * **Do not** commit `.env` or `serviceAccount.json`.

5. **Firebase Hosting (SPA only)**

   * Root `firebase.json`:

     ```json
     {
       "hosting": {
         "public": "web/dist",
         "ignore": ["firebase.json", "**/.*", "**/node_modules/**"],
         "rewrites": [{ "source": "**", "destination": "/index.html" }]
       }
     }
     ```
   * `.firebaserc`:

     ```json
     { "projects": { "default": "<FIREBASE_PROJECT_ID>" } }
     ```

6. **Docs & scripts**

   * Add concise **README** sections:

     * **Web**:

       ```bash
       cd web
       npm i
       npm run dev   # local dev
       npm run build
       ```
     * **Deploy SPA**:

       ```bash
       firebase deploy --only hosting
       ```
     * **MCP**:

       ```bash
       cd mcp
       npm i
       # place serviceAccount.json and .env (see example above)
       npm start     # starts MCP server over stdio
       ```
     * Note how to register the `firestore-mcp` binary in ChatGPT (Model Context Protocol tool configuration).

7. **Commits**

   1. `chore(web): scaffold Vite React (JS) + routing`
   2. `feat(web): Firebase Auth (Google) + read-only Items page`
   3. `chore: firestore rules for read-only UI`
   4. `feat(mcp): MCP server exposing Firestore CRUD`
   5. `docs: usage for web + MCP, env setup`
   6. `chore: firebase hosting config`

8. **Pull Request**

   * Title: `feat: read-only React SPA + MCP Firestore CRUD`
   * Body includes:

     * What changed
     * How to run web + deploy
     * How to run MCP
     * Security notes (UI cannot write; rules block writes)
     * The **Acceptance Criteria** checklist above

---

## Notes / Guardrails

* **No secrets** in repo: `.env`, `serviceAccount.json` must be local only.
* Prefer small, atomic commits with clear messages.
* Use **Firestore Emulator** for local dev if helpful; consider a `--use-emulator` flag in MCP later.
* Keep UI accessible and simple; surface a visible note that writes are done via MCP tools in ChatGPT.

---

## Minimal File Map (after task)

```
/
├─ TASKS.md
├─ .firebaserc
├─ firebase.json
├─ firestore.rules
├─ web/
│  ├─ index.html
│  ├─ package.json
│  ├─ .env.local            # not committed
│  └─ src/
│     ├─ firebase.js
│     ├─ main.jsx
│     ├─ App.jsx
│     ├─ auth/AuthGate.jsx
│     └─ pages/ItemsPage.jsx
└─ mcp/
   ├─ package.json
   ├─ index.js
   ├─ .env                  # not committed
   └─ serviceAccount.json   # not committed
```

---

**Done =** PR opened with checklist, screenshots optional.
