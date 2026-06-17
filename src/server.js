// Core Node modules provide HTTP serving, cryptography, file access, and path handling for the custom server.
const http = require("http");
const crypto = require("crypto");
const fs = require("fs");
const path = require("path");
const { promisify } = require("util");
const { createClient } = require("@libsql/client");

// Project paths keep static file serving anchored to the repository root.
const ROOT = path.resolve(__dirname, "..");
const PUBLIC_DIR = path.join(ROOT, "public");

loadEnvFile(path.join(ROOT, ".env"));

// Environment values configure the external services while treating placeholder secrets as missing.
const PORT = Number(process.env.PORT || 3000);
const GEMINI_API_KEY = cleanSecret(
  process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY
);
const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-2.5-flash";
const TMDB_API_KEY = cleanSecret(process.env.TMDB_API_KEY);
const TMDB_ACCESS_TOKEN = cleanSecret(
  process.env.TMDB_ACCESS_TOKEN || process.env.TMDB_READ_ACCESS_TOKEN
);
const TURSO_DATABASE_URL = cleanSecret(process.env.TURSO_DATABASE_URL);
const TURSO_AUTH_TOKEN = cleanSecret(process.env.TURSO_AUTH_TOKEN);
const SESSION_SECRET = cleanSecret(process.env.SESSION_SECRET);
const AUTH_INVITE_CODE = cleanSecret(process.env.AUTH_INVITE_CODE);

// Scrypt is promisified so password hashing can be written with async/await.
const scryptAsync = promisify(crypto.scrypt);

// Fallback posters keep the landing wall populated when TMDB credentials are unavailable.
const FALLBACK_POSTER_WALL = [
  {
    title: "The Matrix",
    posterUrl: "https://image.tmdb.org/t/p/w342/f89U3ADr1oiB1s9GkdPOEpXUk5H.jpg"
  },
  {
    title: "Inception",
    posterUrl: "https://image.tmdb.org/t/p/w342/oYuLEt3zVCKq57qu2F8dT7NIa6f.jpg"
  },
  {
    title: "Interstellar",
    posterUrl: "https://image.tmdb.org/t/p/w342/gEU2QniE6E77NI6lCU6MxlNBvIx.jpg"
  },
  {
    title: "Arrival",
    posterUrl: "https://image.tmdb.org/t/p/w342/x2FJsf1ElAgr63Y3PNPtJrcmpoe.jpg"
  },
  {
    title: "Parasite",
    posterUrl: "https://image.tmdb.org/t/p/w342/7IiTTgloJzvGI1TAYymCfbfl3vT.jpg"
  },
  {
    title: "Knives Out",
    posterUrl: "https://image.tmdb.org/t/p/w342/pThyQovXQrw2m0s9x82twj48Jq4.jpg"
  },
  {
    title: "La La Land",
    posterUrl: "https://image.tmdb.org/t/p/w342/uDO8zWDhfWwoFdKS4fzkUJt0Rf0.jpg"
  },
  {
    title: "The Grand Budapest Hotel",
    posterUrl: "https://image.tmdb.org/t/p/w342/eWdyYQreja6JGCzqHWXpWHDrrPo.jpg"
  },
  {
    title: "Blade Runner 2049",
    posterUrl: "https://image.tmdb.org/t/p/w342/gajva2L0rPYkEWjzgFlBXCAVBE5.jpg"
  },
  {
    title: "Whiplash",
    posterUrl: "https://image.tmdb.org/t/p/w342/7fn624j5lj3xTme2SgiLCeuedmO.jpg"
  }
];

// Shared constants centralize image sizing, session lifetime, password hashing, and feedback vocabulary.
const TMDB_IMAGE_BASE = "https://image.tmdb.org/t/p/w342";
const POSTER_WALL_PAGE_SAMPLE_COUNT = 12;
const POSTER_WALL_LIMIT = 240;
const SESSION_COOKIE_NAME = "movie_match_session";
const SESSION_DURATION_MS = 1000 * 60 * 60 * 24 * 30;
const PASSWORD_KEY_LENGTH = 64;
const TASTE_PROMPT_LIMIT = 12;
const FEEDBACK_STATUS_VALUES = new Set([
  "liked",
  "disliked",
  "watched",
  "want_to_watch"
]);

// Database client state is cached so Turso setup happens once per server process.
let dbClient = null;
let databaseReadyPromise = null;

// TMDB genre ids are kept locally so casual genre searches can become discover requests.
const TMDB_MOVIE_GENRES = [
  { id: 28, name: "Action" },
  { id: 12, name: "Adventure" },
  { id: 16, name: "Animation" },
  { id: 35, name: "Comedy" },
  { id: 80, name: "Crime" },
  { id: 99, name: "Documentary" },
  { id: 18, name: "Drama" },
  { id: 10751, name: "Family" },
  { id: 14, name: "Fantasy" },
  { id: 36, name: "History" },
  { id: 27, name: "Horror" },
  { id: 10402, name: "Music" },
  { id: 9648, name: "Mystery" },
  { id: 10749, name: "Romance" },
  { id: 878, name: "Science Fiction" },
  { id: 10770, name: "TV Movie" },
  { id: 53, name: "Thriller" },
  { id: 10752, name: "War" },
  { id: 37, name: "Western" }
];

// Genre aliases translate common user phrases into one or more TMDB genre ids.
const GENRE_ALIASES = new Map([
  ["sci fi", { name: "Science Fiction", ids: [878] }],
  ["sci-fi", { name: "Science Fiction", ids: [878] }],
  ["scifi", { name: "Science Fiction", ids: [878] }],
  ["science fiction", { name: "Science Fiction", ids: [878] }],
  ["rom com", { name: "Romantic Comedy", ids: [35, 10749] }],
  ["rom-com", { name: "Romantic Comedy", ids: [35, 10749] }],
  ["romcom", { name: "Romantic Comedy", ids: [35, 10749] }],
  ["romantic comedy", { name: "Romantic Comedy", ids: [35, 10749] }],
  ["neo noir", { name: "Neo-noir", ids: [80, 9648, 53] }],
  ["neo-noir", { name: "Neo-noir", ids: [80, 9648, 53] }],
  ["noir", { name: "Noir", ids: [80, 9648, 53] }],
  ["superhero", { name: "Superhero", ids: [28, 12, 878] }],
  ["kids", { name: "Family", ids: [10751] }],
  ["musical", { name: "Music", ids: [10402] }]
]);

// Static MIME types make the tiny file server return useful content headers.
const MIME_TYPES = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".ttf": "font/ttf",
  ".otf": "font/otf",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon"
};

// The chat system prompt defines the assistant voice and recommendation boundaries for Gemini.
const movieSystemPrompt = [
  "You are Movie Match, a friendly movie recommendation assistant.",
  "Help the user find movies based on taste, mood, genre, era, language, runtime, favorite films, or people they like.",
  "Recommend 1 or 2 movies at a time unless the user explicitly asks for more.",
  "For each recommendation, include the title, year, genre or style, why it fits, and a brief content note when relevant.",
  "Keep replies concise and complete; prefer short finished sentences over long lists.",
  "If the user is vague and has not provided favorite picks, ask one concise follow-up question before recommending.",
  "Do not claim exact streaming availability unless the user provides it; suggest they check their preferred services."
].join(" ");

// The pick recommendation prompt asks Gemini for strict JSON that can be enriched into movie cards.
const pickRecommendationSystemPrompt = [
  "You are Movie Match, the same friendly movie recommendation assistant used in chat.",
  "Use the user's selected movies as taste signals and recommend movies with a similar taste profile.",
  "Prioritize shared tone, story shape, themes, emotional texture, pacing, visual style, and sense of humor over simple genre matching.",
  "Prefer thoughtful, watchable recommendations over obscure database-adjacent matches.",
  "Do not recommend any movie already selected by the user.",
  "Return JSON only. Use this shape: {\"recommendations\":[{\"title\":\"Movie title\",\"year\":\"YYYY\",\"description\":\"One concise spoiler-free synopsis.\",\"fit\":\"One quick sentence explaining why it fits the selected movies.\"}]}"
].join(" ");

