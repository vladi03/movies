# TMDB API Integration (Backend Guide)

This document explains how to integrate **The Movie Database (TMDB)** into your backend API. It covers authentication, key endpoints, query parameters, images, error handling, and token management.

---

## 1. Authentication & Bearer Tokens

All TMDB API requests must be authenticated. For server-to-server integration, use a **v4 API Read Access Token** (Bearer token).

### Where to Find the Token
1. Log into your [TMDB account](https://www.themoviedb.org/).
2. Go to **Settings → API → API Read Access Token (v4 auth)**.
3. Copy the token — it begins with `eyJhbGci...`.

### Token Lifetime
- The **v4 Bearer token** is **long-lived and static**.  
- It does **not expire automatically**; it only becomes invalid if you **revoke or regenerate** it in your account settings.  
- Store it in your environment configuration file (`.env`):

  ```env
  TMDB_BEARER=eyJhbGciOi...
  ```

- Never expose this token to the frontend. Always proxy requests through your backend.

### Headers in Every Request
```http
Authorization: Bearer {TMDB_BEARER}
accept: application/json
```

---

## 2. Search Movies

### Endpoint
```
GET /search/movie
```

### Example
```bash
curl --request GET \
  --url 'https://api.themoviedb.org/3/search/movie?query=Star%20is%20Born&include_adult=false&language=en-US&primary_release_year=2018&page=1' \
  --header 'Authorization: Bearer ${TMDB_BEARER}' \
  --header 'accept: application/json'
```

### Query Parameters
- **`query` (required)** — Search string. Example: `query=Star%20is%20Born`.  
- **`include_adult` (optional, default: false)** — Include adult titles.  
- **`language` (optional, default: en-US)** — Localization code (e.g., `es-ES`).  
- **`page` (optional, default: 1)** — Page number (20 results per page).  
- **`primary_release_year` (optional)** — Filter by release year.  

### Response Pagination
- `page`: current page.  
- `total_pages`: total available pages.  
- `total_results`: number of matching results.  
- `results`: array of movie objects.

```
{
    "page": 1,
    "results": [{
            "adult": false,
            "backdrop_path": "/dDYpjrwh1wNVQk0rEpc9P81wQt4.jpg",
            "genre_ids": [
                10402,
                18,
                10749
            ],
            "id": 332562,
            "original_language": "en",
            "original_title": "A Star Is Born",
            "overview": "Seasoned musician Jackson Maine discovers — and falls in love with — struggling artist Ally. She has just about given up on her dream to make it big as a singer — until Jack coaxes her into the spotlight. But even as Ally's career takes off, the personal side of their relationship is breaking down, as Jack fights an ongoing battle with his own internal demons.",
            "popularity": 6.6706,
            "poster_path": "/wrFpXMNBRj2PBiN4Z5kix51XaIZ.jpg",
            "release_date": "2018-10-03",
            "title": "A Star Is Born",
            "video": false,
            "vote_average": 7.5,
            "vote_count": 11936
        }, {
            "adult": false,
            "backdrop_path": "/bqtCBz3BTvY9cBedjpeeGSgk6MR.jpg",
            "genre_ids": [
                99
            ],
            "id": 578547,
            "original_language": "en",
            "original_title": "The Road to Stardom: The Making of A Star Is Born",
            "overview": "A look at the making of “A Star Is Born,” featuring director/star/writer/producer Bradley Cooper and star Lady Gaga, both of whom also wrote and produced many of the film’s songs, as well as performed them live for the movie.",
            "popularity": 1.8949,
            "poster_path": "/mRlnPb85ZbAGpTYsWI57Huk1Ggt.jpg",
            "release_date": "2018-12-07",
            "title": "The Road to Stardom: The Making of A Star Is Born",
            "video": false,
            "vote_average": 7.2,
            "vote_count": 13
        }
    ],
    "total_pages": 1,
    "total_results": 2
}

```
---

## 3. Get Movie Details & Credits

Fetch full movie details and cast in a single call.

### Endpoint
```
GET /movie/{movie_id}?append_to_response=credits
```

### Example
```bash
curl --request GET \
  --url 'https://api.themoviedb.org/3/movie/332562?append_to_response=credits&language=en-US' \
  --header 'Authorization: Bearer ${TMDB_BEARER}' \
  --header 'accept: application/json'
```

### Response Highlights
- `genres[]` – objects with `name` fields.
- `credits.cast[]` – actor list; use the first few names.
- `poster_path` – portrait poster.
- `backdrop_path` – landscape backdrop.

Use these image paths to build `poster_link` and `landscape_poster_link`.

---

## 4. Images

TMDB responses include image paths such as `poster_path` (portrait posters) and `backdrop_path` (landscape backdrops).
Construct full URLs for `poster_link` and `landscape_poster_link` as:

```
https://image.tmdb.org/t/p/{SIZE}{PATH}
```

### Common Sizes
- **Posters**: `w92`, `w154`, `w342`, `w500`, `w780`, `original`  
- **Backdrops**: `w300`, `w780`, `w1280`, `original`  
- **Profiles**: `w45`, `w185`, `h632`, `original`  

### Example
```
https://image.tmdb.org/t/p/w1280/bqtCBz3BTvY9cBedjpeeGSgk6MR.jpg
```

---

## 5. Error Handling

- **401 Unauthorized** — Invalid or missing token.  
- **404 Not Found** — Resource does not exist.  
- **429 Too Many Requests** — Rate limit exceeded.  
- **500/502/504** — Upstream or network issues.  

Best practices:
- Add retry logic with exponential backoff for 429s.  
- Cache frequent queries to reduce API calls.  
- Normalize error messages before returning them to clients.

---

## 6. Best Practices

- **Backend Proxy** — Always call TMDB from your backend, never directly from the client.  
- **Caching** — Use Redis, memory cache, or `Cache-Control` headers.  
- **Normalization** — Whitelist and standardize fields in your backend responses.  
- **Localization** — Respect the `language` parameter, fallback to English when missing.  
- **Pagination** — Always pass through `page`, `total_pages`, and `total_results` to your frontend.

---

## 7. Quick Reference (Endpoints Covered)

- **Search Movies**:  
  `GET /search/movie`

- **Movie Details & Credits**:
  `GET /movie/{movie_id}?append_to_response=credits`

- **Images (base)**:  
  `https://image.tmdb.org/t/p/{SIZE}{PATH}`

- **Authentication (for sessions)**:  
  - `POST /authentication/token/new` (v3 flow, not needed for v4 Bearer)  
  - `POST /authentication/session/new` (v3 flow, user sessions only)

---

This guide should give you everything you need to integrate TMDB into your backend API securely and effectively.
