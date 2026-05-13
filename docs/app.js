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

const demoMovies = [
  {
    id: 603,
    title: "The Matrix",
    year: "1999",
    posterUrl: "https://image.tmdb.org/t/p/w342/f89U3ADr1oiB1s9GkdPOEpXUk5H.jpg",
    overview: "A hacker discovers that reality is a simulation and joins a rebellion against its controllers.",
    keywords: ["sci-fi", "action", "cyberpunk", "keanu reeves"]
  },
  {
    id: 27205,
    title: "Inception",
    year: "2010",
    posterUrl: "https://image.tmdb.org/t/p/w342/oYuLEt3zVCKq57qu2F8dT7NIa6f.jpg",
    overview: "A thief who steals secrets through dreams takes one last job that bends time and memory.",
    keywords: ["sci-fi", "thriller", "mind-bending"]
  },
  {
    id: 157336,
    title: "Interstellar",
    year: "2014",
    posterUrl: "https://image.tmdb.org/t/p/w342/gEU2QniE6E77NI6lCU6MxlNBvIx.jpg",
    overview: "Explorers travel through a wormhole to find humanity a new home.",
    keywords: ["sci-fi", "space", "christopher nolan"]
  },
  {
    id: 329865,
    title: "Arrival",
    year: "2016",
    posterUrl: "https://image.tmdb.org/t/p/w342/x2FJsf1ElAgr63Y3PNPtJrcmpoe.jpg",
    overview: "A linguist works to understand alien visitors before panic turns into war.",
    keywords: ["sci-fi", "thoughtful", "amy adams"]
  },
  {
    id: 496243,
    title: "Parasite",
    year: "2019",
    posterUrl: "https://image.tmdb.org/t/p/w342/7IiTTgloJzvGI1TAYymCfbfl3vT.jpg",
    overview: "A struggling family infiltrates a wealthy household with sharp, escalating consequences.",
    keywords: ["thriller", "dark comedy", "mystery"]
  },
  {
    id: 546554,
    title: "Knives Out",
    year: "2019",
    posterUrl: "https://image.tmdb.org/t/p/w342/pThyQovXQrw2m0s9x82twj48Jq4.jpg",
    overview: "A detective investigates a family full of motives after a famous novelist dies.",
    keywords: ["mystery", "comedy", "ana de armas", "whodunit"]
  },
  {
    id: 313369,
    title: "La La Land",
    year: "2016",
    posterUrl: "https://image.tmdb.org/t/p/w342/uDO8zWDhfWwoFdKS4fzkUJt0Rf0.jpg",
    overview: "A pianist and an actor fall in love while chasing creative ambition in Los Angeles.",
    keywords: ["romance", "musical", "ryan gosling"]
  },
  {
    id: 120467,
    title: "The Grand Budapest Hotel",
    year: "2014",
    posterUrl: "https://image.tmdb.org/t/p/w342/eWdyYQreja6JGCzqHWXpWHDrrPo.jpg",
    overview: "A concierge and lobby boy tumble through a bright, precise comic caper.",
    keywords: ["comedy", "adventure", "stylized"]
  },
  {
    id: 335984,
    title: "Blade Runner 2049",
    year: "2017",
    posterUrl: "https://image.tmdb.org/t/p/w342/gajva2L0rPYkEWjzgFlBXCAVBE5.jpg",
    overview: "A replicant hunter uncovers a buried secret that could reshape the future.",
    keywords: ["sci-fi", "neo-noir", "ryan gosling", "ana de armas"]
  },
  {
    id: 244786,
    title: "Whiplash",
    year: "2014",
    posterUrl: "https://image.tmdb.org/t/p/w342/7fn624j5lj3xTme2SgiLCeuedmO.jpg",
    overview: "A young drummer enters a punishing mentorship with a ruthless jazz instructor.",
    keywords: ["drama", "music", "intense"]
  }
];