// The HTTP server routes API requests first and falls back to static files for the browser app.
const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, `http://${req.headers.host}`);

    if (req.method === "GET" && url.pathname === "/api/auth/me") {
      await handleAuthMe(req, res);
      return;
    }

    if (req.method === "POST" && url.pathname === "/api/auth/register") {
      await handleAuthRegister(req, res);
      return;
    }

    if (req.method === "POST" && url.pathname === "/api/auth/login") {
      await handleAuthLogin(req, res);
      return;
    }

    if (req.method === "POST" && url.pathname === "/api/auth/logout") {
      await handleAuthLogout(req, res);
      return;
    }

    if (req.method === "GET" && url.pathname === "/api/profile") {
      await handleProfile(req, res);
      return;
    }

    if (req.method === "GET" && url.pathname === "/api/movies/feedback") {
      await handleGetMovieFeedback(url, req, res);
      return;
    }

    if (req.method === "POST" && url.pathname === "/api/movies/feedback") {
      await handleSaveMovieFeedback(req, res);
      return;
    }

    if (req.method === "DELETE" && url.pathname === "/api/movies/feedback") {
      await handleDeleteMovieFeedback(url, req, res);
      return;
    }

    if (req.method === "POST" && url.pathname === "/api/chat") {
      await handleChat(req, res);
      return;
    }

    if (req.method === "POST" && url.pathname === "/api/movies/recommendations") {
      await handlePickRecommendations(req, res);
      return;
    }

    if (req.method === "GET" && url.pathname === "/api/movies/search") {
      await handleMovieSearch(url, res);
      return;
    }

    if (req.method === "GET" && url.pathname === "/api/movies/related") {
      await handleRelatedMovies(url, res);
      return;
    }

    if (req.method === "GET" && url.pathname === "/api/movies/providers") {
      await handleMovieProviders(url, res);
      return;
    }

    if (req.method === "GET" && url.pathname === "/api/movies/poster-wall") {
      await handlePosterWall(res);
      return;
    }

    if (req.method === "GET") {
      serveStatic(url.pathname, res);
      return;
    }

    sendJson(res, 405, { error: "Method not allowed" });
  } catch (error) {
    console.error(error);
    sendJson(res, 500, { error: "Something went wrong on the server." });
  }
});

server.listen(PORT, () => {
  console.log(`MovieRecommendations is running at http://localhost:${PORT}`);
  if (!GEMINI_API_KEY) {
    console.log("Add GEMINI_API_KEY to .env before chatting with Gemini.");
  }

  if (!TMDB_API_KEY && !TMDB_ACCESS_TOKEN) {
    console.log("Add TMDB_API_KEY to .env before using movie search.");
  }

  if (!isDatabaseConfigured()) {
    console.log("Add TURSO_DATABASE_URL and TURSO_AUTH_TOKEN to enable accounts.");
  } else {
    ensureDatabaseReady()
      .then(() => console.log("Turso account database is ready."))
      .catch((error) => {
        console.error("Could not initialize Turso account database.");
        console.error(error);
      });
  }

  if (isDatabaseConfigured() && !SESSION_SECRET) {
    console.log("Add SESSION_SECRET before using login sessions.");
  }
});

// Handles free-form chat by combining recent messages, selected picks, and saved taste data into one Gemini request.
async function handleChat(req, res) {
  if (!GEMINI_API_KEY) {
    sendJson(res, 500, {
      error: "Missing GEMINI_API_KEY. Add it to a .env file in the project root."
    });
    return;
  }

  const body = await readJsonBody(req);
  const messages = sanitizeMessages(body.messages);
  const favoriteMovies = sanitizeFavoriteMovies(body.favoriteMovies);
  const currentUser = await getOptionalCurrentUser(req);
  const tasteProfile = currentUser
    ? await getTasteProfile(currentUser.id, TASTE_PROMPT_LIMIT)
    : createEmptyTasteProfile();

  if (!messages.length) {
    sendJson(res, 400, { error: "Send at least one message." });
    return;
  }

  const systemPrompt = buildChatSystemPrompt(favoriteMovies, tasteProfile);

  const geminiResponse = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(
      GEMINI_MODEL
    )}:generateContent`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": GEMINI_API_KEY
      },
      body: JSON.stringify({
        systemInstruction: {
          parts: [{ text: systemPrompt }]
        },
        contents: messages.map((message) => ({
          role: message.role,
          parts: [{ text: message.text }]
        })),
        generationConfig: {
          temperature: 0.85,
          maxOutputTokens: 1200
        }
      })
    }
  );

  const data = await geminiResponse.json().catch(() => ({}));

  if (!geminiResponse.ok) {
    const detail =
      data.error?.message ||
      `Gemini returned ${geminiResponse.status} ${geminiResponse.statusText}`;
    sendJson(res, geminiResponse.status, { error: detail });
    return;
  }

  const reply = extractGeminiText(data) || "I could not generate a recommendation. Try again?";

  sendJson(res, 200, { reply });
}

// Handles poster-pick recommendations by asking Gemini first and filling any gaps with TMDB signals.
async function handlePickRecommendations(req, res) {
  const body = await readJsonBody(req);
  const favoriteMovies = sanitizeFavoriteMovieDetails(body.favoriteMovies);
  const currentUser = await getOptionalCurrentUser(req);
  const tasteProfile = currentUser
    ? await getTasteProfile(currentUser.id, TASTE_PROMPT_LIMIT)
    : createEmptyTasteProfile();

  if (!favoriteMovies.length) {
    sendJson(res, 400, { error: "Add at least one movie pick first." });
    return;
  }

  const excludedMovies = createExcludedMovieSet([
    ...favoriteMovies,
    ...getTasteExcludedMovies(tasteProfile)
  ]);
  let results = [];
  let source = "tmdb";

  if (GEMINI_API_KEY) {
    try {
      const geminiRecommendations =
        await generateGeminiPickRecommendations(favoriteMovies, tasteProfile);
      results = await enrichGeminiRecommendations(
        geminiRecommendations,
        excludedMovies
      );
      source = results.length ? "gemini" : source;
    } catch (error) {
      console.error(error);
    }
  }

  if (results.length < 3 && (TMDB_API_KEY || TMDB_ACCESS_TOKEN)) {
    try {
      const fallbackResults = await discoverMoviesFromFavoritePicks(
        favoriteMovies,
        excludedMovies,
        3 - results.length
      );
      results = mergeRecommendationResults(results, fallbackResults).slice(0, 3);
    } catch (error) {
      console.error(error);
    }
  }

  if (!results.length) {
    const missingService = GEMINI_API_KEY
      ? "Could not find matching movie cards right now."
      : "Missing GEMINI_API_KEY. Add it to a .env file, or add TMDB credentials for fallback recommendations.";
    sendJson(res, 502, { error: missingService });
    return;
  }

  sendJson(res, 200, {
    query: favoriteMovies.map(formatFavoriteMovieLabel).join(", "),
    matchType: "picks",
    matchName: "your picks",
    source,
    results: results.slice(0, 3)
  });
}

// Searches TMDB by title and returns compact movie cards for the picker UI.
async function handleMovieSearch(url, res) {
  if (!TMDB_API_KEY && !TMDB_ACCESS_TOKEN) {
    sendJson(res, 500, {
      error:
        "Missing TMDB_API_KEY. Add it to a .env file in the project root."
    });
    return;
  }

  const query = String(url.searchParams.get("query") || "")
    .trim()
    .slice(0, 120);

  if (query.length < 2) {
    sendJson(res, 400, { error: "Search with at least two characters." });
    return;
  }

  const tmdbUrl = new URL("https://api.themoviedb.org/3/search/movie");
  tmdbUrl.searchParams.set("query", query);
  tmdbUrl.searchParams.set("include_adult", "false");
  tmdbUrl.searchParams.set("language", "en-US");
  tmdbUrl.searchParams.set("page", "1");

  let tmdbResponse;

  try {
    tmdbResponse = await fetch(tmdbUrl, getTmdbRequestOptions(tmdbUrl));
  } catch (error) {
    sendJson(res, 502, { error: "TMDB search is unavailable right now." });
    return;
  }

  const data = await tmdbResponse.json().catch(() => ({}));

  if (!tmdbResponse.ok) {
    const detail =
      data.status_message ||
      data.error?.message ||
      `TMDB returned ${tmdbResponse.status} ${tmdbResponse.statusText}`;
    sendJson(res, tmdbResponse.status, { error: detail });
    return;
  }

  const results = Array.isArray(data.results)
    ? data.results
        .slice(0, 8)
        .map((movie) => ({
          id: movie.id,
          title: movie.title || movie.original_title || "Untitled",
          year: movie.release_date ? movie.release_date.slice(0, 4) : "",
          overview: movie.overview || "",
          posterPath: movie.poster_path || "",
          posterUrl: movie.poster_path
            ? `https://image.tmdb.org/t/p/w342${movie.poster_path}`
            : "",
          tmdbUrl: movie.id
            ? `https://www.themoviedb.org/movie/${movie.id}`
            : "",
          voteAverage: Number(movie.vote_average || 0)
        }))
        .filter((movie) => movie.id && movie.title)
    : [];

  sendJson(res, 200, { results });
}

// Resolves a genre or actor query into three related TMDB movies for the discovery modal.
async function handleRelatedMovies(url, res) {
  if (!TMDB_API_KEY && !TMDB_ACCESS_TOKEN) {
    sendJson(res, 500, {
      error:
        "Missing TMDB_API_KEY. Add it to a .env file in the project root."
    });
    return;
  }

  const query = String(url.searchParams.get("query") || "")
    .trim()
    .slice(0, 120);

  if (query.length < 2) {
    sendJson(res, 400, { error: "Search with at least two characters." });
    return;
  }

  try {
    const genreMatch = findGenreMatch(query);

    if (genreMatch) {
      const results = await discoverRelatedMovies({
        genreIds: genreMatch.ids
      });

      sendJson(res, 200, {
        query,
        matchType: "genre",
        matchName: genreMatch.name,
        results
      });
      return;
    }

    const actor = await findActor(query);

    if (!actor) {
      sendJson(res, 200, {
        query,
        matchType: "none",
        matchName: query,
        results: []
      });
      return;
    }

    const results = await discoverRelatedMovies({
      castId: actor.id
    });

    sendJson(res, 200, {
      query,
      matchType: "actor",
      matchName: actor.name,
      results
    });
  } catch (error) {
    console.error(error);
    sendJson(res, 502, { error: "TMDB search is unavailable right now." });
  }
}

