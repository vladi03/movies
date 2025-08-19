# movies

This repository hosts a single-page application built with **React** and **Vite**. The app uses **Google Firebase** for its backend services with **Firestore** as the database storing movie records.

The file [`frontend/fancy_movie_catalog.html`](frontend/fancy_movie_catalog.html) embeds sample data in a `<script id="movie-data">` tag. Each entry in this JSON array describes a movie with fields such as:

```json
{
  "name": "A Few Good Men",
  "title": "A Few Good Men",
  "year": 1992,
  "actors": ["Tom Cruise", "Jack Nicholson", "Demi Moore"],
  "genre": ["Drama", "Thriller"],
  "poster_link": "https://m.media-amazon.com/images/M/MV5BOGVhMTUwYzEtZGQ1ZC00Nzg1LTk0OGUtMDk0NDM0ZmZlN2E0XkEyXkFqcGc@._V1_SX300.jpg"
}
```

These records are intended to be loaded into Firestore to power the movie catalog.