const demoOpeningMessages = [
  {
    role: "user",
    text: "I want something clever and tense, but still fun."
  },
  {
    role: "model",
    text: "Start with Knives Out. It keeps the mystery moving, has a sharp comic edge, and still gives you a satisfying detective-story payoff."
  },
  {
    role: "user",
    text: "What if I want something more thoughtful after that?"
  },
  {
    role: "model",
    text: "Then make it a double feature with Arrival. It has the same puzzle-box pleasure, but trades the jokes for emotion and big sci-fi ideas."
  }
];

const selectedMovies = [findDemoMovie(329865), findDemoMovie(546554), null, null];
const POSTER_WALL_TARGET_COLUMN_WIDTH = 74;
const POSTER_WALL_MIN_COLUMNS = 7;
const POSTER_WALL_MAX_COLUMNS = 48;
const POSTER_WALL_MIN_ROWS = 10;
const POSTER_WALL_MAX_ROWS = 22;

let activeSlotIndex = -1;
let searchResults = [];
let highlightedResult = -1;
let searchTimer = null;
let isChatLoading = false;
let isRelatedLoading = false;
let currentPosterWallPosters = [];
let posterWallResizeFrame = 0;
let posterWallLayoutKey = "";

form.addEventListener("submit", (event) => {
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
  }, 120);
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

statusPill.textContent = "Demo";
renderPosterSlots();
loadDemoConversation();
renderPosterWall(demoMovies);

if (posterWall) {
  window.addEventListener("resize", schedulePosterWallRender);

  if (window.visualViewport) {
    window.visualViewport.addEventListener("resize", schedulePosterWallRender);
  }
}

function sendChatMessage(text) {
  if (isChatLoading) {
    return;
  }

  addMessage("user", text);
  setLoading(true);

  window.setTimeout(() => {
    addMessage("model", getDemoReply(text));
    setLoading(false);
    input.focus();
  }, 360);
}

function getDemoReply(text) {
  const normalizedText = text.toLowerCase();
  const picks = selectedMovies.filter(Boolean);

  if (normalizedText.includes("based on my picks") && picks.length) {
    return `Based on ${picks.map((movie) => movie.title).join(" and ")}, try Blade Runner 2049 for moody sci-fi mystery or Parasite for a tense, twisty story with a dark sense of humor.`;
  }

  if (normalizedText.includes("funny") || normalizedText.includes("comedy")) {
    return "For a lighter recommendation, try The Grand Budapest Hotel. It is fast, stylish, and playful without losing momentum.";
  }

  if (
    normalizedText.includes("sci-fi") ||
    normalizedText.includes("space") ||
    normalizedText.includes("future")
  ) {
    return "Arrival is the thoughtful pick, The Matrix is the high-energy pick, and Blade Runner 2049 is the moodier slow-burn pick.";
  }

  if (normalizedText.includes("mystery") || normalizedText.includes("detective")) {
    return "Knives Out is the crowd-pleaser here. If you want the mystery to feel heavier and stranger, follow it with Parasite.";
  }

  return "For this static demo, I would steer you toward Knives Out if you want fun, Arrival if you want feeling, or Blade Runner 2049 if you want atmosphere.";
}

function loadDemoConversation() {
  demoOpeningMessages.forEach((message) => {
    addMessage(message.role, message.text);
  });
}

function searchRelatedMovies(query) {
  if (isRelatedLoading) {
    return;
  }

  openRelatedResults();
  setRelatedLoading(true);
  relatedResultsTitle.textContent = "Searching demo matches";
  relatedResultsStatus.textContent = "Finding static example results...";
  relatedResultsGrid.replaceChildren();

  window.setTimeout(() => {
    renderRelatedResults(getDemoRelatedResults(query));
    setRelatedLoading(false);
  }, 220);
}