// Builds the animated poster wall from TMDB discovery results or the local fallback set.
async function handlePosterWall(res) {
  if (!TMDB_API_KEY && !TMDB_ACCESS_TOKEN) {
    sendJson(res, 200, { posters: FALLBACK_POSTER_WALL });
    return;
  }

  try {
    const posters = await discoverPosterWallMovies();
    sendJson(res, 200, {
      posters: posters.length ? posters : FALLBACK_POSTER_WALL
    });
  } catch (error) {
    sendJson(res, 200, { posters: FALLBACK_POSTER_WALL });
  }
}

// Looks up US watch-provider names for a TMDB movie so detail cards can show streaming, rental, and purchase options.
async function handleMovieProviders(url, res) {
  if (!TMDB_API_KEY && !TMDB_ACCESS_TOKEN) {
    sendJson(res, 500, {
      error: "Missing TMDB_API_KEY. Add it to a .env file in the project root."
    });
    return;
  }

  const movieId = String(url.searchParams.get("movieId") || "").trim();
  if (!movieId) {
    sendJson(res, 400, { error: "Missing movieId parameter." });
    return;
  }

  try {
    const tmdbUrl = new URL(
      `https://api.themoviedb.org/3/movie/${encodeURIComponent(
        movieId
      )}/watch/providers`
    );

    const data = await fetchTmdbJson(tmdbUrl);
    const results = data.results || {};
    const country = "US";
    const countryData = results[country] || {};

    const streamingProviders = [
      ...(Array.isArray(countryData.flatrate) ? countryData.flatrate : []),
      ...(Array.isArray(countryData.free) ? countryData.free : []),
      ...(Array.isArray(countryData.ads) ? countryData.ads : [])
    ]
      .map((provider) => provider.provider_name)
      .filter(Boolean);

    const rentProviders = (Array.isArray(countryData.rent) ? countryData.rent : [])
      .map((provider) => provider.provider_name)
      .filter(Boolean);

    const buyProviders = (Array.isArray(countryData.buy) ? countryData.buy : [])
      .map((provider) => provider.provider_name)
      .filter(Boolean);

    const uniqueNames = (names) => [...new Set(names)];

    sendJson(res, 200, {
      country,
      streaming: uniqueNames(streamingProviders),
      rent: uniqueNames(rentProviders),
      buy: uniqueNames(buyProviders)
    });
  } catch (error) {
    console.error(error);
    sendJson(res, 502, { error: "TMDB provider lookup failed." });
  }
}

// Reports whether account auth is configured and which user, if any, owns the current session.
async function handleAuthMe(req, res) {
  if (!isAuthConfigured()) {
    sendJson(res, 200, { authConfigured: false, user: null });
    return;
  }

  const user = await getOptionalCurrentUser(req);
  sendJson(res, 200, { authConfigured: true, user: serializeUser(user) });
}

// Creates a new account, stores a hashed password, and opens a login session for the registered user.
async function handleAuthRegister(req, res) {
  if (!(await ensureAuthReady(res))) {
    return;
  }

  const body = await readJsonBody(req);
  const authInput = sanitizeAuthInput(body);

  if (!authInput.username) {
    sendJson(res, 400, {
      error: "Choose a username with 3-32 letters, numbers, underscores, or dashes."
    });
    return;
  }

  if (!authInput.password) {
    sendJson(res, 400, { error: "Use a password with at least 8 characters." });
    return;
  }

  const inviteCode = String(body.inviteCode || body.invite_code || "");

  if (AUTH_INVITE_CODE && inviteCode !== AUTH_INVITE_CODE) {
    sendJson(res, 403, { error: "That invite code is not valid." });
    return;
  }

  const db = getDbClient();
  const existingUser = await db.execute({
    sql: "SELECT id FROM users WHERE username = ? COLLATE NOCASE LIMIT 1",
    args: [authInput.username]
  });

  if (existingUser.rows.length) {
    sendJson(res, 409, { error: "That username is already taken." });
    return;
  }

  const passwordHash = await hashPassword(authInput.password);

  try {
    const result = await db.execute({
      sql:
        "INSERT INTO users (username, display_name, password_hash) VALUES (?, ?, ?)",
      args: [authInput.username, authInput.displayName, passwordHash]
    });
    const userId = Number(result.lastInsertRowid);
    const user = await getUserById(userId);
    const token = await createSession(userId);

    setSessionCookie(req, res, token);
    sendJson(res, 201, { user: serializeUser(user) });
  } catch (error) {
    if (isUniqueConstraintError(error)) {
      sendJson(res, 409, { error: "That username is already taken." });
      return;
    }

    throw error;
  }
}

// Verifies submitted credentials and replaces any old session with a fresh authenticated session.
async function handleAuthLogin(req, res) {
  if (!(await ensureAuthReady(res))) {
    return;
  }

  const body = await readJsonBody(req);
  const username = String(body.username || "").trim();
  const password = String(body.password || "");

  if (!username || !password) {
    sendJson(res, 400, { error: "Enter your username and password." });
    return;
  }

  const db = getDbClient();
  const result = await db.execute({
    sql: "SELECT * FROM users WHERE username = ? COLLATE NOCASE LIMIT 1",
    args: [username]
  });
  const row = result.rows[0];

  if (!row || !(await verifyPassword(password, row.password_hash))) {
    sendJson(res, 401, { error: "Username or password is incorrect." });
    return;
  }

  const token = await createSession(row.id);
  setSessionCookie(req, res, token);
  sendJson(res, 200, { user: serializeUser(formatUserRow(row)) });
}

// Deletes the current session token and clears the browser cookie.
async function handleAuthLogout(req, res) {
  if (isAuthConfigured()) {
    const token = getCookie(req, SESSION_COOKIE_NAME);

    if (token) {
      await ensureDatabaseReady();
      await getDbClient().execute({
        sql: "DELETE FROM sessions WHERE id = ?",
        args: [createSessionHash(token)]
      });
    }
  }

  clearSessionCookie(req, res);
  sendJson(res, 200, { ok: true });
}

// Returns the signed-in user's saved taste profile for the profile modal and recommendation prompts.
async function handleProfile(req, res) {
  const user = await requireCurrentUser(req, res);

  if (!user) {
    return;
  }

  const tasteProfile = await getTasteProfile(user.id, 100);
  sendJson(res, 200, {
    user: serializeUser(user),
    tasteProfile
  });
}

// Reads saved movie feedback for the current user, optionally filtered by feedback status.
async function handleGetMovieFeedback(url, req, res) {
  const user = await requireCurrentUser(req, res);

  if (!user) {
    return;
  }

  const status = normalizeFeedbackStatus(url.searchParams.get("status"));
  const limit = clampNumber(Number(url.searchParams.get("limit") || 100), 1, 200);
  const db = getDbClient();
  const args = [user.id];
  let sql = "SELECT * FROM movie_feedback WHERE user_id = ?";

  if (status) {
    sql += " AND status = ?";
    args.push(status);
  }

  sql += " ORDER BY updated_at DESC LIMIT ?";
  args.push(limit);

  const result = await db.execute({ sql, args });
  sendJson(res, 200, {
    feedback: result.rows.map(formatFeedbackRow)
  });
}

// Upserts a movie feedback record so watchlist and taste actions stay idempotent.
async function handleSaveMovieFeedback(req, res) {
  const user = await requireCurrentUser(req, res);

  if (!user) {
    return;
  }

  const body = await readJsonBody(req);
  const feedback = sanitizeMovieFeedback(body);

  if (!feedback.title) {
    sendJson(res, 400, { error: "Send a movie title to save feedback." });
    return;
  }

  if (!feedback.status) {
    sendJson(res, 400, {
      error: "Use one of these statuses: liked, disliked, watched, want_to_watch."
    });
    return;
  }

  const db = getDbClient();
  const existingFeedback = await findExistingFeedback(user.id, feedback);

  if (existingFeedback) {
    await db.execute({
      sql: [
        "UPDATE movie_feedback",
        "SET tmdb_id = ?, title = ?, normalized_title = ?, year = ?,",
        "poster_url = ?, tmdb_url = ?, status = ?, source = ?, note = ?,",
        "updated_at = CURRENT_TIMESTAMP",
        "WHERE id = ? AND user_id = ?"
      ].join(" "),
      args: [
        feedback.tmdbId,
        feedback.title,
        feedback.normalizedTitle,
        feedback.year,
        feedback.posterUrl,
        feedback.tmdbUrl,
        feedback.status,
        feedback.source,
        feedback.note,
        existingFeedback.id,
        user.id
      ]
    });

    const savedFeedback = await getFeedbackById(user.id, existingFeedback.id);
    sendJson(res, 200, { feedback: savedFeedback });
    return;
  }

  const result = await db.execute({
    sql: [
      "INSERT INTO movie_feedback",
      "(user_id, tmdb_id, title, normalized_title, year, poster_url, tmdb_url, status, source, note)",
      "VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
    ].join(" "),
    args: [
      user.id,
      feedback.tmdbId,
      feedback.title,
      feedback.normalizedTitle,
      feedback.year,
      feedback.posterUrl,
      feedback.tmdbUrl,
      feedback.status,
      feedback.source,
      feedback.note
    ]
  });
  const savedFeedback = await getFeedbackById(user.id, Number(result.lastInsertRowid));

  sendJson(res, 201, { feedback: savedFeedback });
}

