# MovieRecommendations
In need of a movie suggestion? Come here

## Work in Progress

This project is a work in progress. The core movie recommendation experience is in place, but the design, features, and recommendation flow are still being refined.

## Setup

This is a tiny Gemini-powered movie recommendation chat site with TMDB movie search.

1. Install Node.js 18 or newer.
2. Copy `.env.example` to `.env`.
3. Put your Gemini key and TMDB key in `.env`:

```env
GEMINI_API_KEY=your_real_api_key_here
GEMINI_MODEL=gemini-2.5-flash
TMDB_API_KEY=your_tmdb_api_key_here
```

4. Start the site:

```bash
npm start
```

5. Open `http://localhost:3000`.

Your API key belongs in `.env` at the project root. Keep `.env` private and do not commit it.