function getDemoRelatedResults(query) {
  const normalizedQuery = query.toLowerCase();

  if (normalizedQuery.includes("ana") || normalizedQuery.includes("armas")) {
    return {
      query,
      matchName: "Ana de Armas",
      matchType: "actor",
      results: [findDemoMovie(546554), findDemoMovie(335984)]
    };
  }

  if (normalizedQuery.includes("ryan") || normalizedQuery.includes("gosling")) {
    return {
      query,
      matchName: "Ryan Gosling",
      matchType: "actor",
      results: [findDemoMovie(313369), findDemoMovie(335984)]
    };
  }

  if (
    normalizedQuery.includes("sci") ||
    normalizedQuery.includes("space") ||
    normalizedQuery.includes("future")
  ) {
    return {
      query,
      matchName: "sci-fi",
      matchType: "genre",
      results: [findDemoMovie(329865), findDemoMovie(603), findDemoMovie(335984)]
    };
  }

  if (normalizedQuery.includes("mystery") || normalizedQuery.includes("whodunit")) {
    return {
      query,
      matchName: "mystery",
      matchType: "genre",
      results: [findDemoMovie(546554), findDemoMovie(496243)]
    };
  }

  return {
    query,
    matchName: query,
    matchType: "genre",
    results: [findDemoMovie(329865), findDemoMovie(546554), findDemoMovie(335984)]
  };
}

function searchMovies(query) {
  if (activeSlotIndex === -1 || selectedMovies[activeSlotIndex]) {
    setMovieStatus("Pick an empty poster slot first.");
    closeResults();
    return;
  }

  const normalizedQuery = query.toLowerCase();

  searchResults = demoMovies
    .filter((movie) => {
      const searchableText = [
        movie.title,
        movie.year,
        movie.overview,
        ...movie.keywords
      ].join(" ").toLowerCase();

      return searchableText.includes(normalizedQuery);
    })
    .slice(0, 6);

  highlightedResult = searchResults.length ? 0 : -1;
  setMovieStatus(
    searchResults.length
      ? "Static demo results"
      : "No static demo matches. Try Arrival, Matrix, mystery, or sci-fi."
  );
  renderResults();
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

    const image = document.createElement("img");
    image.src = movie.posterUrl;
    image.alt = "";
    image.loading = "lazy";
    poster.append(image);

    const details = document.createElement("span");
    details.className = "result-copy";

    const title = document.createElement("strong");
    title.textContent = `${movie.title} (${movie.year})`;

    const overview = document.createElement("span");
    overview.textContent = movie.overview;

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

    const image = document.createElement("img");
    image.src = movie.posterUrl;
    image.alt = `${movie.title} poster`;
    image.loading = "lazy";
    frame.append(image);

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
    meta.textContent = movie.year;

    slot.append(frame, title, meta);
    posterGrid.append(slot);
  });
}

function openMoviePicker(slotIndex) {
  activeSlotIndex = slotIndex;
  movieSearchTitle.textContent = `Pick a movie for slot ${slotIndex + 1}`;
  movieSearchInput.value = "";
  setMovieStatus("Try Arrival, Matrix, Blade Runner, mystery, or sci-fi.");
  closeResults();
  movieSearchModal.hidden = false;
  document.body.classList.add("search-open");
  window.requestAnimationFrame(() => movieSearchInput.focus());
}

function closeMoviePicker() {
  movieSearchModal.hidden = true;
  document.body.classList.remove("search-open");
  movieSearchInput.value = "";
  setMovieStatus("");
  closeResults();
  activeSlotIndex = -1;
}