// Deletes one saved feedback record by id, TMDB id, or title/year fallback.
async function handleDeleteMovieFeedback(url, req, res) {
  const user = await requireCurrentUser(req, res);

  if (!user) {
    return;
  }

  const id = Number(url.searchParams.get("id") || 0);
  const tmdbId = sanitizeTmdbId(url.searchParams.get("tmdbId"));
  const title = String(url.searchParams.get("title") || "").trim();
  const yearMatch = String(url.searchParams.get("year") || "").match(/\d{4}/);
  const year = yearMatch ? yearMatch[0] : "";
  const db = getDbClient();
  let result;

  if (Number.isFinite(id) && id > 0) {
    result = await db.execute({
      sql: "DELETE FROM movie_feedback WHERE id = ? AND user_id = ?",
      args: [id, user.id]
    });
  } else if (tmdbId) {
    result = await db.execute({
      sql: "DELETE FROM movie_feedback WHERE tmdb_id = ? AND user_id = ?",
      args: [tmdbId, user.id]
    });
  } else if (title) {
    result = await db.execute({
      sql:
        "DELETE FROM movie_feedback WHERE normalized_title = ? AND year = ? AND user_id = ?",
      args: [normalizeSearchTerm(title), year, user.id]
    });
  } else {
    sendJson(res, 400, { error: "Send a feedback id, tmdbId, or title to delete." });
    return;
  }

  sendJson(res, 200, {
    ok: true,
    deleted: Number(result.rowsAffected || 0)
  });
}

