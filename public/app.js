const form = document.querySelector("#chat-form");
const input = document.querySelector("#message-input");
const messagesEl = document.querySelector("#messages");
const statusPill = document.querySelector("#status-pill");
const movieSearchModal = document.querySelector("#movie-search-modal");
const movieSearchClose = document.querySelector("#movie-search-close");
const movieSearchTitle = document.querySelector("#movie-search-title");
const movieSearchInput = document.querySelector("#movie-search-input");
const movieResultsEl = document.querySelector("#movie-results");
const movieSearchStatus = document.querySelector("#movie-search-status");
const posterGrid = document.querySelector("#poster-grid");
const posterWall = document.querySelector("#poster-wall");
const pickSearchButton = document.querySelector("#pick-search-button");
const genreActorForm = document.querySelector("#genre-actor-form");
const genreActorInput = document.querySelector("#genre-actor-input");
const relatedResultsModal = document.querySelector("#related-results-modal");
const relatedResultsClose = document.querySelector("#related-results-close");
const relatedResultsTitle = document.querySelector("#related-results-title");
const relatedResultsStatus = document.querySelector("#related-results-status");
const relatedResultsGrid = document.querySelector("#related-results-grid");

const fallbackWallPosters = [
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

const conversation = [];
const selectedMovies = Array(4).fill(null);
const POSTER_WALL_TARGET_COLUMN_WIDTH = 74;
const POSTER_WALL_MIN_COLUMNS = 7;
const POSTER_WALL_MAX_COLUMNS = 48;
const POSTER_WALL_MIN_ROWS = 10;
const POSTER_WALL_MAX_ROWS = 22;
const POSTER_WALL_EXTRA_ROWS = 3;
const POSTER_WALL_BASE_SPEED = 8.5;
const POSTER_WALL_SPEED_VARIANCE = 4;
const POSTER_WALL_MAX_FRAME_DELTA = 0.05;

let activeSlotIndex = -1;
let searchResults = [];
let highlightedResult = -1;
let searchTimer = null;
let searchController = null;
let isChatLoading = false;
let isRelatedLoading = false;
let currentPosterWallPosters = [];
let posterWallResizeFrame = 0;
let posterWallLayoutKey = "";
let posterWallColumns = [];
let posterWallAnimationFrame = 0;
let posterWallLastTimestamp = 0;

form.addEventListener("submit", async (event) => {
  event.preventDefault();

  const text = input.value.trim();
  if (!text) {
    return;
  }

  input.value = "";
  sendChatMessage(text);
});

input.addEventListener("keydown", (event) => {
  if (event.key === "Enter" && !event.shiftKey) {
    event.preventDefault();
    form.requestSubmit();
  }
});

posterGrid.addEventListener("click", (event) => {
  const addButton = event.target.closest("[data-add-movie-slot]");
  const removeButton = event.target.closest("[data-remove-movie-slot]");

  if (addButton) {
    openMoviePicker(Number(addButton.dataset.addMovieSlot));
    return;
  }

  if (removeButton) {
    selectedMovies[Number(removeButton.dataset.removeMovieSlot)] = null;
    renderPosterSlots();
  }
});

movieSearchInput.addEventListener("input", () => {
  const query = movieSearchInput.value.trim();

  window.clearTimeout(searchTimer);

  if (query.length < 2) {
    setMovieStatus("");
    closeResults();
    return;
  }

  searchTimer = window.setTimeout(() => {
    searchMovies(query);
  }, 220);
});

movieSearchInput.addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    event.preventDefault();
    event.stopPropagation();
    if (movieResultsEl.hidden) {
      closeMoviePicker();
    } else {
      closeResults();
    }
    return;
  }

  if (movieResultsEl.hidden || searchResults.length === 0) {
    return;
  }

  if (event.key === "ArrowDown") {
    event.preventDefault();
    highlightedResult = (highlightedResult + 1) % searchResults.length;
    renderResults();
  }

  if (event.key === "ArrowUp") {
    event.preventDefault();
    highlightedResult =
      (highlightedResult - 1 + searchResults.length) % searchResults.length;
    renderResults();
  }

  if (event.key === "Enter" && highlightedResult >= 0) {
    event.preventDefault();
    addSelectedMovie(searchResults[highlightedResult]);
  }
});

