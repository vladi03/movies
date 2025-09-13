# movies

This repository hosts a single-page application built with **React** and **Vite**. The app uses **Google Firebase** for its backend services with **Firestore** as the database storing movie records.

Here’s the full **future-state `README.md`** with the **Movie Object Model** included so you can copy and paste directly:

---

# Movies Project – React SPA + Firestore MCP Integration

This repository contains a **React single-page application (SPA)** backed by **Firebase Auth** and **Firestore**, along with a **Model Context Protocol (MCP) server** that enables ChatGPT (via connectors) to perform CRUD operations on Firestore.

The design follows a clear separation of responsibilities:

* **Web app (`/web`)** – Read-only interface: authenticates users via Firebase and displays Firestore data. No write controls are available in the UI.
* **MCP server (`/mcp`)** – Provides full CRUD capabilities against Firestore via MCP tools that can be called from ChatGPT.

---

## Model Description

The architecture is designed as a **two-layer model**:

1. **Presentation Layer (React SPA)**

   * Built with Vite + React (JavaScript).
   * Handles **authentication** (Google sign-in at minimum).
   * Displays Firestore `items` collection in real-time.
   * Enforces **read-only access**—no create, update, or delete options in the UI.

2. **Data Control Layer (MCP Server)**

   * Runs locally as a Node.js process using `firebase-admin`.
   * Exposes CRUD operations (`listItems`, `getItem`, `createItem`, `updateItem`, `deleteItem`) through the **Model Context Protocol**.
   * Allows ChatGPT (when configured with MCP tools) to manage Firestore records conversationally.
   * Isolated from the SPA to maintain strict separation between **viewing** and **editing**.

**Security Model**

* Firestore rules restrict writes from client-side applications.
* Only authenticated users may read.
* Write access flows through MCP using Admin SDK and a service account.
* Secrets (service account JSON, `.env` configs) are never committed to the repo.

---

## Movie Object Model

Each movie document stored in Firestore follows this JSON structure:

```json
{
  "name": "A Few Good Men",
  "title": "A Few Good Men",
  "year": 1992,
  "actors": ["Tom Cruise", "Jack Nicholson", "Demi Moore"],
  "genre": ["Drama", "Thriller"],
  "poster_link": "https://m.media-amazon.com/images/M/MV5BOGVhMTUwYzEtZGQ1ZC00Nzg1LTk0OGUtMDk0NDM0ZmZlN2E0XkEyXkFqcGc@._V1_SX300.jpg",
  "landscape_poster_link": "https://m.media-amazon.com/images/L/landscape.jpg"
}
```

Formal specification [JSON Schema](docs/schemas/movie.schema.json)

**Field Descriptions**:

* **name** *(string)* – Internal or display name of the movie.
* **title** *(string)* – Official movie title (may duplicate `name`).
* **year** *(number)* – Release year.
* **actors** *(array of strings)* – List of main cast members.
* **genre** *(array of strings)* – Genre tags (e.g., Drama, Thriller).
* **poster\_link** *(string/URL)* – Link to the movie poster image.
* **landscape\_poster\_link** *(string/URL)* – Link to a landscape-oriented poster image.

---

## Features

* 🔐 **Authentication**: Google (and optional email/password) sign-in with Firebase Auth.
* 📖 **Read-only UI**: SPA displays `items` collection entries from Firestore in real-time.
* 🎞️ **Hero Carousel**: Home page fetches four random movies via `/randomItems` and shows their landscape posters.
* 🔧 **MCP tools** (for ChatGPT):

  * `listItems(limit?)`
  * `getItem(id)`
  * `createItem({ title, description? })`
  * `updateItem({ id, title?, description? })`
  * `deleteItem(id)`
  * `randomItems()` – fetch four random movies for the hero carousel
* 🛡️ **Security**: Firestore rules permit **reads only** for authenticated users; **writes are blocked** at the UI layer and reserved for MCP.
* 🚀 **Hosting**: Deployable to Firebase Hosting.

---

## Project Structure

```
/
├─ README.md
├─ TASKS.md              # Development plan / checklist
├─ .firebaserc
├─ firebase.json
├─ firestore.rules        # Read-only rules for UI
├─ web/                   # React SPA
│  ├─ index.html
│  ├─ package.json
│  ├─ .env.local          # Firebase client config (NOT committed)
│  └─ src/
│     ├─ firebase.js
│     ├─ main.jsx
│     ├─ App.jsx
│     ├─ auth/AuthGate.jsx
│     └─ pages/ItemsPage.jsx
└─ mcp/                   # MCP server for Firestore CRUD
   ├─ package.json
   ├─ index.js
   ├─ .env                # Local env (NOT committed)
   └─ serviceAccount.json # Firebase Admin SDK key (NOT committed)
```

---

## Setup & Usage

### 1. Web App

```bash
cd web
npm install
npm run dev   # start dev server
npm run build # build for production
```

Create a `.env.local` with your Firebase client values:

```bash
VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_AUTH_DOMAIN=...
VITE_FIREBASE_PROJECT_ID=...
VITE_FIREBASE_APP_ID=...
VITE_FIREBASE_STORAGE_BUCKET=...
VITE_FIREBASE_MESSAGING_SENDER_ID=...
```

### 2. Firebase Hosting

```bash
firebase deploy --only hosting
```

### 3. MCP Server

```bash
cd mcp
npm install
# Place serviceAccount.json locally (NOT committed)
# Create .env file:
# FIREBASE_PROJECT_ID=...
# FIRESTORE_COLLECTION=items
# GOOGLE_APPLICATION_CREDENTIALS=./serviceAccount.json
npm start
```

This will start the MCP server over stdio. Register the `firestore-mcp` binary in ChatGPT’s Model Context Protocol configuration to use the tools directly in chat.

---

## Firestore Rules

```
// DEV/PROD rule for read-only UI
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

---

## Development Workflow

* Branch name: `feat/react-spa-mcp-firestore`
* Typical commits:

  1. scaffold Vite React SPA
  2. add Firebase Auth + Items page (read-only)
  3. add Firestore rules
  4. add MCP server with CRUD tools
  5. add docs & env setup
  6. add Firebase Hosting config

Pull Requests should include instructions, screenshots (optional), and an acceptance checklist.

---

## Notes

* **Do not commit** secrets: `.env.local`, `.env`, `serviceAccount.json`.
* Use the **Firestore Emulator** locally when possible.
* UI is intentionally minimal and read-only. **All writes must go through the MCP tools.**

---