// Calls Gemini for JSON-only recommendations based on selected movies and optional taste history.
async function generateGeminiPickRecommendations(
  favoriteMovies,
  tasteProfile = createEmptyTasteProfile()
) {
  const pickList = favoriteMovies.map(formatFavoriteMovieLabel).join("; ");
  const tastePrompt = buildTasteProfilePrompt(tasteProfile);
  const prompt = [
    `The user selected these favorite movies: ${pickList}.`,
    tastePrompt ? `Saved taste profile: ${tastePrompt}` : "",
    "Based on those picks, recommend exactly three movies they should watch next.",
    "Use the same taste judgment you would use in a normal chat reply.",
    "Avoid sequels, remakes, and obvious repeats unless one is truly the best fit.",
    "For each movie, include a concise spoiler-free description and one quick sentence explaining why it fits those picks.",
    "Return valid JSON only."
  ]
    .filter(Boolean)
    .join("\n");
  const systemPrompt = [pickRecommendationSystemPrompt, tastePrompt]
    .filter(Boolean)
    .join(" ");

  const geminiResponse = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(
      GEMINI_MODEL
    )}:generateContent`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": GEMINI_API_KEY
      },
      body: JSON.stringify({
        systemInstruction: {
          parts: [{ text: systemPrompt }]
        },
        contents: [
          {
            role: "user",
            parts: [{ text: prompt }]
          }
        ],
        generationConfig: createPickRecommendationGenerationConfig({
          temperature: 0.72,
          maxOutputTokens: 1000
        })
      })
    }
  );

  const data = await geminiResponse.json().catch(() => ({}));

  if (!geminiResponse.ok) {
    const detail =
      data.error?.message ||
      `Gemini returned ${geminiResponse.status} ${geminiResponse.statusText}`;
    throw new Error(detail);
  }

  const parsed = parseGeminiJson(extractGeminiText(data));
  const rawRecommendations = Array.isArray(parsed)
    ? parsed
    : parsed.recommendations || parsed.movies || parsed.results || [];

  return normalizeGeminiRecommendations(rawRecommendations, favoriteMovies);
}

// Matches Gemini's text recommendations back to TMDB movies so the UI can display posters and links.
async function enrichGeminiRecommendations(recommendations, excludedMovies) {
  const results = [];
  const seen = new Set();

  for (const recommendation of recommendations) {
    const normalizedTitle = normalizeSearchTerm(recommendation.title);

    if (!normalizedTitle || excludedMovies.titles.has(normalizedTitle)) {
      continue;
    }

    let matchedMovie = null;

    if (TMDB_API_KEY || TMDB_ACCESS_TOKEN) {
      try {
        matchedMovie = await findTmdbMovieForRecommendation(
          recommendation,
          excludedMovies,
          seen
        );
      } catch (error) {
        console.error(error);
      }
    }

    if (matchedMovie) {
      seen.add(String(matchedMovie.id));
      results.push({
        ...matchedMovie,
        description: recommendation.description || matchedMovie.overview,
        fitReason: recommendation.fit,
        source: "gemini"
      });
      continue;
    }

    const syntheticId = `gemini-${normalizedTitle.replace(/\s+/g, "-")}`;

    if (seen.has(syntheticId)) {
      continue;
    }

    seen.add(syntheticId);
    results.push({
      id: syntheticId,
      title: recommendation.title,
      year: recommendation.year,
      overview: "",
      description: recommendation.description,
      posterUrl: "",
      tmdbUrl: "",
      voteAverage: 0,
      fitReason: recommendation.fit,
      source: "gemini"
    });
  }

  return results.slice(0, 3);
}

// Finds the best TMDB search result for one Gemini recommendation while honoring excluded titles.
async function findTmdbMovieForRecommendation(
  recommendation,
  excludedMovies,
  seenMovies
) {
  const tmdbUrl = new URL("https://api.themoviedb.org/3/search/movie");
  tmdbUrl.searchParams.set("query", recommendation.title);
  tmdbUrl.searchParams.set("include_adult", "false");
  tmdbUrl.searchParams.set("language", "en-US");
  tmdbUrl.searchParams.set("page", "1");

  if (recommendation.year) {
    tmdbUrl.searchParams.set("year", recommendation.year);
  }

  const data = await fetchTmdbJson(tmdbUrl);
  const movies = Array.isArray(data.results) ? data.results : [];
  const normalizedTitle = normalizeSearchTerm(recommendation.title);

  const bestMatch =
    movies.find((movie) => {
      const movieTitle = normalizeSearchTerm(movie.title || movie.original_title);
      return (
        movieTitle === normalizedTitle &&
        isUsableRecommendationMovie(movie) &&
        !excludedMovies.ids.has(Number(movie.id)) &&
        !seenMovies.has(String(movie.id))
      );
    }) ||
    movies.find(
      (movie) =>
        isUsableRecommendationMovie(movie) &&
        !excludedMovies.ids.has(Number(movie.id)) &&
        !seenMovies.has(String(movie.id))
    );

  return bestMatch ? formatRelatedMovie(bestMatch) : null;
}

// Builds fallback recommendations from TMDB similar and recommendation endpoints for each selected pick.
async function discoverMoviesFromFavoritePicks(
  favoriteMovies,
  excludedMovies,
  limit = 3
) {
  const pickIds = favoriteMovies
    .map((movie) => Number(movie.id))
    .filter((id) => Number.isFinite(id) && id > 0);

  if (!pickIds.length || limit <= 0) {
    return [];
  }

  const candidateMap = new Map();

  for (const [pickIndex, pickId] of pickIds.entries()) {
    const recommendationPages = await Promise.allSettled([
      fetchTmdbJson(createMovieSuggestionsUrl(pickId, "recommendations")),
      fetchTmdbJson(createMovieSuggestionsUrl(pickId, "similar"))
    ]);

    recommendationPages.forEach((settled, sourceIndex) => {
      if (settled.status !== "fulfilled") {
        return;
      }

      const sourceWeight = sourceIndex === 0 ? 26 : 16;
      const movies = Array.isArray(settled.value.results)
        ? settled.value.results
        : [];

      movies.forEach((movie, index) => {
        addSuggestionCandidate(candidateMap, movie, {
          excludedMovies,
          pickIndex,
          sourceWeight,
          rank: index
        });
      });
    });
  }

  return [...candidateMap.values()]
    .sort((first, second) => second.score - first.score)
    .slice(0, limit)
    .map((candidate) => {
      const reason = buildFallbackFitReason(candidate.pickIndexes.size);
      return {
        ...formatRelatedMovie(candidate.movie),
        description: candidate.movie.overview || "",
        fitReason: reason,
        source: "tmdb"
      };
    });
}

// Samples popular TMDB pages to gather enough poster art for the moving background.
async function discoverPosterWallMovies() {
  const firstPage = await fetchTmdbJson(createDiscoverUrl({ page: 1 }));
  const pageCount = Math.min(Number(firstPage.total_pages || 1), 20);
  const pages = getRandomPages(pageCount, POSTER_WALL_PAGE_SAMPLE_COUNT, [1]);
  const pageResults = [
    firstPage,
    ...(await Promise.all(
      pages.map((page) => fetchTmdbJson(createDiscoverUrl({ page })))
    ))
  ];

  return uniqueMovies(
    pageResults.flatMap((page) => (Array.isArray(page.results) ? page.results : []))
  )
    .filter(isUsableEnglishMovie)
    .sort(() => Math.random() - 0.5)
    .slice(0, POSTER_WALL_LIMIT)
    .map(formatPosterMovie);
}

// Discovers related movies by genre ids or cast id and keeps only usable English-language results.
async function discoverRelatedMovies({ genreIds = [], castId = "" }) {
  const firstPage = await fetchTmdbJson(
    createDiscoverUrl({
      page: 1,
      genreIds,
      castId,
      voteCount: 40,
      voteAverage: 5
    })
  );
  const pageCount = Math.min(Number(firstPage.total_pages || 1), 25);
  const pages = getRandomPages(pageCount, 5, [1]);
  const pageResults = [firstPage];

  for (const page of pages) {
    pageResults.push(
      await fetchTmdbJson(
        createDiscoverUrl({
          page,
          genreIds,
          castId,
          voteCount: 40,
          voteAverage: 5
        })
      )
    );
  }

  return uniqueMovies(
    pageResults.flatMap((page) => (Array.isArray(page.results) ? page.results : []))
  )
    .filter(isUsableEnglishMovie)
    .sort(() => Math.random() - 0.5)
    .slice(0, 3)
    .map(formatRelatedMovie);
}

// Finds the first matching TMDB person record for an actor search query.
async function findActor(query) {
  const tmdbUrl = new URL("https://api.themoviedb.org/3/search/person");
  tmdbUrl.searchParams.set("query", query);
  tmdbUrl.searchParams.set("include_adult", "false");
  tmdbUrl.searchParams.set("language", "en-US");
  tmdbUrl.searchParams.set("page", "1");

  const data = await fetchTmdbJson(tmdbUrl);
  const people = Array.isArray(data.results) ? data.results : [];

  return (
    people.find((person) => person.known_for_department === "Acting") ||
    people.find((person) =>
      Array.isArray(person.known_for)
        ? person.known_for.some((item) => item.media_type === "movie")
        : false
    ) ||
    null
  );
}

// Creates a TMDB discover URL with shared defaults for language, region, posters, and sorting.
function createDiscoverUrl({
  page = 1,
  genreIds = [],
  castId = "",
  voteCount = 200,
  voteAverage = 5.5
} = {}) {
  const tmdbUrl = new URL("https://api.themoviedb.org/3/discover/movie");
  tmdbUrl.searchParams.set("include_adult", "false");
  tmdbUrl.searchParams.set("include_video", "false");
  tmdbUrl.searchParams.set("language", "en-US");
  tmdbUrl.searchParams.set("with_original_language", "en");
  tmdbUrl.searchParams.set("page", String(page));
  tmdbUrl.searchParams.set("sort_by", "popularity.desc");
  tmdbUrl.searchParams.set("vote_count.gte", String(voteCount));
  tmdbUrl.searchParams.set("vote_average.gte", String(voteAverage));
  tmdbUrl.searchParams.set("certification_country", "US");
  tmdbUrl.searchParams.set("certification.gte", "G");
  tmdbUrl.searchParams.set("certification.lte", "R");
  tmdbUrl.searchParams.set(
    "primary_release_date.lte",
    new Date().toISOString().slice(0, 10)
  );

  if (genreIds.length) {
    tmdbUrl.searchParams.set("with_genres", genreIds.join(","));
  } else if (!castId) {
    tmdbUrl.searchParams.set("with_genres", "18|53|9648|80|878|10749|35|28|12");
  }

  if (castId) {
    tmdbUrl.searchParams.set("with_cast", String(castId));
  }

  return tmdbUrl;
}

// Fetches TMDB JSON with the configured auth strategy and normalizes API errors into exceptions.
async function fetchTmdbJson(tmdbUrl) {
  const tmdbResponse = await fetch(tmdbUrl, getTmdbRequestOptions(tmdbUrl));
  const data = await tmdbResponse.json().catch(() => ({}));

  if (!tmdbResponse.ok) {
    const detail =
      data.status_message ||
      data.error?.message ||
      `TMDB returned ${tmdbResponse.status} ${tmdbResponse.statusText}`;
    throw new Error(detail);
  }

  return data;
}

// Checks whether both Turso connection values are present.
function isDatabaseConfigured() {
  return Boolean(TURSO_DATABASE_URL && TURSO_AUTH_TOKEN);
}

// Checks whether database sessions also have the secret needed for secure token hashing.
function isAuthConfigured() {
  return isDatabaseConfigured() && Boolean(SESSION_SECRET);
}

// Ensures auth dependencies are ready before an account-only endpoint continues.
async function ensureAuthReady(res) {
  if (!isDatabaseConfigured()) {
    sendJson(res, 503, {
      error: "Accounts are not configured. Add TURSO_DATABASE_URL and TURSO_AUTH_TOKEN."
    });
    return false;
  }

  if (!SESSION_SECRET) {
    sendJson(res, 503, {
      error: "Login sessions are not configured. Add SESSION_SECRET."
    });
    return false;
  }

  await ensureDatabaseReady();
  return true;
}

// Returns the memoized Turso client or creates it from environment configuration.
function getDbClient() {
  if (!isDatabaseConfigured()) {
    throw new Error("Turso database is not configured.");
  }

  if (!dbClient) {
    dbClient = createClient({
      url: TURSO_DATABASE_URL,
      authToken: TURSO_AUTH_TOKEN
    });
  }

  return dbClient;
}

// Shares the one-time database initialization promise across concurrent requests.
function ensureDatabaseReady() {
  if (!databaseReadyPromise) {
    databaseReadyPromise = initializeDatabase().catch((error) => {
      databaseReadyPromise = null;
      throw error;
    });
  }

  return databaseReadyPromise;
}

// Creates the user, session, and movie feedback tables if they do not already exist.
async function initializeDatabase() {
  const db = getDbClient();

  await db.batch(
    [
      "PRAGMA foreign_keys = ON",
      [
        "CREATE TABLE IF NOT EXISTS users (",
        "id INTEGER PRIMARY KEY AUTOINCREMENT,",
        "username TEXT NOT NULL UNIQUE COLLATE NOCASE,",
        "display_name TEXT NOT NULL,",
        "password_hash TEXT NOT NULL,",
        "created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP",
        ")"
      ].join(" "),
      [
        "CREATE TABLE IF NOT EXISTS sessions (",
        "id TEXT PRIMARY KEY,",
        "user_id INTEGER NOT NULL,",
        "expires_at TEXT NOT NULL,",
        "created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,",
        "FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE",
        ")"
      ].join(" "),
      [
        "CREATE TABLE IF NOT EXISTS movie_feedback (",
        "id INTEGER PRIMARY KEY AUTOINCREMENT,",
        "user_id INTEGER NOT NULL,",
        "tmdb_id TEXT,",
        "title TEXT NOT NULL,",
        "normalized_title TEXT NOT NULL,",
        "year TEXT,",
        "poster_url TEXT,",
        "tmdb_url TEXT,",
        "status TEXT NOT NULL CHECK (status IN ('liked', 'disliked', 'watched', 'want_to_watch')),",
        "source TEXT NOT NULL DEFAULT 'manual',",
        "note TEXT,",
        "created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,",
        "updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,",
        "FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE",
        ")"
      ].join(" "),
      "CREATE INDEX IF NOT EXISTS sessions_user_id_idx ON sessions(user_id)",
      "CREATE INDEX IF NOT EXISTS sessions_expires_at_idx ON sessions(expires_at)",
      "CREATE INDEX IF NOT EXISTS movie_feedback_user_status_idx ON movie_feedback(user_id, status)",
      "CREATE INDEX IF NOT EXISTS movie_feedback_user_tmdb_idx ON movie_feedback(user_id, tmdb_id)",
      "CREATE INDEX IF NOT EXISTS movie_feedback_user_title_idx ON movie_feedback(user_id, normalized_title, year)"
    ],
    "write"
  );
}

// Requires a valid session user and writes the correct auth error response when missing.
async function requireCurrentUser(req, res) {
  if (!(await ensureAuthReady(res))) {
    return null;
  }

  const user = await getOptionalCurrentUser(req);

  if (!user) {
    sendJson(res, 401, { error: "Log in to use this endpoint." });
    return null;
  }

  return user;
}

// Reads the current user from the session cookie without forcing the request to be authenticated.
async function getOptionalCurrentUser(req) {
  if (!isAuthConfigured()) {
    return null;
  }

  const token = getCookie(req, SESSION_COOKIE_NAME);

  if (!token) {
    return null;
  }

  await ensureDatabaseReady();

  const result = await getDbClient().execute({
    sql: [
      "SELECT users.* FROM sessions",
      "JOIN users ON users.id = sessions.user_id",
      "WHERE sessions.id = ? AND sessions.expires_at > CURRENT_TIMESTAMP",
      "LIMIT 1"
    ].join(" "),
    args: [createSessionHash(token)]
  });

  return result.rows[0] ? formatUserRow(result.rows[0]) : null;
}

// Looks up one user by primary key and formats it for server-side use.
async function getUserById(userId) {
  const result = await getDbClient().execute({
    sql: "SELECT * FROM users WHERE id = ? LIMIT 1",
    args: [userId]
  });

  return result.rows[0] ? formatUserRow(result.rows[0]) : null;
}

// Converts a database user row into the camelCase shape used by the app.
function formatUserRow(row) {
  return {
    id: Number(row.id),
    username: String(row.username || ""),
    displayName: String(row.display_name || row.displayName || row.username || ""),
    createdAt: String(row.created_at || row.createdAt || "")
  };
}

// Strips server-only account fields before sending user data to the browser.
function serializeUser(user) {
  if (!user) {
    return null;
  }

  return {
    id: user.id,
    username: user.username,
    displayName: user.displayName,
    createdAt: user.createdAt
  };
}

// Validates and trims account form input into safe username, display name, and password values.
function sanitizeAuthInput(body) {
  const username = String(body.username || "")
    .trim()
    .toLowerCase();
  const displayName = String(body.displayName || body.display_name || username)
    .trim()
    .slice(0, 40);
  const password = String(body.password || "");
  const validUsername = /^[a-z0-9_-]{3,32}$/.test(username) ? username : "";
  const validPassword =
    password.length >= 8 && password.length <= 128 ? password : "";

  return {
    username: validUsername,
    displayName: displayName || validUsername,
    password: validPassword
  };
}

// Hashes a password with scrypt, a per-password salt, and the configured key length.
async function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString("hex");
  const key = await scryptAsync(password, salt, PASSWORD_KEY_LENGTH);
  return `scrypt$${salt}$${key.toString("hex")}`;
}

// Verifies a password by recomputing its scrypt hash and comparing in constant time.
async function verifyPassword(password, passwordHash) {
  const [scheme, salt, storedHash] = String(passwordHash || "").split("$");

  if (scheme !== "scrypt" || !salt || !storedHash) {
    return false;
  }

  const storedBuffer = Buffer.from(storedHash, "hex");
  const key = await scryptAsync(password, salt, storedBuffer.length);

  if (key.length !== storedBuffer.length) {
    return false;
  }

  return crypto.timingSafeEqual(key, storedBuffer);
}

// Creates and stores a session token while returning only the raw token for the cookie.
async function createSession(userId) {
  const token = crypto.randomBytes(32).toString("base64url");

  await getDbClient().execute({
    sql:
      "INSERT INTO sessions (id, user_id, expires_at) VALUES (?, ?, datetime('now', '+30 days'))",
    args: [createSessionHash(token), userId]
  });

  return token;
}

// Hashes session tokens with the app secret before they touch persistent storage.
function createSessionHash(token) {
  return crypto
    .createHmac("sha256", SESSION_SECRET)
    .update(String(token || ""))
    .digest("hex");
}

// Extracts and decodes a named cookie value from the request header.
function getCookie(req, name) {
  const cookies = String(req.headers.cookie || "")
    .split(";")
    .map((cookie) => cookie.trim())
    .filter(Boolean);

  for (const cookie of cookies) {
    const separatorIndex = cookie.indexOf("=");

    if (separatorIndex === -1) {
      continue;
    }

    const cookieName = cookie.slice(0, separatorIndex);

    if (cookieName === name) {
      return decodeURIComponent(cookie.slice(separatorIndex + 1));
    }
  }

  return "";
}

// Writes the session cookie with HttpOnly, SameSite, and optional Secure protections.
function setSessionCookie(req, res, token) {
  const maxAgeSeconds = Math.floor(SESSION_DURATION_MS / 1000);
  const cookieParts = [
    `${SESSION_COOKIE_NAME}=${encodeURIComponent(token)}`,
    "Path=/",
    "HttpOnly",
    "SameSite=Lax",
    `Max-Age=${maxAgeSeconds}`
  ];

  if (isSecureRequest(req)) {
    cookieParts.push("Secure");
  }

  res.setHeader("Set-Cookie", cookieParts.join("; "));
}

// Expires the session cookie in the browser after logout or invalid-session cleanup.
function clearSessionCookie(req, res) {
  const cookieParts = [
    `${SESSION_COOKIE_NAME}=`,
    "Path=/",
    "HttpOnly",
    "SameSite=Lax",
    "Max-Age=0"
  ];

  if (isSecureRequest(req)) {
    cookieParts.push("Secure");
  }

  res.setHeader("Set-Cookie", cookieParts.join("; "));
}

// Detects HTTPS directly or through common proxy headers before setting Secure cookies.
function isSecureRequest(req) {
  return (
    req.headers["x-forwarded-proto"] === "https" ||
    req.headers["x-forwarded-ssl"] === "on" ||
    Boolean(req.socket.encrypted)
  );
}

// Loads recent feedback and groups it into liked, disliked, watched, and watchlist buckets.
async function getTasteProfile(userId, limit = TASTE_PROMPT_LIMIT) {
  const result = await getDbClient().execute({
    sql:
      "SELECT * FROM movie_feedback WHERE user_id = ? ORDER BY updated_at DESC LIMIT ?",
    args: [userId, limit]
  });
  const feedback = result.rows.map(formatFeedbackRow);

  return {
    feedback,
    liked: feedback.filter((movie) => movie.status === "liked"),
    disliked: feedback.filter((movie) => movie.status === "disliked"),
    watched: feedback.filter((movie) =>
      ["liked", "disliked", "watched"].includes(movie.status)
    ),
    wantToWatch: feedback.filter((movie) => movie.status === "want_to_watch")
  };
}

// Provides an empty taste profile shape for anonymous requests.
function createEmptyTasteProfile() {
  return {
    feedback: [],
    liked: [],
    disliked: [],
    watched: [],
    wantToWatch: []
  };
}

// Formats a movie feedback database row into the browser-facing shape.
function formatFeedbackRow(row) {
  const tmdbId = Number(row.tmdb_id || row.tmdbId || 0);

  return {
    id: Number(row.id),
    tmdbId: Number.isFinite(tmdbId) && tmdbId > 0 ? tmdbId : null,
    title: String(row.title || ""),
    year: String(row.year || ""),
    posterUrl: String(row.poster_url || row.posterUrl || ""),
    tmdbUrl: String(row.tmdb_url || row.tmdbUrl || ""),
    status: String(row.status || ""),
    source: String(row.source || ""),
    note: String(row.note || ""),
    createdAt: String(row.created_at || row.createdAt || ""),
    updatedAt: String(row.updated_at || row.updatedAt || "")
  };
}

// Sanitizes movie feedback input before it is inserted or updated in Turso.
function sanitizeMovieFeedback(body) {
  const title = String(body.title || body.movie?.title || "")
    .trim()
    .slice(0, 120);
  const yearMatch = String(body.year || body.movie?.year || "").match(/\d{4}/);
  const year = yearMatch ? yearMatch[0] : "";
  const status = normalizeFeedbackStatus(body.status || body.reaction);
  const source = String(body.source || "manual")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, "_")
    .slice(0, 40);

  return {
    tmdbId: sanitizeTmdbId(body.tmdbId ?? body.tmdb_id ?? body.id ?? body.movie?.id),
    title,
    normalizedTitle: normalizeSearchTerm(title),
    year,
    posterUrl: sanitizeOptionalUrl(body.posterUrl || body.poster_url || ""),
    tmdbUrl: sanitizeOptionalUrl(body.tmdbUrl || body.tmdb_url || ""),
    status,
    source: source || "manual",
    note: String(body.note || "").trim().slice(0, 280)
  };
}

// Normalizes UI feedback labels into the finite set stored in the database.
function normalizeFeedbackStatus(value) {
  const status = String(value || "")
    .trim()
    .toLowerCase()
    .replace(/-/g, "_");

  if (["success", "watched_liked", "watch_liked"].includes(status)) {
    return "liked";
  }

  if (["watched_disliked", "watch_disliked"].includes(status)) {
    return "disliked";
  }

  return FEEDBACK_STATUS_VALUES.has(status) ? status : "";
}

// Accepts only positive integer TMDB ids and returns them as strings for storage.
function sanitizeTmdbId(value) {
  const tmdbId = Number(value);

  if (!Number.isFinite(tmdbId) || tmdbId <= 0) {
    return null;
  }

  return String(Math.trunc(tmdbId));
}

// Allows only http and https URLs for poster and TMDB link fields.
function sanitizeOptionalUrl(value) {
  const url = String(value || "").trim().slice(0, 500);
  return /^https?:\/\//i.test(url) ? url : "";
}

// Finds an existing feedback row by TMDB id first, then by normalized title and year.
async function findExistingFeedback(userId, feedback) {
  if (feedback.tmdbId) {
    const byTmdbId = await getDbClient().execute({
      sql: "SELECT id FROM movie_feedback WHERE user_id = ? AND tmdb_id = ? LIMIT 1",
      args: [userId, feedback.tmdbId]
    });

    if (byTmdbId.rows[0]) {
      return byTmdbId.rows[0];
    }
  }

  const byTitle = await getDbClient().execute({
    sql: [
      "SELECT id FROM movie_feedback",
      "WHERE user_id = ? AND normalized_title = ? AND year = ?",
      "LIMIT 1"
    ].join(" "),
    args: [userId, feedback.normalizedTitle, feedback.year]
  });

  return byTitle.rows[0] || null;
}

// Loads one feedback record for the current user after a write confirms its id.
async function getFeedbackById(userId, feedbackId) {
  const result = await getDbClient().execute({
    sql: "SELECT * FROM movie_feedback WHERE user_id = ? AND id = ? LIMIT 1",
    args: [userId, feedbackId]
  });

  return result.rows[0] ? formatFeedbackRow(result.rows[0]) : null;
}

// Builds the final Gemini chat prompt from the base instructions, selected picks, and taste history.
function buildChatSystemPrompt(favoriteMovies, tasteProfile) {
  const promptParts = [movieSystemPrompt];
  const tastePrompt = buildTasteProfilePrompt(tasteProfile);

  if (favoriteMovies.length) {
    promptParts.push(
      `The user selected these favorite movies: ${favoriteMovies.join(
        ", "
      )}. Use them as taste signals when they ask for recommendations.`
    );
  }

  if (tastePrompt) {
    promptParts.push(`Saved taste profile: ${tastePrompt}`);
  }

  return promptParts.join(" ");
}

// Converts saved feedback into compact natural-language guidance for Gemini.
function buildTasteProfilePrompt(tasteProfile) {
  if (!tasteProfile?.feedback?.length) {
    return "";
  }

  const watchedOnly = tasteProfile.feedback.filter(
    (movie) => movie.status === "watched"
  );
  const parts = [];

  if (tasteProfile.liked.length) {
    parts.push(`Liked: ${formatProfileMovieList(tasteProfile.liked)}.`);
  }

  if (tasteProfile.disliked.length) {
    parts.push(`Disliked: ${formatProfileMovieList(tasteProfile.disliked)}.`);
  }

  if (watchedOnly.length) {
    parts.push(`Watched: ${formatProfileMovieList(watchedOnly)}.`);
  }

  if (tasteProfile.wantToWatch.length) {
    parts.push(
      `Interested in watching: ${formatProfileMovieList(tasteProfile.wantToWatch)}.`
    );
  }

  if (tasteProfile.watched.length || tasteProfile.disliked.length) {
    parts.push(
      "Avoid recommending disliked or already watched movies unless the user asks for repeats."
    );
  }

  return parts.join(" ");
}

// Joins a limited number of feedback movies into a short prompt-safe list.
function formatProfileMovieList(movies) {
  return movies.slice(0, TASTE_PROMPT_LIMIT).map(formatFeedbackMovieLabel).join(", ");
}

// Formats one saved movie as Title or Title (Year) for prompts and labels.
function formatFeedbackMovieLabel(movie) {
  return movie.year ? `${movie.title} (${movie.year})` : movie.title;
}

// Converts watched and disliked feedback into exclusion candidates for recommendations.
function getTasteExcludedMovies(tasteProfile) {
  return (tasteProfile?.feedback || [])
    .filter((movie) => ["liked", "disliked", "watched"].includes(movie.status))
    .map((movie) => ({
      id: movie.tmdbId || "",
      title: movie.title,
      year: movie.year
    }));
}

// Detects uniqueness errors from Turso without depending on one exact driver message.
function isUniqueConstraintError(error) {
  return /constraint|unique/i.test(String(error?.message || error));
}

// Matches a free-text query against aliases and official TMDB genre names.
function findGenreMatch(query) {
  const normalizedQuery = normalizeSearchTerm(query);

  if (!normalizedQuery) {
    return null;
  }

  for (const [alias, match] of GENRE_ALIASES) {
    const normalizedAlias = normalizeSearchTerm(alias);

    if (
      normalizedQuery === normalizedAlias ||
      containsNormalizedPhrase(normalizedQuery, normalizedAlias)
    ) {
      return match;
    }
  }

  const matchingGenres = TMDB_MOVIE_GENRES.filter((genre) => {
    const normalizedGenre = normalizeSearchTerm(genre.name);
    return (
      normalizedQuery === normalizedGenre ||
      containsNormalizedPhrase(normalizedQuery, normalizedGenre)
    );
  });

  if (!matchingGenres.length) {
    return null;
  }

  return {
    name: matchingGenres.map((genre) => genre.name).join(" + "),
    ids: matchingGenres.map((genre) => genre.id)
  };
}

// Lowercases and strips punctuation so titles, genres, and aliases compare consistently.
function normalizeSearchTerm(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

// Checks whether a normalized phrase appears as a whole phrase within another normalized value.
function containsNormalizedPhrase(value, phrase) {
  return ` ${value} `.includes(` ${phrase} `);
}

// Filters TMDB movies to English-language entries with posters and visible titles.
function isUsableEnglishMovie(movie) {
  return Boolean(
    movie?.id &&
      movie.poster_path &&
      movie.original_language === "en" &&
      !movie.adult &&
      (movie.title || movie.original_title)
  );
}

// Removes duplicate TMDB movies while preserving the first useful ordering.
function uniqueMovies(movies) {
  const seen = new Set();
  const unique = [];

  for (const movie of movies) {
    if (!movie?.id || seen.has(movie.id)) {
      continue;
    }

    seen.add(movie.id);
    unique.push(movie);
  }

  return unique;
}

// Converts a TMDB movie into the small poster-wall tile shape.
function formatPosterMovie(movie) {
  return {
    id: movie.id,
    title: movie.title || movie.original_title || "Movie poster",
    posterUrl: `${TMDB_IMAGE_BASE}${movie.poster_path}`
  };
}

// Converts a TMDB movie into the recommendation-card shape expected by the browser.
function formatRelatedMovie(movie) {
  return {
    id: movie.id,
    title: movie.title || movie.original_title || "Untitled",
    year: movie.release_date ? movie.release_date.slice(0, 4) : "",
    overview: movie.overview || "",
    posterUrl: `${TMDB_IMAGE_BASE}${movie.poster_path}`,
    tmdbUrl: `https://www.themoviedb.org/movie/${movie.id}`,
    tmdbWatchUrl: `https://www.themoviedb.org/movie/${movie.id}/watch`,
    voteAverage: Number(movie.vote_average || 0)
  };
}