movieSearchClose.addEventListener("click", closeMoviePicker);
relatedResultsClose.addEventListener("click", closeRelatedResults);

movieSearchModal.addEventListener("click", (event) => {
  if (event.target === movieSearchModal) {
    closeMoviePicker();
  }
});

relatedResultsModal.addEventListener("click", (event) => {
  if (event.target === relatedResultsModal) {
    closeRelatedResults();
  }
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && !movieSearchModal.hidden) {
    closeMoviePicker();
    return;
  }

  if (event.key === "Escape" && !relatedResultsModal.hidden) {
    closeRelatedResults();
  }
});

document.addEventListener("click", (event) => {
  if (!movieSearchModal.hidden && !event.target.closest(".movie-search-popover")) {
    closeResults();
  }
});

pickSearchButton.addEventListener("click", () => {
  const picks = selectedMovies.filter(Boolean);

  if (!picks.length) {
    addMessage("model", "Add one or more movie picks first, then I can match the vibe.");
    input.focus();
    return;
  }

  const pickList = picks.map(formatMovieTitle).join(", ");
  sendChatMessage(
    `Based on my picks (${pickList}), recommend 1 or 2 movies I should watch next.`
  );
});

genreActorForm.addEventListener("submit", (event) => {
  event.preventDefault();

  const text = genreActorInput.value.trim();

  if (!text) {
    return;
  }

  genreActorInput.value = "";
  searchRelatedMovies(text);
});

renderPosterSlots();
loadPosterWall();

if (posterWall) {
  window.addEventListener("resize", schedulePosterWallRender);

  if (window.visualViewport) {
    window.visualViewport.addEventListener("resize", schedulePosterWallRender);
  }
}

async function sendChatMessage(text) {
  if (isChatLoading) {
    return;
  }

  addMessage("user", text);
  conversation.push({ role: "user", text });
  setLoading(true);

  try {
    const response = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        messages: conversation,
        favoriteMovies: getFavoriteMoviePayload()
      })
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || "The movie assistant had trouble replying.");
    }

    addMessage("model", data.reply);
    conversation.push({ role: "model", text: data.reply });
  } catch (error) {
    addMessage("model", `Sorry, I hit an error: ${error.message}`);
  } finally {
    setLoading(false);
    input.focus();
  }
}

async function searchRelatedMovies(query) {
  if (isRelatedLoading) {
    return;
  }

  openRelatedResults();
  setRelatedLoading(true);
  relatedResultsTitle.textContent = "Searching TMDB";
  relatedResultsStatus.textContent = "Finding three English-language matches...";
  relatedResultsGrid.replaceChildren();

  try {
    const response = await fetch(
      `/api/movies/related?query=${encodeURIComponent(query)}`
    );
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || "TMDB search failed.");
    }

    renderRelatedResults(data);
  } catch (error) {
    relatedResultsTitle.textContent = "No matches";
    relatedResultsStatus.textContent = error.message;
    relatedResultsGrid.replaceChildren();
  } finally {
    setRelatedLoading(false);
  }
}

async function searchMovies(query) {
  if (activeSlotIndex === -1 || selectedMovies[activeSlotIndex]) {
    setMovieStatus("Pick an empty poster slot first.");
    closeResults();
    return;
  }

  if (searchController) {
    searchController.abort();
  }

  searchController = new AbortController();
  setMovieStatus("Searching...");

  try {
    const response = await fetch(
      `/api/movies/search?query=${encodeURIComponent(query)}`,
      { signal: searchController.signal }
    );
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || "TMDB search failed.");
    }

    searchResults = data.results || [];
    highlightedResult = searchResults.length ? 0 : -1;
    setMovieStatus(searchResults.length ? "" : "No matches found.");
    renderResults();
  } catch (error) {
    if (error.name === "AbortError") {
      return;
    }

    searchResults = [];
    highlightedResult = -1;
    closeResults();
    setMovieStatus(error.message);
  }
}

