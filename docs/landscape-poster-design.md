# Design: Landscape Poster Integration and Random Movie Carousel

## Summary
Add support for AI-generated landscape poster images and surface them in a Netflix-style hero carousel. This requires expanding the AI prompt and schema, storing the landscape URL in Firestore, exposing an endpoint that returns four random movies, and updating the web UI to consume and display this data.

## 1. AI Prompt and Schema
- Extend the prompt in `functions/index.js` so the AI also returns a horizontal `landscape_poster_link` along with the existing `poster_link`.
- Add `landscape_poster_link` to the JSON schema and `required` list used to validate AI responses.
- Normalize both URLs when parsing the AI response to ensure valid links are stored.

## 2. Firestore API Changes
- Update `createItem` and `updateItem` in `functions/index.js` to whitelist `landscape_poster_link` so it can be saved and updated in Firestore.
- Expand `docs/schemas/movie.schema.json` with a `landscape_poster_link` string property described as “Landscape poster image URL” and include it in examples.

## 3. Random-Movie Endpoint
- Add a new HTTPS function `randomItems` that reads a limited batch of movie documents from Firestore and returns four random entries, each including the landscape poster URL.

## 4. Web Client API
- In `web/src/api/functions.js`, expose a `randomItems()` helper that calls the new endpoint.
- Update existing helpers (`createItem`, `aiFindMovie`) to pass through `landscape_poster_link`.

## 5. UI Carousel
- Create `HeroCarousel.jsx` in `web/src/ui/movies/` that renders a Netflix-style carousel using `landscape_poster_link` for full-width backgrounds.
- On `MoviesPage.jsx`, fetch four random movies on mount and render the `HeroCarousel` above the existing grid.
- Ensure carousel items link to their detail pages or scroll to their card in the grid.

## 6. AI Search Page
- On `AIFindMovie.jsx`, display both portrait and landscape poster URLs returned from the AI so users can preview the stored images.

## 7. Documentation
- Update project documentation to describe the new `landscape_poster_link` field, the `/randomItems` endpoint, and the steps to integrate the hero carousel.
- This design doc tracks the required changes before implementation begins.