// Extracts the first Gemini candidate text into a plain string.
function extractGeminiText(data) {
  return (
    data.candidates?.[0]?.content?.parts
      ?.map((part) => part.text || "")
      .join("")
      .trim() || ""
  );
}

// Parses Gemini JSON even when the model wraps it in markdown fences or surrounding text.
function parseGeminiJson(text) {
  const trimmed = String(text || "")
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();

  if (!trimmed) {
    return {};
  }

  try {
    return JSON.parse(trimmed);
  } catch (error) {
    const match = trimmed.match(/\{[\s\S]*\}|\[[\s\S]*\]/);

    if (!match) {
      return {};
    }

    try {
      return JSON.parse(match[0]);
    } catch (nestedError) {
      return {};
    }
  }
}

// Sanitizes Gemini recommendation objects and removes duplicates or already-selected titles.
function normalizeGeminiRecommendations(recommendations, favoriteMovies) {
  const excludedMovies = createExcludedMovieSet(favoriteMovies);
  const seenTitles = new Set();

  return (Array.isArray(recommendations) ? recommendations : [])
    .map((movie) => {
      const title = String(
        movie?.title || movie?.name || movie?.movie || movie?.movieTitle || ""
      )
        .trim()
        .slice(0, 120);
      const yearMatch = String(
        movie?.year || movie?.releaseYear || movie?.release_date || ""
      ).match(/\d{4}/);
      const year = yearMatch ? yearMatch[0] : "";
      const description = cleanRecommendationCopy(
        movie?.description || movie?.synopsis || movie?.overview || movie?.summary || ""
      ).slice(0, 360);
      const fit = cleanRecommendationCopy(
        movie?.fit || movie?.reason || movie?.why || movie?.whyItFits || ""
      ).slice(0, 260);

      return { title, year, description, fit };
    })
    .map((movie) => ({
      ...movie,
      description: movie.description || movie.fit,
      fit: movie.fit || movie.description
    }))
    .filter((movie) => {
      const normalizedTitle = normalizeSearchTerm(movie.title);

      if (
        !normalizedTitle ||
        seenTitles.has(normalizedTitle) ||
        excludedMovies.titles.has(normalizedTitle)
      ) {
        return false;
      }

      seenTitles.add(normalizedTitle);
      return true;
    })
    .slice(0, 3);
}

