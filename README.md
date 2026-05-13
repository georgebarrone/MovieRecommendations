# MovieRecommendations

Need a movie suggestion? Come here.

MovieRecommendations is a work-in-progress movie recommendation web app. It currently runs as a small Node.js server that serves the front end and proxies API requests to Gemini and TMDB.

## Demo

A static demo with hard-coded example posters, chat messages, and genre/actor searches is available on GitHub Pages:

https://georgebarrone.github.io/MovieRecommendations/

The demo is hosted from the `pages-demo` branch and does not call Gemini, TMDB search, or the local Node API.

## Current state

The core recommendation experience is in place, but the site is still being refined. The current build includes:

- A theater-style "Need a Rec?" landing experience with a moving TMDB poster wall.
- Four favorite-movie poster slots powered by TMDB title search.
- A "Search based on picks" flow that sends selected movies to the Gemini movie assistant.
- A freeform chat assistant for movie recommendations by mood, genre, era, runtime, actor, language, or taste.
- A genre-or-actor search box that returns three English-language TMDB movie matches.
- TMDB poster fallbacks so the background still works if TMDB credentials are missing.
- Local Limelight and Courier Prime font files for the current visual style.

## Tech stack

- Node.js built-in HTTP server
- Static HTML, CSS, and JavaScript in `public/`
- Gemini API for conversational recommendations
- TMDB API for movie search, poster art, genre discovery, and actor-based discovery

## Setup

1. Install Node.js 18 or newer.
2. Copy `.env.example` to `.env`.
3. Add your API keys:

```env
GEMINI_API_KEY=your_real_api_key_here
GEMINI_MODEL=gemini-2.5-flash
TMDB_API_KEY=your_tmdb_api_key_here
```

You can also use `TMDB_ACCESS_TOKEN` or `TMDB_READ_ACCESS_TOKEN` instead of `TMDB_API_KEY`.

4. Start the site:

```bash
npm start
```

5. Open `http://localhost:3000`.

Keep `.env` private and do not commit real API keys.

## API routes

- `POST /api/chat` asks Gemini for movie recommendations.
- `GET /api/movies/search?query=...` searches TMDB movie titles for poster-slot picks.
- `GET /api/movies/related?query=...` discovers three movies by matching a genre or actor.
- `GET /api/movies/poster-wall` loads a randomized poster set for the animated background.

## Hosting notes

The full app cannot currently run on GitHub Pages by itself because GitHub Pages only serves static files, and this project needs the Node server for API routes and private API keys.

The GitHub Pages demo uses hard-coded examples so visitors can try the front-end flow without requiring API keys or a running backend. The live chat, poster search, genre search, and API-backed poster loading still require the Node server unless those routes move to a separate backend or serverless function host.

## Work in progress

Next likely improvements:

- Add production hosting on a platform that can run Node or serverless functions.
- Connect the public demo to live API-backed recommendations once production hosting is available.
- Improve loading, empty, and error states around API-backed search.
- Add automated tests for route handlers and UI behavior.