function renderResults() {
  movieResultsEl.replaceChildren();

  if (!searchResults.length) {
    closeResults();
    return;
  }

  searchResults.forEach((movie, index) => {
    const item = document.createElement("li");
    item.setAttribute("role", "option");
    item.id = `movie-result-${movie.id}`;
    item.setAttribute("aria-selected", String(index === highlightedResult));

    const button = document.createElement("button");
    button.type = "button";
    button.className = "movie-result";
    button.addEventListener("click", () => addSelectedMovie(movie));

    const poster = document.createElement("div");
    poster.className = "result-poster";

    if (movie.posterUrl) {
      const image = document.createElement("img");
      image.src = movie.posterUrl;
      image.alt = "";
      image.loading = "lazy";
      poster.append(image);
    } else {
      poster.textContent = "No art";
    }

    const details = document.createElement("span");
    details.className = "result-copy";

    const title = document.createElement("strong");
    title.textContent = movie.year ? `${movie.title} (${movie.year})` : movie.title;

    const overview = document.createElement("span");
    overview.textContent = movie.overview || "Movie result from TMDB";

    details.append(title, overview);
    button.append(poster, details);
    item.append(button);
    movieResultsEl.append(item);
  });

  movieResultsEl.hidden = false;
  movieSearchInput.setAttribute("aria-expanded", "true");
  movieSearchInput.setAttribute(
    "aria-activedescendant",
    highlightedResult >= 0 ? `movie-result-${searchResults[highlightedResult].id}` : ""
  );
}

function addSelectedMovie(movie) {
  if (selectedMovies.some((selected) => selected?.id === movie.id)) {
    setMovieStatus("That title is already on the board.");
    closeResults();
    return;
  }

  if (activeSlotIndex === -1 || selectedMovies[activeSlotIndex]) {
    const firstOpenSlot = selectedMovies.findIndex((selected) => !selected);
    activeSlotIndex = firstOpenSlot;
  }

  if (activeSlotIndex === -1) {
    setMovieStatus("Remove a poster to add another title.");
    closeResults();
    return;
  }

  selectedMovies[activeSlotIndex] = movie;
  closeMoviePicker();
  renderPosterSlots();
}

function renderPosterSlots() {
  posterGrid.replaceChildren();

  selectedMovies.forEach((movie, index) => {
    const slot = document.createElement("article");
    slot.className = `poster-slot${movie ? " poster-filled" : ""}`;

    if (!movie) {
      const addButton = document.createElement("button");
      addButton.type = "button";
      addButton.className = "poster-add-button";
      addButton.dataset.addMovieSlot = index;
      addButton.setAttribute("aria-label", `Pick movie for poster slot ${index + 1}`);

      const plus = document.createElement("span");
      plus.className = "plus-mark";
      plus.textContent = "+";

      const label = document.createElement("span");
      label.className = "sr-only";
      label.textContent = "Pick movie";

      addButton.append(plus, label);
      slot.append(addButton);
      posterGrid.append(slot);
      return;
    }

    const frame = document.createElement("div");
    frame.className = "poster-frame";

    if (movie.posterUrl) {
      const image = document.createElement("img");
      image.src = movie.posterUrl;
      image.alt = `${movie.title} poster`;
      image.loading = "lazy";
      frame.append(image);
    } else {
      const missing = document.createElement("div");
      missing.className = "poster-missing";
      missing.textContent = movie.title;
      frame.append(missing);
    }

    const removeButton = document.createElement("button");
    removeButton.type = "button";
    removeButton.className = "remove-movie";
    removeButton.dataset.removeMovieSlot = index;
    removeButton.setAttribute("aria-label", `Remove ${movie.title}`);
    removeButton.textContent = "x";
    frame.append(removeButton);

    const title = document.createElement("h3");
    title.textContent = movie.title;

    const meta = document.createElement("p");
    meta.textContent = movie.year || "Year unknown";

    slot.append(frame, title, meta);
    posterGrid.append(slot);
  });
}

function openMoviePicker(slotIndex) {
  activeSlotIndex = slotIndex;
  movieSearchTitle.textContent = `Pick a movie for slot ${slotIndex + 1}`;
  movieSearchInput.value = "";
  setMovieStatus("");
  closeResults();
  movieSearchModal.hidden = false;
  document.body.classList.add("search-open");
  window.requestAnimationFrame(() => movieSearchInput.focus());
}