function renderPosterWall(posters) {
  const usablePosters = (Array.isArray(posters) ? posters : []).filter(
    (poster) => poster.posterUrl
  );

  if (!posterWall || !usablePosters.length) {
    return;
  }

  currentPosterWallPosters = usablePosters;

  const { columnCount, rowsPerColumn } = getPosterWallLayout();
  const layoutKey = `${columnCount}:${rowsPerColumn}`;

  if (layoutKey === posterWallLayoutKey && posterWall.children.length) {
    return;
  }

  posterWallLayoutKey = layoutKey;
  posterWall.style.setProperty("--poster-wall-columns", columnCount);
  posterWall.replaceChildren();

  for (let columnIndex = 0; columnIndex < columnCount; columnIndex += 1) {
    const column = document.createElement("div");
    column.className = "poster-wall-column";

    const track = document.createElement("div");
    track.className = "poster-wall-track";
    track.dataset.direction = columnIndex % 2 === 0 ? "up" : "down";
    track.style.setProperty("--wall-delay", `${columnIndex * -6.5}s`);

    const sequence = createPosterWallSequence(
      usablePosters,
      rowsPerColumn,
      columnIndex * rowsPerColumn
    );
    track.append(sequence, sequence.cloneNode(true));
    track.addEventListener("animationiteration", () => {
      refreshPosterWallTrack(track, usablePosters, rowsPerColumn);
    });

    column.append(track);
    posterWall.append(column);
  }
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

  return { columnCount, rowsPerColumn };
}

function clampNumber(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function createPosterWallSequence(posters, rowsPerColumn, startIndex) {
  const sequence = document.createElement("div");
  sequence.className = "poster-wall-sequence";

  getRandomPosterSet(posters, rowsPerColumn).forEach((poster, index) => {
    sequence.append(createPosterWallTile(poster, startIndex + index));
  });

  return sequence;
}

function refreshPosterWallTrack(track, posters, rowsPerColumn) {
  const sequences = track.querySelectorAll(".poster-wall-sequence");
  const [firstSequence, secondSequence] = sequences;

  if (!firstSequence || !secondSequence) {
    return;
  }

  const replacement = createPosterWallSequence(
    posters,
    rowsPerColumn,
    Math.floor(Math.random() * 1000)
  );

  if (track.dataset.direction === "down") {
    secondSequence.replaceWith(firstSequence.cloneNode(true));
    firstSequence.replaceWith(replacement);
  } else {
    firstSequence.replaceWith(secondSequence.cloneNode(true));
    secondSequence.replaceWith(replacement);
  }
}

function getRandomPosterSet(posters, count) {
  const shuffledPosters = shuffleItems(posters);
  const selectedPosters = [];

  for (let index = 0; index < count; index += 1) {
    selectedPosters.push(shuffledPosters[index % shuffledPosters.length]);
  }

  return selectedPosters;
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
  tile.style.setProperty("--tilt", `${((index % 5) - 2) * 0.55}deg`);

  const image = document.createElement("img");
  image.src = poster.posterUrl;
  image.alt = "";
  image.loading = "lazy";

  tile.append(image);
  return tile;
}

function renderRelatedResults(data) {
  const movies = Array.isArray(data.results) ? data.results.filter(Boolean) : [];
  const matchName = data.matchName || data.query || "that search";

  relatedResultsTitle.textContent = `Matches for ${matchName}`;
  relatedResultsGrid.replaceChildren();

  if (!movies.length) {
    relatedResultsStatus.textContent = "No static demo matches found.";
    return;
  }

  relatedResultsStatus.textContent =
    data.matchType === "actor" ? "Actor match" : "Genre match";

  movies.forEach((movie) => {
    const card = document.createElement("article");
    card.className = "related-movie-card";

    const poster = document.createElement("div");
    poster.className = "related-movie-poster";

    const image = document.createElement("img");
    image.src = movie.posterUrl;
    image.alt = `${movie.title} poster`;
    image.loading = "lazy";
    poster.append(image);

    const copy = document.createElement("div");
    copy.className = "related-movie-copy";

    const title = document.createElement("h3");
    title.textContent = `${movie.title} (${movie.year})`;

    const overview = document.createElement("p");
    overview.textContent = movie.overview;

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

function formatMovieTitle(movie) {
  return `${movie.title} (${movie.year})`;
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
  statusPill.textContent = isLoading ? "Thinking" : "Demo";
}

function setRelatedLoading(isLoading) {
  isRelatedLoading = isLoading;
  genreActorInput.disabled = isLoading;
  genreActorForm.querySelector("button").disabled = isLoading;
}

function findDemoMovie(id) {
  return demoMovies.find((movie) => movie.id === id);
}
