# Task 02 — Migrate `fancy_movie_catalog.html` to React SPA UI

This plan outlines the steps I will run to port the static HTML catalog in `docs/fancy_movie_catalog.html` into the existing React + Vite app under `web/`. It adopts Tailwind CSS for styling and daisyUI for ready‑made components so we can move fast while keeping the design close to the HTML mock.

Framework choices
- Styling: Tailwind CSS (popular, utility‑first, great DX with Vite)
- Components: daisyUI (Tailwind plugin providing buttons, cards, inputs, etc.) + Heroicons for icons

Outcome
- A responsive, themed movie catalog with search, genre chips, sort, and a grid of cards reading from Firestore (`VITE_MOVIES_COLLECTION`).

---

## 0) Preconditions
- React app already running at `web/` (Vite).
- Firestore collection with movie docs `{ title, year, genre[], poster_link, ... }`.
- Auth required for reads is already configured (rules + AuthGate).
- Env: `web/.env.local` has `VITE_MOVIES_COLLECTION=items` and Firebase keys.

---

## 1) Add Tailwind + daisyUI

Commands (run in `web/`):
- npm install -D tailwindcss postcss autoprefixer @tailwindcss/forms @tailwindcss/typography
- npm install daisyui @heroicons/react classnames
- npx tailwindcss init -p

Files to update/create:
- `web/tailwind.config.js`
  - content: ["./index.html", "./src/**/*.{js,jsx,ts,tsx}"]
  - plugins: [require("@tailwindcss/forms"), require("@tailwindcss/typography"), require("daisyui")]
  - daisyUI theme: set a dark theme approximating the HTML colors (bg, glass, accent)
- `web/src/index.css`
  - Add Tailwind directives at the top: `@tailwind base; @tailwind components; @tailwind utilities;`
  - Keep or migrate any existing global CSS as needed.

Use theme mapping from HTML to Tailwind/daisyUI (as custom CSS variables or Tailwind theme extend):
- bg: #0b1020, bg2: #0e142a, accent: #7c5cff, accent2: #19c37d, accent3: #00b3ff, text: #e8eefc, muted: #aab6da

---

## 2) App Shell + Routing

Add layout and shell components under `web/src/ui/`:
- `Layout.jsx`: wraps header, main container, footer
- `Header.jsx`: brand/logo, search box, action buttons (Sign out already handled in AuthGate)
- `FiltersBar.jsx`: chips for genres, sort dropdown, optional collapsible filters (maps from HTML)
- `Footer.jsx`: small footer text

Wire routes (still single route `/`) but move page content into `MoviesPage.jsx`.

---

## 3) Data + State

Create `web/src/hooks/useMoviesQuery.js` to encapsulate list state:
- Query params: `q` (search), `genre` (single or multi), `sort` (title|year), `dir` (asc|desc), `page` (cursor index)
- Sync with URL search params via `useSearchParams` so refresh/deep linking works
- Firestore query:
  - base: collection(VITE_MOVIES_COLLECTION)
  - filters: if genre: `where('genre', 'array-contains', genre)`
  - search (basic): client-side filter on title for now; can add Algolia later
  - ordering: `orderBy(sortField, dir)`; default `orderBy('title')`
  - pagination: `limit(24)` + cursor with `startAfter(lastDoc)`
- Returns: `{ items, loading, error, next, prev, setQuery, pageInfo }`

---

## 4) Movie Card Grid

Add components under `web/src/ui/movies/`:
- `MovieCard.jsx` — uses daisyUI `card` with poster image, title, year, genres chips
- `MoviesGrid.jsx` — responsive grid (`grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-6 gap-4`)
- `GenresChips.jsx` — chip list from distinct genres in dataset (static list to start); uses daisyUI `badge`/`btn` variants
- `EmptyState.jsx` — friendly empty message when no results
- `SkeletonCard.jsx` — loading state placeholders

Map fields:
- title: `title || name`
- poster: `poster_link`
- meta: `year`, `genre.join(', ')`

---

## 5) Page Assembly (`MoviesPage.jsx`)

Layout mirrors `fancy_movie_catalog.html` sections:
- Sticky header with brand + search input + clear button
- Week picks carousel (optional in phase 2)
- Controls row: Genre chips, sort select, results count, pagination buttons
- Cards grid

Interactions:
- Search: debounced update to `q` state
- Genre chips: toggles selected genre
- Sort select: changes sort field/direction
- Pagination: next/prev using Firestore cursors

---

## 6) Accessibility & Responsiveness
- Use semantic elements: `header`, `main`, `footer`
- Labels for inputs, `aria-pressed` on chips, keyboard focus styles
- Ensure cards have alt text with movie title
- Responsive grid using Tailwind utilities; test at common breakpoints

---

## 7) Styling Parity with HTML
- Use daisyUI theme tokens to emulate glass, chip states, and gradients
- Add small utilities for glass panels: `backdrop-blur`, `bg-white/5`, `border-white/10`, shadows
- Recreate sticky header and chip hover/active states with Tailwind classes

---

## 8) Integration Points (existing app)
- AuthGate remains the wrapper; page shows signed‑in user
- Firestore rules already allow read‑only on `movies`
- Keep existing create/delete UI hidden or moved under an admin toggle (phase 2)

---

## 9) Testing & Verification
- Manual: search, filter, sort, paginate
- Performance: ensure initial bundle OK; consider React.lazy for page/component splits if needed
- Lighthouse pass for a11y basics

---

## 10) Deliverables (files to be added/changed)
- Add: `web/tailwind.config.js`, `web/postcss.config.js` (from Tailwind init)
- Update: `web/src/index.css` to include Tailwind directives
- Add: `web/src/ui/Layout.jsx`, `web/src/ui/Header.jsx`, `web/src/ui/FiltersBar.jsx`, `web/src/ui/Footer.jsx`
- Add: `web/src/ui/movies/MovieCard.jsx`, `MoviesGrid.jsx`, `GenresChips.jsx`, `EmptyState.jsx`, `SkeletonCard.jsx`
- Add: `web/src/hooks/useMoviesQuery.js`
- Update: route to use `MoviesPage.jsx`

I will implement exactly these after you approve. If you prefer Material UI instead of Tailwind+daisyUI, I can adapt the plan accordingly.

---

## Optional Phase 2
- Week picks carousel (Embla/keen-slider)
- Multi‑select genres, year range slider
- Server‑side search with Firestore composite indexes; or Algolia for full‑text
- Favorites (per‑user), detail modal/route, and shareable links