// Collapses whitespace and strips wrapper quotes from model-generated recommendation copy.
function cleanRecommendationCopy(value) {
  return String(value || "")
    .trim()
    .replace(/\s+/g, " ")
    .replace(/^["']|["']$/g, "");
}

// Creates Gemini generation settings and disables thinking for the configured Flash model when supported.
function createPickRecommendationGenerationConfig({
  temperature,
  maxOutputTokens
}) {
  const config = {
    temperature,
    maxOutputTokens
  };

  if (/gemini-2\.5-flash/i.test(GEMINI_MODEL)) {
    config.thinkingConfig = {
      thinkingBudget: 0
    };
  }

  return config;
}

// Builds the TMDB similar or recommendations URL for a selected movie id.
function createMovieSuggestionsUrl(movieId, suggestionType) {
  const safeSuggestionType =
    suggestionType === "similar" ? "similar" : "recommendations";
  const tmdbUrl = new URL(
    `https://api.themoviedb.org/3/movie/${encodeURIComponent(
      movieId
    )}/${safeSuggestionType}`
  );
  tmdbUrl.searchParams.set("language", "en-US");
  tmdbUrl.searchParams.set("page", "1");
  return tmdbUrl;
}

// Scores and deduplicates one TMDB fallback candidate against the user's selected picks.
function addSuggestionCandidate(
  candidateMap,
  movie,
  { excludedMovies, pickIndex, sourceWeight, rank }
) {
  if (
    !isUsableRecommendationMovie(movie) ||
    excludedMovies.ids.has(Number(movie.id))
  ) {
    return;
  }

  const normalizedTitle = normalizeSearchTerm(movie.title || movie.original_title);

  if (!normalizedTitle || excludedMovies.titles.has(normalizedTitle)) {
    return;
  }

  const key = String(movie.id);
  const voteAverage = Number(movie.vote_average || 0);
  const voteCount = Number(movie.vote_count || 0);
  const popularity = Number(movie.popularity || 0);
  const score =
    sourceWeight +
    Math.max(0, 12 - rank) +
    Math.min(voteAverage, 8) +
    Math.min(voteCount / 350, 8) +
    Math.min(popularity / 18, 5);

  if (!candidateMap.has(key)) {
    candidateMap.set(key, {
      movie,
      score,
      pickIndexes: new Set([pickIndex])
    });
    return;
  }

  const candidate = candidateMap.get(key);
  candidate.score += score + 12;
  candidate.pickIndexes.add(pickIndex);
}

// Checks whether a TMDB movie can become a visible fallback recommendation card.
function isUsableRecommendationMovie(movie) {
  return Boolean(
    movie?.id &&
      movie.poster_path &&
      !movie.adult &&
      (movie.title || movie.original_title)
  );
}

// Explains why a TMDB fallback was chosen when Gemini detail is unavailable.
function buildFallbackFitReason(pickCount) {
  if (pickCount > 1) {
    return "It overlaps with more than one of your picks, so it is the fallback match with the strongest shared signal.";
  }

  return "It shares recommendation signals with one of your picks, with ratings and popularity used as guardrails.";
}

// Merges Gemini-enriched results with TMDB fallbacks without duplicating cards.
function mergeRecommendationResults(primaryResults, fallbackResults) {
  const seen = new Set();
  const merged = [];

  [...primaryResults, ...fallbackResults].forEach((movie) => {
    const key = movie.id
      ? `id:${movie.id}`
      : `title:${normalizeSearchTerm(movie.title)}:${movie.year || ""}`;

    if (seen.has(key)) {
      return;
    }

    seen.add(key);
    merged.push(movie);
  });

  return merged;
}

// Builds id and title lookup sets for movies that should not be recommended again.
function createExcludedMovieSet(favoriteMovies) {
  return {
    ids: new Set(
      favoriteMovies
        .map((movie) => Number(movie.id))
        .filter((id) => Number.isFinite(id) && id > 0)
    ),
    titles: new Set(
      favoriteMovies
        .map((movie) => normalizeSearchTerm(movie.title))
        .filter(Boolean)
    )
  };
}

// Formats a selected favorite movie as Title or Title (Year) for response metadata.
function formatFavoriteMovieLabel(movie) {
  return movie.year ? `${movie.title} (${movie.year})` : movie.title;
}

// Picks random TMDB page numbers while avoiding already-sampled pages where possible.
function getRandomPages(pageCount, count, excludePages = []) {
  const excluded = new Set(excludePages);
  const pages = new Set();
  const maxAttempts = count * 8;
  let attempts = 0;

  while (
    pages.size < count &&
    pages.size + excluded.size < pageCount &&
    attempts < maxAttempts
  ) {
    const page = 1 + Math.floor(Math.random() * pageCount);
    attempts += 1;

    if (!excluded.has(page)) {
      pages.add(page);
    }
  }

  return [...pages];
}

// Clamps a number into a fixed range and falls back to the minimum for invalid input.
function clampNumber(value, min, max) {
  if (!Number.isFinite(value)) {
    return min;
  }

  return Math.min(Math.max(value, min), max);
}

// Serves static files from the public directory while preventing path traversal.
function serveStatic(pathname, res) {
  const requestedPath = pathname === "/" ? "/index.html" : pathname;
  const decodedPath = decodeURIComponent(requestedPath);
  const filePath = path.normalize(path.join(PUBLIC_DIR, decodedPath));

  if (!filePath.startsWith(PUBLIC_DIR)) {
    sendText(res, 403, "Forbidden");
    return;
  }

  fs.readFile(filePath, (error, content) => {
    if (error) {
      sendText(res, 404, "Not found");
      return;
    }

    const ext = path.extname(filePath);
    res.writeHead(200, {
      "Content-Type": MIME_TYPES[ext] || "application/octet-stream"
    });
    res.end(content);
  });
}

// Sanitizes chat history into the short Gemini-compatible transcript shape.
function sanitizeMessages(messages) {
  if (!Array.isArray(messages)) {
    return [];
  }

  return messages
    .slice(-12)
    .map((message) => ({
      role: message.role === "model" ? "model" : "user",
      text: String(message.text || "").trim().slice(0, 2000)
    }))
    .filter((message) => message.text.length > 0);
}

// Sanitizes selected favorite movies into concise prompt labels.
function sanitizeFavoriteMovies(favoriteMovies) {
  if (!Array.isArray(favoriteMovies)) {
    return [];
  }

  return favoriteMovies
    .slice(0, 4)
    .map((movie) => {
      if (typeof movie === "string") {
        return movie.trim().slice(0, 120);
      }

      const title = String(movie?.title || "").trim().slice(0, 100);
      const year = String(movie?.year || "").trim().slice(0, 4);

      if (!title) {
        return "";
      }

      return year ? `${title} (${year})` : title;
    })
    .filter(Boolean);
}

// Sanitizes selected favorite movies into structured data for recommendation logic.
function sanitizeFavoriteMovieDetails(favoriteMovies) {
  if (!Array.isArray(favoriteMovies)) {
    return [];
  }

  return favoriteMovies
    .slice(0, 4)
    .map((movie) => {
      if (typeof movie === "string") {
        const title = movie.trim().slice(0, 120);
        return title ? { id: "", title, year: "" } : null;
      }

      const id = Number(movie?.id);
      const title = String(movie?.title || "").trim().slice(0, 120);
      const yearMatch = String(movie?.year || "").match(/\d{4}/);
      const year = yearMatch ? yearMatch[0] : "";

      if (!title) {
        return null;
      }

      return {
        id: Number.isFinite(id) && id > 0 ? id : "",
        title,
        year
      };
    })
    .filter(Boolean);
}

// Reads and parses a JSON request body with a small size guard.
function readJsonBody(req) {
  return new Promise((resolve, reject) => {
    let raw = "";

    req.on("data", (chunk) => {
      raw += chunk;
      if (raw.length > 100_000) {
        req.destroy();
        reject(new Error("Request body is too large."));
      }
    });

    req.on("end", () => {
      try {
        resolve(raw ? JSON.parse(raw) : {});
      } catch (error) {
        reject(error);
      }
    });

    req.on("error", reject);
  });
}

// Sends a JSON response with the project's standard content type.
function sendJson(res, status, payload) {
  res.writeHead(status, { "Content-Type": "application/json; charset=utf-8" });
  res.end(JSON.stringify(payload));
}

// Sends a plain-text response for simple static-file errors.
function sendText(res, status, text) {
  res.writeHead(status, { "Content-Type": "text/plain; charset=utf-8" });
  res.end(text);
}

// Chooses TMDB bearer-token auth when available and otherwise appends the API key query parameter.
function getTmdbRequestOptions(tmdbUrl) {
  const headers = {};

  if (TMDB_ACCESS_TOKEN) {
    headers.Authorization = `Bearer ${TMDB_ACCESS_TOKEN}`;
  } else if (TMDB_API_KEY) {
    tmdbUrl.searchParams.set("api_key", TMDB_API_KEY);
  }

  return { headers };
}

// Treats blank or placeholder environment values as missing secrets.
function cleanSecret(value) {
  const secret = String(value || "").trim();

  if (
    !secret ||
    /^your_.+_here$/i.test(secret) ||
    /^replace_with_/i.test(secret) ||
    /^optional_/i.test(secret)
  ) {
    return "";
  }

  return secret;
}

// Loads simple KEY=value pairs from the local .env file without overriding existing environment variables.
function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) {
    return;
  }

  const lines = fs.readFileSync(filePath, "utf8").split(/\r?\n/);

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) {
      continue;
    }

    const separatorIndex = trimmed.indexOf("=");
    if (separatorIndex === -1) {
      continue;
    }

    const key = trimmed.slice(0, separatorIndex).trim();
    let value = trimmed.slice(separatorIndex + 1).trim();

    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    if (key && process.env[key] === undefined) {
      process.env[key] = value;
    }
  }
}
