# MovieRecommendations

Need a movie suggestion? This repository contains a small Node.js web app that serves a static frontend and provides API routes for movie recommendations and search.

## Overview (current state)

- Server: `server.js` is a minimal Node HTTP server that serves files from `public/` and exposes API endpoints under `/api/*` for chat, search, account auth, and movie data.
- Frontend: `public/` contains the static app (`index.html`, `app.js`, `styles.css`) offering a poster wall, a chat UI, a genre/actor search form, a pick-based recommendation flow, and a basic account modal.
- AI integration: optional Gemini support. Set `GEMINI_API_KEY` in a `.env` file to enable chat-based recommendations.
- Movie data: The Movie Database (TMDB) is used for search, poster artwork, and provider lookup. Provide `TMDB_API_KEY` or `TMDB_ACCESS_TOKEN` to enable full search and poster features.
- Accounts: optional Turso/libSQL support adds basic username/password account creation, login/logout, and session cookies. Taste-profile UI wiring is not included yet.

This app is a work-in-progress but the core recommendation flows are implemented, including a pick-based recommendation flow that combines Gemini output (when available) with TMDB-backed enrichment.

## Features

- Chat-based movie recommendations via Gemini (when `GEMINI_API_KEY` is set).
- Pick/search-based recommendations with TMDB fallback discovery.
- Clickable recommendation results with expanded details, fit reasons, external links, and TMDB provider lookup.
- Basic account modal for creating an account, logging in, and logging out when account storage is configured.
- Endpoints:
  - `POST /api/chat` - chat recommendations.
  - `POST /api/movies/recommendations` - pick-based recommendations.
  - `GET /api/movies/search?query=...` - TMDB title search.
  - `GET /api/movies/related?query=...` - related/discovery results.
  - `GET /api/movies/providers?movieId=...` - TMDB watch-provider lookup.
  - `GET /api/movies/poster-wall` - poster wall data for the animated background.
  - `GET /api/auth/me` - current account session status.
  - `POST /api/auth/register` - create a basic account.
  - `POST /api/auth/login` - log in.
  - `POST /api/auth/logout` - log out.

## Requirements

- Node.js 18 or newer.

## Environment variables

- `GEMINI_API_KEY` - (optional) API key for Gemini; required to enable chat recommendations.
- `GEMINI_MODEL` - (optional) Gemini model name; defaults to `gemini-2.5-flash`.
- `TMDB_API_KEY` or `TMDB_ACCESS_TOKEN` - (optional) TMDB credentials for search/posters/provider lookup.
- `TURSO_DATABASE_URL` and `TURSO_AUTH_TOKEN` - (optional) Turso database credentials for account storage.
- `SESSION_SECRET` - required when Turso account storage is enabled; use a long random string.
- `AUTH_INVITE_CODE` - (optional) shared code required for registration when set.
- `PORT` - (optional) server port (default: `3000`).

The server logs helpful warnings on startup if keys are missing.

## Run locally

1. Install Node.js 18+.
2. (Optional) Copy `.env.example` to `.env` and add your API keys.

```bash
npm install
```

```bash
npm start
# or
node server.js
```

Open http://localhost:3000.

## Where to look in the code

- Server: `server.js` - HTTP server, API handlers, and TMDB/Gemini/account integration points.
- Frontend: `public/index.html`, `public/app.js`, `public/styles.css`.
- Static assets: `public/assets/`.

## Notes

- The GitHub Pages demo (if present in another branch) contains a static demo that does not call Gemini or TMDB.
- Keep real API keys out of source control; use `.env`.

## Contributing

- Open an issue or submit a PR. Run the server locally to verify changes.

## License

- No license specified.
