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
  "If the user is vague, ask one concise follow-up question before recommending.",
  "When recommending, give 3 options with title, year, genre, why it fits, and a brief content note when relevant.",
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
          maxOutputTokens: 700
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

async function handlePosterWall(res) {
  if (!TMDB_API_KEY && !TMDB_ACCESS_TOKEN) {
    sendJson(res, 200, { posters: FALLBACK_POSTER_WALL });
    return;
  }

  const tmdbUrl = new URL("https://api.themoviedb.org/3/discover/movie");
  tmdbUrl.searchParams.set("include_adult", "false");
  tmdbUrl.searchParams.set("language", "en-US");
  tmdbUrl.searchParams.set("page", "1");
  tmdbUrl.searchParams.set("sort_by", "popularity.desc");
  tmdbUrl.searchParams.set("vote_count.gte", "400");
  tmdbUrl.searchParams.set("vote_average.gte", "6.5");
  tmdbUrl.searchParams.set("certification_country", "US");
  tmdbUrl.searchParams.set("certification.lte", "R");
  tmdbUrl.searchParams.set("with_genres", "18|53|9648|80|878|10749");
  tmdbUrl.searchParams.set("without_genres", "16|10751");

  let tmdbResponse;

  try {
    tmdbResponse = await fetch(tmdbUrl, getTmdbRequestOptions(tmdbUrl));
  } catch (error) {
    sendJson(res, 200, { posters: FALLBACK_POSTER_WALL });
    return;
  }

  const data = await tmdbResponse.json().catch(() => ({}));

  if (!tmdbResponse.ok) {
    sendJson(res, 200, { posters: FALLBACK_POSTER_WALL });
    return;
  }

  const posters = Array.isArray(data.results)
    ? data.results
        .filter((movie) => movie.poster_path)
        .slice(0, 24)
        .map((movie) => ({
          id: movie.id,
          title: movie.title || movie.original_title || "Movie poster",
          posterUrl: `https://image.tmdb.org/t/p/w342${movie.poster_path}`
        }))
    : [];

  sendJson(res, 200, {
    posters: posters.length ? posters : FALLBACK_POSTER_WALL
  });
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