function closeMoviePicker() {
  if (searchController) {
    searchController.abort();
  }

  movieSearchModal.hidden = true;
  document.body.classList.remove("search-open");
  movieSearchInput.value = "";
  setMovieStatus("");
  closeResults();
  activeSlotIndex = -1;
}

async function loadPosterWall() {
  if (!posterWall) {
    return;
  }

  try {
    const response = await fetch("/api/movies/poster-wall");
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || "Could not load poster wall.");
    }

    renderPosterWall(data.posters || fallbackWallPosters);
  } catch (error) {
    renderPosterWall(fallbackWallPosters);
  }
}

function renderPosterWall(posters) {
  const usablePosters = getUniquePosterWallPosters(posters);

  if (!usablePosters.length) {
    return;
  }

  currentPosterWallPosters = usablePosters;

  const { columnCount, rowsPerColumn, posterStride } = getPosterWallLayout();
  const layoutKey = `${columnCount}:${rowsPerColumn}:${Math.round(posterStride)}`;

  if (layoutKey === posterWallLayoutKey && posterWall.children.length) {
    return;
  }

  posterWallLayoutKey = layoutKey;
  posterWall.style.setProperty("--poster-wall-columns", columnCount);
  stopPosterWallAnimation();
  posterWall.replaceChildren();

  const wallDeck = shuffleItems(usablePosters);
  const tileCount = rowsPerColumn + POSTER_WALL_EXTRA_ROWS;

  for (let columnIndex = 0; columnIndex < columnCount; columnIndex += 1) {
    const column = document.createElement("div");
    column.className = "poster-wall-column";

    const track = document.createElement("div");
    track.className = "poster-wall-track";
    track.dataset.direction = columnIndex % 2 === 0 ? "up" : "down";

    const state = {
      track,
      deck: createColumnPosterDeck(wallDeck, columnIndex),
      cursor: 0,
      direction: columnIndex % 2 === 0 ? -1 : 1,
      offset: -Math.random() * posterStride,
      stride: posterStride,
      speed:
        POSTER_WALL_BASE_SPEED +
        (columnIndex % 5) * 0.65 +
        Math.random() * POSTER_WALL_SPEED_VARIANCE,
      recentPosterKeys: [],
      recentPosterLimit: Math.min(
        usablePosters.length,
        Math.max(tileCount + 4, 18)
      ),
      tileSerial: columnIndex * 1000
    };

    for (let tileIndex = 0; tileIndex < tileCount; tileIndex += 1) {
      track.append(
        createPosterWallTile(
          getNextPosterForColumn(state),
          state.tileSerial
        )
      );
      state.tileSerial += 1;
    }

    track.style.setProperty("--wall-offset", `${state.offset.toFixed(2)}px`);

    column.append(track);
    posterWall.append(column);
    posterWallColumns.push(state);
  }

  startPosterWallAnimation();
}

function schedulePosterWallRender() {
  if (!currentPosterWallPosters.length || posterWallResizeFrame) {
    return;
  }

  posterWallResizeFrame = window.requestAnimationFrame(() => {
    posterWallResizeFrame = 0;
    renderPosterWall(currentPosterWallPosters);
  });
}

function getPosterWallLayout() {
  const wallWidth = Math.max(posterWall.offsetWidth || 0, window.innerWidth || 0);
  const wallHeight = Math.max(posterWall.offsetHeight || 0, window.innerHeight || 0);
  const columnCount = clampNumber(
    Math.ceil(wallWidth / POSTER_WALL_TARGET_COLUMN_WIDTH),
    POSTER_WALL_MIN_COLUMNS,
    POSTER_WALL_MAX_COLUMNS
  );
  const gap = Number.parseFloat(window.getComputedStyle(posterWall).columnGap) || 8;
  const columnWidth = Math.max(
    38,
    (wallWidth - gap * (columnCount - 1)) / columnCount
  );
  const posterStride = columnWidth * 1.5 + gap;
  const rowsPerColumn = clampNumber(
    Math.ceil((wallHeight + posterStride) / posterStride),
    POSTER_WALL_MIN_ROWS,
    POSTER_WALL_MAX_ROWS
  );

  return { columnCount, rowsPerColumn, posterStride };
}

