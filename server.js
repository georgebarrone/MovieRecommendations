const http = require("http");
const fs = require("fs");
const path = require("path");

const ROOT = __dirname;
const PUBLIC_DIR = path.join(ROOT, "public");

loadEnvFile(path.join(ROOT, ".env"));

const PORT = Number(process.env.PORT || 3000);
const GEMINI_API_KEY = cleanSecret(
  process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY
);
const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-2.5-flash";
const TMDB_API_KEY = cleanSecret(process.env.TMDB_API_KEY);
const TMDB_ACCESS_TOKEN = cleanSecret(
  process.env.TMDB_ACCESS_TOKEN || process.env.TMDB_READ_ACCESS_TOKEN
);

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

const TMDB_IMAGE_BASE = "https://image.tmdb.org/t/p/w342";

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

const MIME_TYPES = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".ttf": "font/ttf",
  ".otf": "font/otf",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon"
};

const movieSystemPrompt = [
  "You are Movie Match, a friendly movie recommendation assistant.",
  "Help the user find movies based on taste, mood, genre, era, language, runtime, favorite films, or people they like.",
  "Recommend 1 or 2 movies at a time unless the user explicitly asks for more.",
  "For each recommendation, include the title, year, genre or style, why it fits, and a brief content note when relevant.",
  "Keep replies concise and complete; prefer short finished sentences over long lists.",
  "If the user is vague and has not provided favorite picks, ask one concise follow-up question before recommending.",
  "Do not claim exact streaming availability unless the user provides it; suggest they check their preferred services."
].join(" ");

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, `http://${req.headers.host}`);

    if (req.method === "POST" && url.pathname === "/api/chat") {
      await handleChat(req, res);
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
});

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

  if (!messages.length) {
    sendJson(res, 400, { error: "Send at least one message." });
    return;
  }

  const systemPrompt = favoriteMovies.length
    ? [
        movieSystemPrompt,
        `The user selected these favorite movies: ${favoriteMovies.join(
          ", "
        )}. Use them as taste signals when they ask for recommendations.`
      ].join(" ")
    : movieSystemPrompt;

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

  const reply =
    data.candidates?.[0]?.content?.parts
      ?.map((part) => part.text || "")
      .join("")
      .trim() || "I could not generate a recommendation. Try again?";

  sendJson(res, 200, { reply });
}

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

async function discoverPosterWallMovies() {
  const firstPage = await fetchTmdbJson(createDiscoverUrl({ page: 1 }));
  const pageCount = Math.min(Number(firstPage.total_pages || 1), 20);
  const pages = getRandomPages(pageCount, 4, [1]);
  const pageResults = [firstPage];

  for (const page of pages) {
    pageResults.push(await fetchTmdbJson(createDiscoverUrl({ page })));
  }

  return uniqueMovies(
    pageResults.flatMap((page) => (Array.isArray(page.results) ? page.results : []))
  )
    .filter(isUsableEnglishMovie)
    .sort(() => Math.random() - 0.5)
    .slice(0, 72)
    .map(formatPosterMovie);
}

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

function normalizeSearchTerm(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

function containsNormalizedPhrase(value, phrase) {
  return ` ${value} `.includes(` ${phrase} `);
}

function isUsableEnglishMovie(movie) {
  return Boolean(
    movie?.id &&
      movie.poster_path &&
      movie.original_language === "en" &&
      !movie.adult &&
      (movie.title || movie.original_title)
  );
}

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

function formatPosterMovie(movie) {
  return {
    id: movie.id,
    title: movie.title || movie.original_title || "Movie poster",
    posterUrl: `${TMDB_IMAGE_BASE}${movie.poster_path}`
  };
}

function formatRelatedMovie(movie) {
  return {
    id: movie.id,
    title: movie.title || movie.original_title || "Untitled",
    year: movie.release_date ? movie.release_date.slice(0, 4) : "",
    overview: movie.overview || "",
    posterUrl: `${TMDB_IMAGE_BASE}${movie.poster_path}`,
    tmdbUrl: `https://www.themoviedb.org/movie/${movie.id}`,
    voteAverage: Number(movie.vote_average || 0)
  };
}

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

function sendJson(res, status, payload) {
  res.writeHead(status, { "Content-Type": "application/json; charset=utf-8" });
  res.end(JSON.stringify(payload));
}

function sendText(res, status, text) {
  res.writeHead(status, { "Content-Type": "text/plain; charset=utf-8" });
  res.end(text);
}

function getTmdbRequestOptions(tmdbUrl) {
  const headers = {};

  if (TMDB_ACCESS_TOKEN) {
    headers.Authorization = `Bearer ${TMDB_ACCESS_TOKEN}`;
  } else if (TMDB_API_KEY) {
    tmdbUrl.searchParams.set("api_key", TMDB_API_KEY);
  }

  return { headers };
}

function cleanSecret(value) {
  const secret = String(value || "").trim();

  if (!secret || /^your_.+_here$/i.test(secret)) {
    return "";
  }

  return secret;
}

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
