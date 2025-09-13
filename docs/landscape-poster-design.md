# Design: Landscape Poster Integration and Random Movie Carousel

## Summary
Add support for landscape poster images sourced from TMDB and surface them in a Netflix-style hero carousel. This requires expanding the data fetch and schema, storing the landscape URL in Firestore, exposing an endpoint that returns four random movies, updating the web UI to consume and display this data, and providing a migration strategy so existing movies still render correctly.

## Goals
- Store a second, landscape-oriented poster URL for each movie.
- Serve four random movies for a hero carousel on the web client.
- Keep the implementation small so it can be delivered incrementally.

## Non-Goals
- Building advanced recommendation logic; random selection is sufficient.
- Creating a perfect migration framework; a lightweight backfill and runtime fallback is acceptable.

## 1. Movie Fetch and Schema
- Update the TMDB lookup in `functions/index.js` so it also returns a horizontal `landscape_poster_link` along with the existing `poster_link`.
- Add `landscape_poster_link` to the JSON schema and `required` list used to validate responses.
- Normalize both URLs when parsing the API response to ensure valid links are stored.

## 2. Firestore API Changes
- Update `createItem` and `updateItem` in `functions/index.js` to whitelist `landscape_poster_link` so it can be saved and updated in Firestore.
- Expand `docs/schemas/movie.schema.json` with a `landscape_poster_link` string property described as “Landscape poster image URL” and include it in examples.

## 3. Random-Movie Endpoint
- Add a new HTTPS function `randomItems` that reads a limited batch of movie documents from Firestore and returns four random entries. It should prefer items with `landscape_poster_link` but fall back to `poster_link` so every movie in the response has a usable image URL.

### API Contract
- **Endpoint**: `GET https://<region>-<project>.cloudfunctions.net/randomItems`
- **Response**:
  ```json
  {
    "movies": [
      {
        "id": "movie-id",
        "title": "Movie Title",
        "poster_link": "https://...",
        "landscape_poster_link": "https://..."
      }
    ]
  }
  ```
  Returns up to four movie objects or fewer if the database contains less data.

## 4. Web Client API
- In `web/src/api/functions.js`, expose a `randomItems()` helper that calls the new endpoint.
- Update existing helpers (`createItem`, `findMovie`) to pass through `landscape_poster_link`.

## 5. UI Carousel
- Create `HeroCarousel.jsx` in `web/src/ui/movies/` that renders a Netflix-style carousel using `landscape_poster_link` for full-width backgrounds, falling back to `poster_link` when necessary.
- On `MoviesPage.jsx`, fetch four random movies on mount and render the `HeroCarousel` above the existing grid.
- Ensure carousel items link to their detail pages or scroll to their card in the grid.

## 6. Movie Search Page
- On `AIFindMovie.jsx`, display both portrait and landscape poster URLs returned from the API so users can preview the stored images.

## 7. Documentation
- Update project documentation to describe the new `landscape_poster_link` field, the `/randomItems` endpoint, and the steps to integrate the hero carousel.
- This design doc tracks the required changes before implementation begins.

## 8. Backfill and Fallback Strategy
- Run a one-time script that invokes the TMDB lookup to backfill `landscape_poster_link` for existing movies.
- Until backfill completes, both `/randomItems` and the `HeroCarousel` should gracefully fall back to `poster_link`.
- Skip documents that lack both URLs to avoid broken imagery.

## 9. Open Questions
- What is the maximum size we want to allow for landscape images to balance quality and bandwidth?