function clampNumber(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function startPosterWallAnimation() {
  if (posterWallAnimationFrame || !posterWallColumns.length) {
    return;
  }

  posterWallLastTimestamp = performance.now();
  posterWallAnimationFrame = window.requestAnimationFrame(stepPosterWall);
}

function stopPosterWallAnimation() {
  if (posterWallAnimationFrame) {
    window.cancelAnimationFrame(posterWallAnimationFrame);
  }

  posterWallAnimationFrame = 0;
  posterWallLastTimestamp = 0;
  posterWallColumns = [];
}

function stepPosterWall(timestamp) {
  const elapsedSeconds = Math.min(
    (timestamp - posterWallLastTimestamp) / 1000,
    POSTER_WALL_MAX_FRAME_DELTA
  );

  posterWallLastTimestamp = timestamp;

  posterWallColumns.forEach((state) => {
    if (!state.stride) {
      return;
    }

    state.offset += state.direction * state.speed * elapsedSeconds;

    if (state.direction < 0) {
      while (state.offset <= -state.stride) {
        recyclePosterWallTile(state);
        state.offset += state.stride;
      }
    } else {
      while (state.offset >= 0) {
        recyclePosterWallTile(state);
        state.offset -= state.stride;
      }
    }

    state.track.style.setProperty("--wall-offset", `${state.offset.toFixed(2)}px`);
  });

  posterWallAnimationFrame = window.requestAnimationFrame(stepPosterWall);
}

function recyclePosterWallTile(state) {
  const tile =
    state.direction < 0
      ? state.track.firstElementChild
      : state.track.lastElementChild;

  if (!tile) {
    return;
  }

  updatePosterWallTile(tile, getNextPosterForColumn(state), state.tileSerial);
  state.tileSerial += 1;

  if (state.direction < 0) {
    state.track.append(tile);
  } else {
    state.track.prepend(tile);
  }
}

function createColumnPosterDeck(posters, columnIndex) {
  if (posters.length < 2) {
    return [...posters];
  }

  const step = getCoprimeStep(posters.length, 5 + columnIndex * 6);
  const offset = (columnIndex * 17) % posters.length;

  return posters.map((_, index) => posters[(offset + index * step) % posters.length]);
}

function getCoprimeStep(length, seed) {
  let step = seed % length || 1;

  while (getGreatestCommonDivisor(step, length) !== 1) {
    step = (step % length) + 1;
  }

  return step;
}

function getGreatestCommonDivisor(firstValue, secondValue) {
  let first = firstValue;
  let second = secondValue;

  while (second) {
    const next = first % second;
    first = second;
    second = next;
  }

  return first;
}

function getNextPosterForColumn(state) {
  if (!state.deck.length) {
    return null;
  }

  let selectedPoster = state.deck[state.cursor % state.deck.length];

  for (let attempts = 0; attempts < state.deck.length; attempts += 1) {
    const poster = state.deck[state.cursor % state.deck.length];
    state.cursor += 1;

    if (!state.recentPosterKeys.includes(getPosterKey(poster))) {
      selectedPoster = poster;
      break;
    }
  }

  rememberPosterForColumn(state, selectedPoster);
  return selectedPoster;
}

function rememberPosterForColumn(state, poster) {
  const key = getPosterKey(poster);

  if (!key) {
    return;
  }

  state.recentPosterKeys.push(key);

  while (state.recentPosterKeys.length > state.recentPosterLimit) {
    state.recentPosterKeys.shift();
  }
}

function getUniquePosterWallPosters(posters) {
  const seenPosters = new Set();
  const uniquePosters = [];

  (Array.isArray(posters) ? posters : []).forEach((poster) => {
    if (!poster?.posterUrl) {
      return;
    }

    const key = getPosterKey(poster);

    if (seenPosters.has(key)) {
      return;
    }

    seenPosters.add(key);
    uniquePosters.push(poster);
  });

  return uniquePosters;
}

function getPosterKey(poster) {
  if (!poster) {
    return "";
  }

  return String(poster.id || poster.posterUrl || poster.title || "");
}

function shuffleItems(items) {
  const shuffled = [...items];

  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [shuffled[index], shuffled[swapIndex]] = [shuffled[swapIndex], shuffled[index]];
  }

  return shuffled;
}

function createPosterWallTile(poster, index) {
  const tile = document.createElement("div");
  tile.className = "poster-wall-tile";

  const image = document.createElement("img");
  image.alt = "";
  image.decoding = "async";
  image.loading = "eager";
  image.fetchPriority = "low";
  image.addEventListener("load", () => {
    image.hidden = false;
  });
  image.addEventListener("error", () => {
    image.hidden = true;
  });

  tile.append(image);
  updatePosterWallTile(tile, poster, index);
  return tile;
}

function updatePosterWallTile(tile, poster, index) {
  tile.style.setProperty("--tilt", `${((index % 5) - 2) * 0.55}deg`);
  tile.dataset.posterKey = getPosterKey(poster);

  const image = tile.querySelector("img");

  if (!image || !poster?.posterUrl) {
    return;
  }

  if (image.src !== poster.posterUrl) {
    image.src = poster.posterUrl;
  }
}

function renderRelatedResults(data) {
  const movies = Array.isArray(data.results) ? data.results : [];
  const matchName = data.matchName || data.query || "that search";

  relatedResultsTitle.textContent = `Matches for ${matchName}`;
  relatedResultsGrid.replaceChildren();

  if (!movies.length) {
    relatedResultsStatus.textContent = "No English-language movie matches found.";
    return;
  }

  relatedResultsStatus.textContent = data.matchType === "actor"
    ? "Actor match"
    : "Genre match";

  movies.forEach((movie) => {
    const card = document.createElement("article");
    card.className = "related-movie-card";

    const poster = document.createElement("div");
    poster.className = "related-movie-poster";

    if (movie.posterUrl) {
      const image = document.createElement("img");
      image.src = movie.posterUrl;
      image.alt = `${movie.title} poster`;
      image.loading = "lazy";
      poster.append(image);
    } else {
      poster.textContent = "No art";
    }

    const copy = document.createElement("div");
    copy.className = "related-movie-copy";

    const title = document.createElement("h3");
    title.textContent = movie.year ? `${movie.title} (${movie.year})` : movie.title;

    const overview = document.createElement("p");
    overview.textContent = movie.overview || "No synopsis available.";

    copy.append(title, overview);
    card.append(poster, copy);
    relatedResultsGrid.append(card);
  });
}

function openRelatedResults() {
  relatedResultsModal.hidden = false;
  document.body.classList.add("search-open");
}

function closeRelatedResults() {
  relatedResultsModal.hidden = true;
  relatedResultsGrid.replaceChildren();
  relatedResultsStatus.textContent = "";
  document.body.classList.remove("search-open");
  genreActorInput.focus();
}

function closeResults() {
  movieResultsEl.hidden = true;
  movieResultsEl.replaceChildren();
  movieSearchInput.setAttribute("aria-expanded", "false");
  movieSearchInput.removeAttribute("aria-activedescendant");
  searchResults = [];
  highlightedResult = -1;
}

function setMovieStatus(text) {
  movieSearchStatus.textContent = text;
}

function getFavoriteMoviePayload() {
  return selectedMovies.filter(Boolean).map((movie) => ({
    id: movie.id,
    title: movie.title,
    year: movie.year
  }));
}

function formatMovieTitle(movie) {
  return movie.year ? `${movie.title} (${movie.year})` : movie.title;
}

function addMessage(role, text) {
  const message = document.createElement("article");
  message.className = `message message-${role === "user" ? "user" : "bot"}`;

  const avatar = document.createElement("div");
  avatar.className = "avatar";
  avatar.textContent = role === "user" ? "Y" : "M";

  const bubble = document.createElement("div");
  bubble.className = "bubble";
  bubble.textContent = text;

  message.append(avatar, bubble);
  messagesEl.append(message);
  messagesEl.scrollTop = messagesEl.scrollHeight;
}

function setLoading(isLoading) {
  isChatLoading = isLoading;
  input.disabled = isLoading;
  form.querySelector("button").disabled = isLoading;
  pickSearchButton.disabled = isLoading;
  statusPill.textContent = isLoading ? "Thinking" : "Ready";
}

function setRelatedLoading(isLoading) {
  isRelatedLoading = isLoading;
  genreActorInput.disabled = isLoading;
  genreActorForm.querySelector("button").disabled = isLoading;
}
