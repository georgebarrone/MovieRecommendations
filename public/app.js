// DOM references are cached once so the interaction code can update the same controls consistently.
const form = document.querySelector("#chat-form");
const input = document.querySelector("#message-input");
const messagesEl = document.querySelector("#messages");
const statusPill = document.querySelector("#status-pill");
const homeView = document.querySelector("#home-view");
const movieSearchModal = document.querySelector("#movie-search-modal");
const movieSearchClose = document.querySelector("#movie-search-close");
const movieSearchTitle = document.querySelector("#movie-search-title");
const movieSearchInput = document.querySelector("#movie-search-input");
const movieResultsEl = document.querySelector("#movie-results");
const movieSearchStatus = document.querySelector("#movie-search-status");
const posterGrid = document.querySelector("#poster-grid");
const posterWall = document.querySelector("#poster-wall");
const pickSearchButton = document.querySelector("#pick-search-button");
const pickResultsButton = document.querySelector("#pick-results-button");
const genreActorForm = document.querySelector("#genre-actor-form");
const genreActorInput = document.querySelector("#genre-actor-input");
const tasteMovieSearchInput = document.querySelector("#taste-movie-search-input");
const tasteMovieResults = document.querySelector("#taste-movie-results");
const tasteTunerSelection = document.querySelector("#taste-tuner-selection");
const tasteTunerPoster = document.querySelector("#taste-tuner-poster");
const tasteTunerMovieTitle = document.querySelector("#taste-tuner-movie-title");
const tasteTunerMovieOverview = document.querySelector("#taste-tuner-movie-overview");
const tasteLikedButton = document.querySelector("#taste-liked-button");
const tasteDislikedButton = document.querySelector("#taste-disliked-button");
const tasteTunerStatus = document.querySelector("#taste-tuner-status");
const relatedResultsModal = document.querySelector("#related-results-modal");
const relatedResultsClose = document.querySelector("#related-results-close");
const relatedResultsTitle = document.querySelector("#related-results-title");
const relatedResultsStatus = document.querySelector("#related-results-status");
const relatedResultsGrid = document.querySelector("#related-results-grid");
const accountButton = document.querySelector("#account-button");
const accountModal = document.querySelector("#account-modal");
const accountClose = document.querySelector("#account-close");
const accountTitle = document.querySelector("#account-title");
const accountSignedOut = document.querySelector("#account-signed-out");
const accountSignedIn = document.querySelector("#account-signed-in");
const accountGreeting = document.querySelector("#account-greeting");
const accountForm = document.querySelector("#account-form");
const accountUsername = document.querySelector("#account-username");
const accountDisplayName = document.querySelector("#account-display-name");
const accountPassword = document.querySelector("#account-password");
const accountInviteCode = document.querySelector("#account-invite-code");
const accountSubmit = document.querySelector("#account-submit");
const accountStatus = document.querySelector("#account-status");
const accountProfileStatus = document.querySelector("#account-profile-status");
const accountLogoutButton = document.querySelector("#account-logout-button");
const accountMenu = document.querySelector("#account-menu");
const accountMenuTaste = document.querySelector("#account-menu-taste");
const accountMenuWatchlist = document.querySelector("#account-menu-watchlist");
const accountMenuLogout = document.querySelector("#account-menu-logout");
const accountModeButtons = Array.from(document.querySelectorAll("[data-auth-mode]"));
const accountRegisterOnlyFields = Array.from(
  document.querySelectorAll("[data-register-only]")
);
const wantWatchButton = document.querySelector("#want-watch-button");
const watchlistPage = document.querySelector("#watchlist-page");
const watchlistBack = document.querySelector("#watchlist-back");
const watchlistStatus = document.querySelector("#watchlist-status");
const watchlistGrid = document.querySelector("#watchlist-grid");
const tasteProfileModal = document.querySelector("#taste-profile-modal");
const tasteProfileClose = document.querySelector("#taste-profile-close");
const tasteProfileStatus = document.querySelector("#taste-profile-status");
const tasteProfileLikes = document.querySelector("#taste-profile-likes");
const tasteProfileDislikes = document.querySelector("#taste-profile-dislikes");
const movieFeedbackModal = document.querySelector("#movie-feedback-modal");
const movieFeedbackClose = document.querySelector("#movie-feedback-close");
const movieFeedbackTitle = document.querySelector("#movie-feedback-title");
const movieFeedbackBody = document.querySelector("#movie-feedback-body");
const movieLikedButton = document.querySelector("#movie-liked-button");
const movieDislikedButton = document.querySelector("#movie-disliked-button");
const movieFeedbackStatus = document.querySelector("#movie-feedback-status");

// Local fallback posters keep the animated wall working even before the API responds.
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

// Core UI state tracks the current chat, selected poster picks, and poster-wall animation settings.
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

// Mutable interaction state coordinates modals, loading flags, cached results, auth state, and saved movie selections.
let activeSlotIndex = -1;
let searchResults = [];
let highlightedResult = -1;
let searchTimer = null;
let searchController = null;
let tasteSearchResults = [];
let tasteHighlightedResult = -1;
let tasteSearchTimer = null;
let tasteSearchController = null;
let selectedTasteMovie = null;
let isChatLoading = false;
let isRelatedLoading = false;
let relatedResultsReturnFocus = genreActorInput;
let selectedRelatedMovie = null;
let selectedRelatedMovieIsPickMatch = false;
let lastRelatedResultsData = null;
let lastPickRecommendationsData = null;
let lastPickRecommendationKey = "";
let currentPosterWallPosters = [];
let posterWallResizeFrame = 0;
let posterWallLayoutKey = "";
let posterWallColumns = [];
let posterWallAnimationFrame = 0;
let posterWallLastTimestamp = 0;
let accountMode = "login";
let accountReturnFocus = accountButton;
let authState = {
  authConfigured: null,
  user: null
};
let isAuthLoading = false;
let isFeedbackLoading = false;
let watchlistReturnFocus = accountButton;
let tasteProfileReturnFocus = accountButton;
let movieFeedbackReturnFocus = null;
let selectedWatchlistMovie = null;

// Chat form submission sends non-empty text through the main chat request flow.
form.addEventListener("submit", async (event) => {
  event.preventDefault();

  const text = input.value.trim();
  if (!text) {
    return;
  }

  input.value = "";
  sendChatMessage(text);
});

// Enter submits the composer while Shift+Enter keeps textarea line breaks available.
input.addEventListener("keydown", (event) => {
  if (event.key === "Enter" && !event.shiftKey) {
    event.preventDefault();
    form.requestSubmit();
  }
});

// Poster slot clicks either open the picker for an empty slot or remove an existing pick.
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

// Movie search input is debounced so TMDB is queried only after the user pauses typing.
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

// Keyboard handling keeps the movie search popover accessible with escape, arrows, and enter.
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

// The inline taste tuner uses its own debounced title search so it can stay independent of poster picks.
tasteMovieSearchInput.addEventListener("input", () => {
  const query = tasteMovieSearchInput.value.trim();

  window.clearTimeout(tasteSearchTimer);
  if (tasteSearchController) {
    tasteSearchController.abort();
    tasteSearchController = null;
  }
  tasteTunerStatus.textContent = "";

  if (query.length < 2) {
    closeTasteMovieResults();
    return;
  }

  tasteSearchTimer = window.setTimeout(() => {
    searchTasteMovies(query);
  }, 220);
});

// Arrow keys and Enter make the inline movie result list usable without a pointer.
tasteMovieSearchInput.addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    closeTasteMovieResults();
    return;
  }

  if (tasteMovieResults.hidden || !tasteSearchResults.length) {
    return;
  }

  if (event.key === "ArrowDown") {
    event.preventDefault();
    tasteHighlightedResult =
      (tasteHighlightedResult + 1) % tasteSearchResults.length;
    renderTasteMovieResults();
  }

  if (event.key === "ArrowUp") {
    event.preventDefault();
    tasteHighlightedResult =
      (tasteHighlightedResult - 1 + tasteSearchResults.length) %
      tasteSearchResults.length;
    renderTasteMovieResults();
  }

  if (event.key === "Enter" && tasteHighlightedResult >= 0) {
    event.preventDefault();
    selectTasteMovie(tasteSearchResults[tasteHighlightedResult]);
  }
});

// Close and action buttons are wired to their matching modal, account, watchlist, and feedback flows.
movieSearchClose.addEventListener("click", closeMoviePicker);
relatedResultsClose.addEventListener("click", closeRelatedResults);
accountButton.addEventListener("click", handleAccountButtonClick);
accountClose.addEventListener("click", closeAccountModal);
wantWatchButton.addEventListener("click", handleWantToWatch);
watchlistBack.addEventListener("click", () => closeWatchlist({ updateHistory: true }));
tasteProfileClose.addEventListener("click", closeTasteProfile);
movieFeedbackClose.addEventListener("click", closeMovieFeedbackModal);
movieLikedButton.addEventListener("click", () => handleWatchlistFeedback("liked"));
movieDislikedButton.addEventListener("click", () => handleWatchlistFeedback("disliked"));
tasteLikedButton.addEventListener("click", () => handleTasteFeedback("liked"));
tasteDislikedButton.addEventListener("click", () => handleTasteFeedback("disliked"));
accountMenuTaste.addEventListener("click", () => {
  closeAccountMenu();
  openTasteProfile(accountButton);
});
accountMenuWatchlist.addEventListener("click", () => {
  closeAccountMenu();
  openWatchlist(accountButton);
});
accountMenuLogout.addEventListener("click", () => {
  closeAccountMenu();
  handleAccountLogout();
});

// Auth mode tabs switch the account form between login and registration fields.
accountModeButtons.forEach((button) => {
  button.addEventListener("click", () => {
    setAccountMode(button.dataset.authMode);
  });
});

accountForm.addEventListener("submit", handleAccountSubmit);
accountLogoutButton.addEventListener("click", handleAccountLogout);

// Clicking modal backdrops closes the active overlay while preserving clicks inside each popover.
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

accountModal.addEventListener("click", (event) => {
  if (event.target === accountModal) {
    closeAccountModal();
  }
});

tasteProfileModal.addEventListener("click", (event) => {
  if (event.target === tasteProfileModal) {
    closeTasteProfile();
  }
});

movieFeedbackModal.addEventListener("click", (event) => {
  if (event.target === movieFeedbackModal) {
    closeMovieFeedbackModal();
  }
});

// Escape closes the foremost open modal or page-level overlay.
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && !movieSearchModal.hidden) {
    closeMoviePicker();
    return;
  }

  if (event.key === "Escape" && !relatedResultsModal.hidden) {
    closeRelatedResults();
    return;
  }

  if (event.key === "Escape" && !accountModal.hidden) {
    closeAccountModal();
    return;
  }

  if (event.key === "Escape" && !movieFeedbackModal.hidden) {
    closeMovieFeedbackModal();
    return;
  }

  if (event.key === "Escape" && !watchlistPage.hidden) {
    closeWatchlist({ updateHistory: true });
    return;
  }

  if (event.key === "Escape" && !tasteProfileModal.hidden) {
    closeTasteProfile();
    return;
  }

  if (event.key === "Escape" && !accountMenu.hidden) {
    closeAccountMenu();
  }
});

// Outside clicks dismiss transient popovers like search results and the account menu.
document.addEventListener("click", (event) => {
  if (!movieSearchModal.hidden && !event.target.closest(".movie-search-popover")) {
    closeResults();
  }

  if (!accountMenu.hidden && !event.target.closest(".account-corner")) {
    closeAccountMenu();
  }

  if (!event.target.closest(".taste-tuner-search")) {
    closeTasteMovieResults();
  }
});

// Discovery controls trigger either pick-based recommendations or genre/actor search.
pickSearchButton.addEventListener("click", () => {
  searchPickRecommendations();
});

pickResultsButton.addEventListener("click", () => {
  showLastPickRecommendations();
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

// Browser history events keep the watchlist page and home view in sync with the hash.
window.addEventListener("popstate", syncViewFromLocation);
window.addEventListener("hashchange", syncViewFromLocation);

// Initial rendering hydrates the main screen, poster wall, account state, and hash-based view.
renderPosterSlots();
loadPosterWall();
setAccountMode("login");
loadAuthState();
syncViewFromLocation();

// Poster wall resize listeners keep the animated background fitted to viewport changes.
if (posterWall) {
  window.addEventListener("resize", schedulePosterWallRender);

  if (window.visualViewport) {
    window.visualViewport.addEventListener("resize", schedulePosterWallRender);
  }
}

// Sends the chat transcript and current poster picks to the server, then renders the assistant reply.
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

// Searches TMDB through the server for a genre or actor query and opens the recommendation modal.
async function searchRelatedMovies(query) {
  if (isRelatedLoading) {
    return;
  }

  openRelatedResults(genreActorInput);
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

// Requests recommendations based on the currently selected poster picks.
async function searchPickRecommendations() {
  if (isRelatedLoading) {
    return;
  }

  const picks = selectedMovies.filter(Boolean);

  if (!picks.length) {
    openRelatedResults(pickSearchButton);
    relatedResultsTitle.textContent = "Add movie picks";
    relatedResultsStatus.textContent =
      "Choose one to four movies first, then I can match the vibe.";
    relatedResultsGrid.replaceChildren();
    return;
  }

  openRelatedResults(pickSearchButton);
  setRelatedLoading(true);
  relatedResultsTitle.textContent = "Asking Gemini";
  relatedResultsStatus.textContent =
    "Building three recommendations from your poster picks...";
  relatedResultsGrid.replaceChildren();

  try {
    const response = await fetch("/api/movies/recommendations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        favoriteMovies: getFavoriteMoviePayload()
      })
    });
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || "Recommendation search failed.");
    }

    cachePickRecommendations(data);
    renderRelatedResults(data);
  } catch (error) {
    relatedResultsTitle.textContent = "No matches";
    relatedResultsStatus.textContent = error.message;
    relatedResultsGrid.replaceChildren();
  } finally {
    setRelatedLoading(false);
  }
}

// Searches TMDB title matches for the active empty poster slot.
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

// Searches TMDB for the inline taste tuner and ignores stale responses as the query changes.
async function searchTasteMovies(query) {
  if (tasteSearchController) {
    tasteSearchController.abort();
  }

  tasteSearchController = new AbortController();
  tasteTunerStatus.textContent = "Searching...";

  try {
    const response = await fetch(
      `/api/movies/search?query=${encodeURIComponent(query)}`,
      { signal: tasteSearchController.signal }
    );
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || "TMDB search failed.");
    }

    tasteSearchResults = data.results || [];
    tasteHighlightedResult = tasteSearchResults.length ? 0 : -1;
    tasteTunerStatus.textContent = tasteSearchResults.length
      ? "Pick a movie from the results."
      : "No matches found.";
    renderTasteMovieResults();
  } catch (error) {
    if (error.name === "AbortError") {
      return;
    }

    tasteSearchResults = [];
    tasteHighlightedResult = -1;
    closeTasteMovieResults();
    tasteTunerStatus.textContent = error.message;
  }
}

// Renders movie matches below the taste-tuner input using the shared search-result visual style.
function renderTasteMovieResults() {
  tasteMovieResults.replaceChildren();

  if (!tasteSearchResults.length) {
    closeTasteMovieResults();
    return;
  }

  tasteSearchResults.forEach((movie, index) => {
    const item = document.createElement("li");
    item.setAttribute("role", "option");
    item.id = `taste-movie-result-${movie.id}`;
    item.setAttribute("aria-selected", String(index === tasteHighlightedResult));

    const button = document.createElement("button");
    button.type = "button";
    button.className = "movie-result";
    button.addEventListener("click", () => selectTasteMovie(movie));

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
    title.textContent = formatMovieTitle(movie);

    const overview = document.createElement("span");
    overview.textContent = movie.overview || "Movie result from TMDB";

    details.append(title, overview);
    button.append(poster, details);
    item.append(button);
    tasteMovieResults.append(item);
  });

  tasteMovieResults.hidden = false;
  tasteMovieSearchInput.setAttribute("aria-expanded", "true");
  tasteMovieSearchInput.setAttribute(
    "aria-activedescendant",
    tasteHighlightedResult >= 0
      ? `taste-movie-result-${tasteSearchResults[tasteHighlightedResult].id}`
      : ""
  );
}

// Moves a search result into the reaction card where it can be marked liked or disliked.
function selectTasteMovie(movie) {
  selectedTasteMovie = movie;
  tasteMovieSearchInput.value = "";
  tasteTunerStatus.textContent = "Choose Liked or Disliked to update your profile.";
  closeTasteMovieResults();
  renderTasteMovieSelection();
}

// Shows the selected movie's art and summary without injecting remote copy as HTML.
function renderTasteMovieSelection() {
  tasteTunerPoster.replaceChildren();

  if (!selectedTasteMovie) {
    tasteTunerSelection.hidden = true;
    return;
  }

  if (selectedTasteMovie.posterUrl) {
    const image = document.createElement("img");
    image.src = selectedTasteMovie.posterUrl;
    image.alt = `${selectedTasteMovie.title} poster`;
    image.loading = "lazy";
    tasteTunerPoster.append(image);
  } else {
    tasteTunerPoster.textContent = "No art";
  }

  tasteTunerMovieTitle.textContent = formatMovieTitle(selectedTasteMovie);
  tasteTunerMovieOverview.textContent =
    selectedTasteMovie.overview || "Movie result from TMDB";
  tasteTunerSelection.hidden = false;
}

// Clears the inline result list and its active-descendant accessibility state.
function closeTasteMovieResults() {
  if (tasteSearchController) {
    tasteSearchController.abort();
    tasteSearchController = null;
  }

  tasteSearchResults = [];
  tasteHighlightedResult = -1;
  tasteMovieResults.hidden = true;
  tasteMovieResults.replaceChildren();
  tasteMovieSearchInput.setAttribute("aria-expanded", "false");
  tasteMovieSearchInput.removeAttribute("aria-activedescendant");
}

// Renders the movie-picker listbox and keeps its active-descendant accessibility state in sync.
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

// Adds a chosen TMDB movie to the current poster slot while preventing duplicates.
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

// Stores the latest pick-based recommendations so they can be reopened while the picks are unchanged.
function cachePickRecommendations(data) {
  lastPickRecommendationsData = data;
  lastPickRecommendationKey = getSelectedMovieKey();
  updatePickSearchButtonState();
}

// Reopens the cached pick recommendation results when they still match the current picks.
function showLastPickRecommendations() {
  if (isRelatedLoading || !hasCurrentPickRecommendations()) {
    return;
  }

  openRelatedResults(pickResultsButton);
  renderRelatedResults(lastPickRecommendationsData);
}

// Renders the four poster-pick slots, including add buttons and filled poster cards.
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

  updatePickSearchButtonState();
}

// Opens the movie picker for one poster slot and prepares its search state.
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

// Closes the movie picker and returns focus to the slot that launched it.
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

// Loads poster-wall art from the API and falls back to local posters if the request fails.
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

// Builds the animated poster-wall columns from the available poster deck.
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

// Schedules a single poster-wall rerender for viewport changes.
function schedulePosterWallRender() {
  if (!currentPosterWallPosters.length || posterWallResizeFrame) {
    return;
  }

  posterWallResizeFrame = window.requestAnimationFrame(() => {
    posterWallResizeFrame = 0;
    renderPosterWall(currentPosterWallPosters);
  });
}

// Calculates poster-wall column and row counts from the current viewport size.
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

// Clamps a numeric layout value into a safe minimum and maximum range.
function clampNumber(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

// Starts the poster-wall animation loop if it is not already running.
function startPosterWallAnimation() {
  if (posterWallAnimationFrame || !posterWallColumns.length) {
    return;
  }

  posterWallLastTimestamp = performance.now();
  posterWallAnimationFrame = window.requestAnimationFrame(stepPosterWall);
}

// Stops the poster-wall animation loop and clears its frame bookkeeping.
function stopPosterWallAnimation() {
  if (posterWallAnimationFrame) {
    window.cancelAnimationFrame(posterWallAnimationFrame);
  }

  posterWallAnimationFrame = 0;
  posterWallLastTimestamp = 0;
  posterWallColumns = [];
}

// Advances every poster-wall column and recycles tiles when they leave the visible loop.
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

// Moves one poster-wall tile to the loop edge and swaps in the next poster for that column.
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

// Creates a deterministic per-column poster deck so neighboring columns vary without obvious repeats.
function createColumnPosterDeck(posters, columnIndex) {
  if (posters.length < 2) {
    return [...posters];
  }

  const step = getCoprimeStep(posters.length, 5 + columnIndex * 6);
  const offset = (columnIndex * 17) % posters.length;

  return posters.map((_, index) => posters[(offset + index * step) % posters.length]);
}

// Finds a step size that walks the whole poster deck before repeating.
function getCoprimeStep(length, seed) {
  let step = seed % length || 1;

  while (getGreatestCommonDivisor(step, length) !== 1) {
    step = (step % length) + 1;
  }

  return step;
}

// Computes the greatest common divisor for poster deck stepping.
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

// Returns the next poster for a wall column while avoiding recent repeats in that column.
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

// Tracks recent posters in one column so the wall does not visibly loop the same art.
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

// Deduplicates poster-wall candidates by id, title, or poster URL before shuffling them.
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

// Creates a stable identity key for poster-wall deduplication.
function getPosterKey(poster) {
  if (!poster) {
    return "";
  }

  return String(poster.id || poster.posterUrl || poster.title || "");
}

// Shuffles an array copy with Fisher-Yates so the original list is not mutated.
function shuffleItems(items) {
  const shuffled = [...items];

  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [shuffled[index], shuffled[swapIndex]] = [shuffled[swapIndex], shuffled[index]];
  }

  return shuffled;
}

// Creates one poster-wall tile element with image loading configured for background art.
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

// Updates an existing poster-wall tile with a new poster and tilt.
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

// Renders either the recommendation grid or an empty state from a related-results response.
function renderRelatedResults(data) {
  lastRelatedResultsData = data;
  selectedRelatedMovie = null;
  selectedRelatedMovieIsPickMatch = false;
  relatedResultsModal.classList.remove("detail-open");
  renderWantWatchButton();

  const existingBackButton = relatedResultsModal.querySelector(".related-results-back");
  if (existingBackButton) {
    existingBackButton.remove();
  }

  const movies = Array.isArray(data.results) ? data.results : [];
  const matchName = data.matchName || data.query || "that search";
  const isPickMatch = data.matchType === "picks";

  relatedResultsTitle.textContent = isPickMatch
    ? "Recommendations from your picks"
    : `Matches for ${matchName}`;
  relatedResultsGrid.replaceChildren();

  if (!movies.length) {
    relatedResultsStatus.textContent = isPickMatch
      ? "No movie recommendations found."
      : "No English-language movie matches found.";
    return;
  }

  if (isPickMatch) {
    relatedResultsStatus.textContent = "Based on your picks";
  } else {
    relatedResultsStatus.textContent = data.matchType === "actor"
      ? "Actor match"
      : "Genre match";
  }

  movies.forEach((movie) => {
    const card = document.createElement("article");
    card.className = "related-movie-card";
    card.tabIndex = 0;

    card.addEventListener("click", () => showRelatedMovieDetail(movie, isPickMatch));
    card.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        showRelatedMovieDetail(movie, isPickMatch);
      }
    });

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
    overview.textContent = formatRelatedMovieCopy(movie, isPickMatch);

    copy.append(title, overview);
    card.append(poster, copy);
    relatedResultsGrid.append(card);
  });
}

// Opens the detailed view for one recommendation and fetches provider data when possible.
async function showRelatedMovieDetail(movie, isPickMatch) {
  selectedRelatedMovie = movie;
  selectedRelatedMovieIsPickMatch = isPickMatch;

  if (
    selectedRelatedMovie?.id &&
    !selectedRelatedMovie.providerInfo &&
    !selectedRelatedMovie.providerInfoLoading
  ) {
    selectedRelatedMovie.providerInfoLoading = true;
    renderRelatedMovieDetail();

    try {
      selectedRelatedMovie.providerInfo = await fetchMovieProviders(
        selectedRelatedMovie.id
      );
    } catch {
      selectedRelatedMovie.providerInfo = null;
    } finally {
      selectedRelatedMovie.providerInfoLoading = false;
      renderRelatedMovieDetail();
    }

    return;
  }

  renderRelatedMovieDetail();
}

// Renders the selected recommendation's poster, description, fit reason, links, and providers.
function renderRelatedMovieDetail() {
  relatedResultsModal.classList.add("detail-open");
  relatedResultsGrid.replaceChildren();

  const existingBackButton = relatedResultsModal.querySelector(".related-results-back");
  if (existingBackButton) {
    existingBackButton.remove();
  }

  const backButton = document.createElement("button");
  backButton.type = "button";
  backButton.className = "related-results-back";
  backButton.innerHTML = "← <span class=\"sr-only\">Back to suggestions</span>";
  backButton.textContent = "Back";
  backButton.setAttribute("aria-label", "Back to suggestions");
  backButton.addEventListener("click", () => renderRelatedResults(lastRelatedResultsData));
  relatedResultsStatus.after(backButton);

  if (!selectedRelatedMovie) {
    renderWantWatchButton();
    return;
  }

  renderWantWatchButton();

  const detail = document.createElement("article");
  detail.className = "related-movie-detail";

  const posterBlock = document.createElement("div");
  posterBlock.className = "related-movie-poster-block";

  const poster = document.createElement("div");
  poster.className = "related-movie-poster";

  const letterboxdUrl = getLetterboxdSearchUrl(
    selectedRelatedMovie.title,
    selectedRelatedMovie.year
  );

  if (selectedRelatedMovie.posterUrl) {
    const image = document.createElement("img");
    image.src = selectedRelatedMovie.posterUrl;
    image.alt = `${selectedRelatedMovie.title} poster`;
    image.loading = "lazy";
    poster.append(image);
  } else {
    poster.textContent = "No art";
  }

  posterBlock.append(poster);

  const posterActions = document.createElement("div");
  posterActions.className = "related-movie-actions";

  if (selectedRelatedMovie.tmdbUrl) {
    posterActions.append(createExternalLinkButton(selectedRelatedMovie.tmdbUrl, "TMDB"));
  }

  posterActions.append(
    createExternalLinkButton(
      letterboxdUrl,
      "Letterboxd",
      "/assets/letterboxd-logo.png"
    )
  );

  const descriptionCopy = document.createElement("div");
  descriptionCopy.className = "related-movie-description";

  const title = document.createElement("h3");
  title.textContent = selectedRelatedMovie.year
    ? `${selectedRelatedMovie.title} (${selectedRelatedMovie.year})`
    : selectedRelatedMovie.title;

  const description = document.createElement("p");
  description.textContent =
    selectedRelatedMovie.description ||
    selectedRelatedMovie.overview ||
    "No synopsis available.";

  descriptionCopy.append(title);

  if (selectedRelatedMovie.voteAverage > 0) {
    const scoreRow = document.createElement("div");
    scoreRow.className = "related-movie-score-row";

    const score = document.createElement("p");
    score.className = "related-movie-score";
    score.textContent = `TMDB score: ${selectedRelatedMovie.voteAverage.toFixed(1)}/10`;
    scoreRow.append(score);
    descriptionCopy.append(scoreRow);
  }

  descriptionCopy.append(description);

  detail.append(posterBlock, descriptionCopy);

  const hasFitReason = Boolean(selectedRelatedMovie.fitReason);

  if (!hasFitReason) {
    detail.classList.add("no-fit-reason");
  }

  if (hasFitReason) {
    const fitCopy = document.createElement("div");
    fitCopy.className = "related-movie-fit";

    const reasonLabel = document.createElement("span");
    reasonLabel.className = "movie-fit-label";
    reasonLabel.textContent = "Why it fits:";

    const reason = document.createElement("p");
    reason.textContent = selectedRelatedMovie.fitReason;

    fitCopy.append(reasonLabel, reason);
    detail.append(fitCopy);
  }

  detail.append(posterActions);

  const providerSection = createProviderSection(selectedRelatedMovie);
  if (providerSection) {
    detail.append(providerSection);
  }

  relatedResultsGrid.append(detail);
}

// Chooses the short description text shown on recommendation cards.
function formatRelatedMovieCopy(movie, isPickMatch) {
  const description = String(movie.description || movie.overview || "").trim();
  const fitReason = String(movie.fitReason || "").trim();

  if (isPickMatch && description && fitReason && description !== fitReason) {
    return `${description} ${fitReason}`;
  }

  return description || fitReason || "No synopsis available.";
}

// Builds a Letterboxd search URL from a movie title and optional year.
function getLetterboxdSearchUrl(title, year) {
  const query = [title, year].filter(Boolean).join(" ");
  return `https://letterboxd.com/search/films/${encodeURIComponent(query)}/`;
}

// Creates a reusable external-link button with an optional service icon.
function createExternalLinkButton(href, label, iconSrc) {
  const anchor = document.createElement("a");
  anchor.href = href;
  anchor.target = "_blank";
  anchor.rel = "noopener noreferrer";
  anchor.className = "external-link-button";

  if (iconSrc) {
    const icon = document.createElement("img");
    icon.src = iconSrc;
    icon.alt = "";
    icon.setAttribute("aria-hidden", "true");
    anchor.append(icon);
  }

  anchor.append(document.createTextNode(label));
  return anchor;
}

// Fetches watch providers for one movie and returns empty provider groups on failure.
async function fetchMovieProviders(movieId) {
  const response = await fetch(
    `/api/movies/providers?movieId=${encodeURIComponent(movieId)}`
  );
  const data = await readJsonResponse(response);

  if (!response.ok) {
    throw new Error(data.error || "Provider lookup failed.");
  }

  return data;
}

// Builds the streaming, rental, purchase, and TMDB watch-link section for a detail card.
function createProviderSection(movie) {
  if (!movie) {
    return null;
  }

  if (movie.providerInfoLoading) {
    const section = document.createElement("div");
    section.className = "related-movie-providers";
    const loading = document.createElement("p");
    loading.textContent = "Checking streaming availability...";
    section.append(loading);
    return section;
  }

  const providerInfo = movie.providerInfo;
  if (providerInfo === null) {
    const section = document.createElement("div");
    section.className = "related-movie-providers";
    const noAvailability = document.createElement("p");
    noAvailability.textContent =
      "Streaming availability could not be loaded right now.";
    section.append(noAvailability);
    return section;
  }

  if (!providerInfo) {
    return null;
  }

  const allProviders = [
    ...(Array.isArray(providerInfo.streaming) ? providerInfo.streaming : []),
    ...(Array.isArray(providerInfo.rent) ? providerInfo.rent : []),
    ...(Array.isArray(providerInfo.buy) ? providerInfo.buy : [])
  ];

  const providerNames = [...new Set(allProviders)];

  if (!providerNames.length) {
    const section = document.createElement("div");
    section.className = "related-movie-providers";
    const noAvailability = document.createElement("p");
    noAvailability.textContent = "Streaming availability not found for this title.";
    section.append(noAvailability);
    return section;
  }

  const section = document.createElement("div");
  section.className = "related-movie-providers";
  const providerRow = document.createElement("p");
  providerRow.innerHTML = `<strong>Available on:</strong> ${providerNames.join(", ")}`;
  section.append(providerRow);

  if (movie.tmdbWatchUrl) {
    const link = document.createElement("a");
    link.href = movie.tmdbWatchUrl;
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    link.className = "related-movie-provider-link";
    link.textContent = "View full streaming options on TMDB";
    section.append(link);
  }

  return section;
}

// Opens the related-results modal and records where focus should return.
function openRelatedResults(returnFocusElement = genreActorInput) {
  relatedResultsReturnFocus = returnFocusElement || genreActorInput;
  relatedResultsModal.hidden = false;
  document.body.classList.add("search-open");
}

// Closes the related-results modal and clears the selected recommendation detail state.
function closeRelatedResults() {
  relatedResultsModal.hidden = true;
  relatedResultsGrid.replaceChildren();
  relatedResultsStatus.textContent = "";
  selectedRelatedMovie = null;
  selectedRelatedMovieIsPickMatch = false;
  relatedResultsModal.classList.remove("detail-open");
  renderWantWatchButton();
  document.body.classList.remove("search-open");

  if (relatedResultsReturnFocus?.focus) {
    relatedResultsReturnFocus.focus();
  }
}

// Opens the account modal for signed-out users or toggles the account menu for signed-in users.
function handleAccountButtonClick() {
  if (authState.user) {
    toggleAccountMenu();
    return;
  }

  openAccountModal(accountButton);
}

// Switches the signed-in account menu between open and closed states.
function toggleAccountMenu() {
  if (accountMenu.hidden) {
    openAccountMenu();
    return;
  }

  closeAccountMenu();
}

// Opens the signed-in account menu and updates ARIA state.
function openAccountMenu() {
  accountMenu.hidden = false;
  accountButton.setAttribute("aria-expanded", "true");
}

// Closes the signed-in account menu and updates ARIA state.
function closeAccountMenu() {
  accountMenu.hidden = true;
  accountButton.setAttribute("aria-expanded", "false");
}

// Shows the Want to Watch action only when a signed-in user is viewing a recommendation detail.
function renderWantWatchButton() {
  const hasSelectedMovie = Boolean(selectedRelatedMovie);
  wantWatchButton.hidden = !hasSelectedMovie;
  wantWatchButton.disabled = !hasSelectedMovie || isFeedbackLoading;
  wantWatchButton.textContent = isFeedbackLoading ? "Saving..." : "Want to Watch";
}

// Saves the currently selected recommendation to the signed-in user's watchlist.
async function handleWantToWatch() {
  if (isFeedbackLoading || !selectedRelatedMovie) {
    return;
  }

  const canSave = await requireSignedIn({
    message: "Log in to save this to your watch list.",
    returnFocusElement: wantWatchButton,
    statusElement: relatedResultsStatus
  });

  if (!canSave) {
    return;
  }

  setFeedbackLoading(true);

  try {
    await saveMovieFeedback(selectedRelatedMovie, "want_to_watch", "recommendation");
    relatedResultsStatus.textContent = "Saved to your watch list.";
  } catch (error) {
    relatedResultsStatus.textContent = error.message;
  } finally {
    setFeedbackLoading(false);
    renderWantWatchButton();
  }
}

// Opens the watchlist page after requiring a signed-in account.
async function openWatchlist(returnFocusElement = accountButton, options = {}) {
  const canOpen = await requireSignedIn({
    message: "Log in to see your watch list.",
    returnFocusElement
  });

  if (!canOpen) {
    return;
  }

  watchlistReturnFocus = returnFocusElement || accountButton;
  homeView.hidden = true;
  watchlistPage.hidden = false;
  document.body.classList.add("watchlist-view");
  updateLibraryBodyLock();
  watchlistStatus.textContent = "Loading watch list...";
  watchlistGrid.replaceChildren();

  if (options.updateHistory !== false && window.location.hash !== "#watchlist") {
    history.pushState({ view: "watchlist" }, "", "#watchlist");
  }

  window.scrollTo({ top: 0, left: 0 });
  window.requestAnimationFrame(() => watchlistBack.focus());
  loadWatchlist();
}

// Closes the watchlist page, restores the home view, and optionally updates history.
function closeWatchlist(options = {}) {
  closeMovieFeedbackModal({ preserveFocus: true });
  watchlistPage.hidden = true;
  homeView.hidden = false;
  document.body.classList.remove("watchlist-view");
  watchlistStatus.textContent = "";
  watchlistGrid.replaceChildren();
  updateLibraryBodyLock();

  if (options.updateHistory && window.location.hash === "#watchlist") {
    history.replaceState(
      { view: "home" },
      "",
      `${window.location.pathname}${window.location.search}`
    );
  }

  window.scrollTo({ top: 0, left: 0 });

  if (watchlistReturnFocus?.focus) {
    watchlistReturnFocus.focus();
  }
}

// Applies the correct page view when the URL hash changes.
function syncViewFromLocation() {
  if (window.location.hash === "#watchlist") {
    openWatchlist(accountButton, { updateHistory: false });
    return;
  }

  if (!watchlistPage.hidden) {
    closeWatchlist({ updateHistory: false });
  }
}

// Loads the signed-in user's watchlist feedback records.
async function loadWatchlist() {
  try {
    const movies = await fetchMovieFeedback("want_to_watch");
    renderWatchlist(movies);
  } catch (error) {
    watchlistStatus.textContent = error.message;
    watchlistGrid.replaceChildren();
  }
}

// Renders watchlist cards or an empty watchlist message.
function renderWatchlist(movies) {
  watchlistGrid.replaceChildren();

  if (!movies.length) {
    watchlistStatus.textContent = "Your watch list is empty.";
    return;
  }

  watchlistStatus.textContent = `${movies.length} saved movie${
    movies.length === 1 ? "" : "s"
  }.`;

  movies.forEach((movie) => {
    watchlistGrid.append(createWatchlistCard(movie));
  });
}

// Creates one watchlist card with poster, open-feedback action, and removal action.
function createWatchlistCard(movie) {
  const card = document.createElement("article");
  card.className = "watchlist-card";

  const openButton = document.createElement("button");
  openButton.type = "button";
  openButton.className = "watchlist-movie-button";
  openButton.setAttribute(
    "aria-label",
    `Open feedback for ${formatMovieTitle(movie)}`
  );
  openButton.addEventListener("click", () => openMovieFeedbackModal(movie, openButton));

  const poster = document.createElement("div");
  poster.className = "watchlist-poster";

  if (movie.posterUrl) {
    const image = document.createElement("img");
    image.src = movie.posterUrl;
    image.alt = `${movie.title} poster`;
    image.loading = "lazy";
    poster.append(image);
  } else {
    poster.textContent = "No art";
  }

  openButton.append(poster);

  const removeButton = document.createElement("button");
  removeButton.type = "button";
  removeButton.className = "watchlist-remove-button";
  removeButton.textContent = "Remove";
  removeButton.addEventListener("click", () => removeWatchlistMovie(movie));

  card.append(openButton, removeButton);
  return card;
}

// Removes a movie from the watchlist and refreshes the list.
async function removeWatchlistMovie(movie) {
  if (isFeedbackLoading) {
    return;
  }

  setFeedbackLoading(true);
  watchlistStatus.textContent = `Removing ${formatMovieTitle(movie)}...`;

  try {
    await deleteMovieFeedback(movie);
    await loadWatchlist();
  } catch (error) {
    watchlistStatus.textContent = error.message;
  } finally {
    setFeedbackLoading(false);
  }
}

// Opens the feedback modal for a watchlist movie and prepares focus restoration.
function openMovieFeedbackModal(movie, returnFocusElement) {
  selectedWatchlistMovie = movie;
  movieFeedbackReturnFocus = returnFocusElement || watchlistBack;
  movieFeedbackTitle.textContent = formatMovieTitle(movie);
  movieFeedbackStatus.textContent = "";
  movieFeedbackBody.replaceChildren(createMovieFeedbackSummary(movie));
  movieFeedbackModal.hidden = false;
  updateLibraryBodyLock();

  window.requestAnimationFrame(() => movieLikedButton.focus());
}

// Closes the feedback modal and clears the selected watchlist movie.
function closeMovieFeedbackModal(options = {}) {
  if (movieFeedbackModal.hidden) {
    return;
  }

  movieFeedbackModal.hidden = true;
  movieFeedbackStatus.textContent = "";
  movieFeedbackBody.replaceChildren();
  selectedWatchlistMovie = null;
  updateLibraryBodyLock();

  if (!options.preserveFocus && movieFeedbackReturnFocus?.focus) {
    movieFeedbackReturnFocus.focus();
  }
}

// Builds the poster and helper copy shown inside the feedback modal.
function createMovieFeedbackSummary(movie) {
  const summary = document.createElement("div");
  summary.className = "movie-feedback-summary";

  const poster = document.createElement("div");
  poster.className = "watchlist-poster";

  if (movie.posterUrl) {
    const image = document.createElement("img");
    image.src = movie.posterUrl;
    image.alt = `${movie.title} poster`;
    poster.append(image);
  } else {
    poster.textContent = "No art";
  }

  const copy = document.createElement("p");
  copy.textContent = "Move this movie into your taste profile.";

  summary.append(poster, copy);
  return summary;
}

// Moves a watchlist movie into liked or disliked feedback.
async function handleWatchlistFeedback(status) {
  if (isFeedbackLoading || !selectedWatchlistMovie) {
    return;
  }

  setFeedbackLoading(true);
  movieFeedbackStatus.textContent =
    status === "liked" ? "Saving to likes..." : "Saving to dislikes...";

  try {
    await saveMovieFeedback(selectedWatchlistMovie, status, "watchlist");
    const savedMessage =
      status === "liked" ? "Moved to likes." : "Moved to dislikes.";
    closeMovieFeedbackModal({ preserveFocus: true });
    await loadWatchlist();
    watchlistStatus.textContent = savedMessage;
    watchlistBack.focus();
  } catch (error) {
    const statusElement = movieFeedbackModal.hidden
      ? watchlistStatus
      : movieFeedbackStatus;
    statusElement.textContent = error.message;
  } finally {
    setFeedbackLoading(false);
  }
}

// Opens the taste-profile modal after requiring a signed-in account.
async function openTasteProfile(returnFocusElement = accountButton) {
  const canOpen = await requireSignedIn({
    message: "Log in to see your taste profile.",
    returnFocusElement
  });

  if (!canOpen) {
    return;
  }

  tasteProfileReturnFocus = returnFocusElement || accountButton;
  tasteProfileModal.hidden = false;
  updateLibraryBodyLock();
  tasteProfileStatus.textContent = "Loading taste profile...";
  tasteProfileLikes.replaceChildren();
  tasteProfileDislikes.replaceChildren();

  window.requestAnimationFrame(() => tasteProfileClose.focus());
  loadTasteProfile();
}

// Closes the taste-profile modal and clears its rendered lists.
function closeTasteProfile() {
  tasteProfileModal.hidden = true;
  tasteProfileStatus.textContent = "";
  tasteProfileLikes.replaceChildren();
  tasteProfileDislikes.replaceChildren();
  updateLibraryBodyLock();

  if (tasteProfileReturnFocus?.focus) {
    tasteProfileReturnFocus.focus();
  }
}

// Loads liked and disliked movies for the taste-profile modal.
async function loadTasteProfile() {
  try {
    const response = await fetch("/api/profile");
    const data = await readJsonResponse(response);

    if (!response.ok) {
      throw new Error(data.error || "Could not load your taste profile.");
    }

    const tasteProfile = data.tasteProfile || {};
    const likes = Array.isArray(tasteProfile.liked) ? tasteProfile.liked : [];
    const dislikes = Array.isArray(tasteProfile.disliked)
      ? tasteProfile.disliked
      : [];

    renderTasteList(tasteProfileLikes, likes, "No liked movies yet.");
    renderTasteList(tasteProfileDislikes, dislikes, "No disliked movies yet.");
    tasteProfileStatus.textContent = "Saved feedback from your account.";
    return true;
  } catch (error) {
    tasteProfileStatus.textContent = error.message;
    tasteProfileLikes.replaceChildren();
    tasteProfileDislikes.replaceChildren();
    return false;
  }
}

// Renders one taste-profile list with removable movie entries.
function renderTasteList(listElement, movies, emptyText) {
  listElement.replaceChildren();

  if (!movies.length) {
    const emptyItem = document.createElement("li");
    emptyItem.className = "taste-profile-empty";
    emptyItem.textContent = emptyText;
    listElement.append(emptyItem);
    return;
  }

  movies.forEach((movie) => {
    const item = document.createElement("li");
    item.className = "taste-profile-item";

    const title = document.createElement("span");
    title.className = "taste-profile-movie-title";
    title.textContent = formatMovieTitle(movie);

    const removeButton = document.createElement("button");
    removeButton.type = "button";
    removeButton.className = "taste-profile-remove-button";
    removeButton.textContent = "x";
    removeButton.setAttribute(
      "aria-label",
      `Remove ${formatMovieTitle(movie)} from your taste profile`
    );
    removeButton.addEventListener("click", () => removeTasteProfileMovie(movie));

    item.append(title, removeButton);
    listElement.append(item);
  });
}

// Removes a movie from the saved taste profile and refreshes the modal.
async function removeTasteProfileMovie(movie) {
  if (isFeedbackLoading) {
    return;
  }

  const movieTitle = formatMovieTitle(movie);
  setFeedbackLoading(true);
  tasteProfileStatus.textContent = `Removing ${movieTitle}...`;

  try {
    await deleteMovieFeedback(movie);
    const didLoad = await loadTasteProfile();

    if (didLoad) {
      tasteProfileStatus.textContent = `Removed ${movieTitle}.`;
    }
  } catch (error) {
    tasteProfileStatus.textContent = error.message;
  } finally {
    setFeedbackLoading(false);
  }
}

// Fetches saved movie feedback records, optionally filtered to one status like want_to_watch.
async function fetchMovieFeedback(status) {
  const query = status ? `?status=${encodeURIComponent(status)}` : "";
  const response = await fetch(`/api/movies/feedback${query}`);
  const data = await readJsonResponse(response);

  if (!response.ok) {
    throw new Error(data.error || "Could not load saved movies.");
  }

  return Array.isArray(data.feedback) ? data.feedback : [];
}

// Saves or updates one movie feedback record through the server API.
async function saveMovieFeedback(movie, status, source) {
  const response = await fetch("/api/movies/feedback", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(createMovieFeedbackPayload(movie, status, source))
  });
  const data = await readJsonResponse(response);

  if (!response.ok) {
    throw new Error(data.error || "Could not save movie feedback.");
  }

  return data.feedback;
}

// Saves a direct liked or disliked signal from the inline tuner to the user's taste profile.
async function handleTasteFeedback(status) {
  if (isFeedbackLoading || !selectedTasteMovie) {
    return;
  }

  const actionButton = status === "liked" ? tasteLikedButton : tasteDislikedButton;
  const canSave = await requireSignedIn({
    message: "Log in to add this movie to your taste profile.",
    returnFocusElement: actionButton,
    statusElement: tasteTunerStatus
  });

  if (!canSave) {
    return;
  }

  const movieTitle = formatMovieTitle(selectedTasteMovie);
  setFeedbackLoading(true);
  tasteTunerStatus.textContent = `Saving ${movieTitle}...`;

  try {
    await saveMovieFeedback(selectedTasteMovie, status, "taste_tuner");
    tasteTunerStatus.textContent = `${movieTitle} was added to your ${
      status === "liked" ? "Likes" : "Dislikes"
    }.`;
    selectedTasteMovie = null;
    tasteMovieSearchInput.value = "";
    renderTasteMovieSelection();
  } catch (error) {
    tasteTunerStatus.textContent = error.message;
  } finally {
    setFeedbackLoading(false);
  }
}

// Deletes one saved movie feedback record by the strongest identifier available.
async function deleteMovieFeedback(movie) {
  const params = new URLSearchParams();

  if (movie.id) {
    params.set("id", movie.id);
  } else {
    const tmdbId = getMovieTmdbId(movie);

    if (tmdbId) {
      params.set("tmdbId", tmdbId);
    } else {
      params.set("title", movie.title || "");
      params.set("year", movie.year || "");
    }
  }

  const response = await fetch(`/api/movies/feedback?${params.toString()}`, {
    method: "DELETE"
  });
  const data = await readJsonResponse(response);

  if (!response.ok) {
    throw new Error(data.error || "Could not remove movie feedback.");
  }

  return data;
}

// Converts a movie object into the feedback payload shape expected by the server.
function createMovieFeedbackPayload(movie, status, source) {
  return {
    tmdbId: getMovieTmdbId(movie),
    title: movie.title || "",
    year: movie.year || "",
    posterUrl: movie.posterUrl || "",
    tmdbUrl: movie.tmdbUrl || "",
    status,
    source
  };
}

// Extracts a TMDB id from recommendation, feedback, or picker movie shapes without confusing database ids for TMDB ids.
function getMovieTmdbId(movie) {
  if (movie?.tmdbId || movie?.tmdb_id) {
    return movie.tmdbId || movie.tmdb_id;
  }

  if (movie?.status || movie?.createdAt || movie?.updatedAt) {
    return "";
  }

  return movie?.id || "";
}

// Ensures the user is signed in before opening account-only features.
async function requireSignedIn({ message, returnFocusElement, statusElement } = {}) {
  if (authState.authConfigured === null) {
    await loadAuthState();
  }

  if (authState.user) {
    return true;
  }

  const statusMessage =
    authState.authConfigured === false
      ? "Accounts are not configured yet."
      : message || "Log in to use this feature.";

  if (statusElement) {
    statusElement.textContent = statusMessage;
  }

  if (authState.authConfigured !== false) {
    openAccountModal(returnFocusElement || accountButton);
  }

  return false;
}

// Applies the shared feedback-loading disabled state across watchlist, profile, and feedback controls.
function setFeedbackLoading(isLoading) {
  isFeedbackLoading = isLoading;
  renderWantWatchButton();
  movieLikedButton.disabled = isLoading;
  movieDislikedButton.disabled = isLoading;
  tasteLikedButton.disabled = isLoading;
  tasteDislikedButton.disabled = isLoading;
  Array.from(watchlistGrid.querySelectorAll(".watchlist-remove-button")).forEach(
    (button) => {
      button.disabled = isLoading;
    }
  );
  Array.from(
    tasteProfileModal.querySelectorAll(".taste-profile-remove-button")
  ).forEach((button) => {
    button.disabled = isLoading;
  });
}

// Locks page scrolling while library modals are open.
function updateLibraryBodyLock() {
  document.body.classList.toggle(
    "library-open",
    !tasteProfileModal.hidden || !movieFeedbackModal.hidden
  );
}

// Checks the current auth session and updates account UI state.
async function loadAuthState() {
  try {
    const response = await fetch("/api/auth/me");
    const data = await readJsonResponse(response);

    if (!response.ok) {
      throw new Error(data.error || "Could not check account status.");
    }

    authState = {
      authConfigured: Boolean(data.authConfigured),
      user: data.user || null
    };
  } catch (error) {
    authState = {
      authConfigured: null,
      user: null
    };
  }

  renderAccountState();
}

// Opens the account dialog and focuses the most useful control for the current auth state.
function openAccountModal(returnFocusElement = accountButton) {
  accountReturnFocus = returnFocusElement || accountButton;
  accountModal.hidden = false;
  document.body.classList.add("account-open");
  renderAccountState();

  if (authState.authConfigured === null) {
    accountStatus.textContent = "Checking account...";
    loadAuthState();
  }

  window.requestAnimationFrame(() => {
    if (authState.user) {
      accountLogoutButton.focus();
      return;
    }

    if (!accountUsername.disabled) {
      accountUsername.focus();
    }
  });
}

// Closes the account dialog and restores focus to the launcher.
function closeAccountModal() {
  accountModal.hidden = true;
  accountStatus.textContent = "";
  accountProfileStatus.textContent = "";
  document.body.classList.remove("account-open");

  if (accountReturnFocus?.focus) {
    accountReturnFocus.focus();
  }
}

// Switches the account form between login and registration mode.
function setAccountMode(mode, options = {}) {
  accountMode = mode === "register" ? "register" : "login";

  accountModeButtons.forEach((button) => {
    const isActive = button.dataset.authMode === accountMode;
    button.classList.toggle("is-active", isActive);
    button.setAttribute("aria-selected", String(isActive));
  });

  accountRegisterOnlyFields.forEach((field) => {
    field.hidden = accountMode !== "register";
  });

  accountTitle.textContent = accountMode === "register" ? "Create account" : "Login";
  accountSubmit.textContent = accountMode === "register" ? "Create account" : "Login";
  accountPassword.autocomplete =
    accountMode === "register" ? "new-password" : "current-password";

  if (accountMode === "register") {
    accountPassword.setAttribute("minlength", "8");
  } else {
    accountPassword.removeAttribute("minlength");
  }

  if (!options.preserveStatus) {
    accountStatus.textContent = "";
  }

  updateAccountControlsDisabled();
}

// Renders signed-in versus signed-out account controls from the latest auth state.
function renderAccountState() {
  const user = authState.user;

  accountButton.textContent = user
    ? `Hi, ${shortenAccountName(getAccountDisplayName(user))}`
    : "Login / Create Account";
  accountButton.setAttribute("aria-haspopup", user ? "menu" : "dialog");

  accountSignedOut.hidden = Boolean(user);
  accountSignedIn.hidden = !user;

  if (user) {
    accountTitle.textContent = "Account";
    accountGreeting.textContent = `Signed in as ${getAccountDisplayName(user)}.`;
  } else {
    setAccountMode(accountMode, { preserveStatus: true });
  }

  if (!user && authState.authConfigured === false) {
    accountStatus.textContent = "Accounts are not configured yet.";
  }

  if (!user) {
    closeAccountMenu();
  }

  updateAccountControlsDisabled();
}

// Submits login or registration credentials and stores the returned user state.
async function handleAccountSubmit(event) {
  event.preventDefault();

  if (isAuthLoading) {
    return;
  }

  if (authState.authConfigured === false) {
    accountStatus.textContent = "Accounts are not configured yet.";
    return;
  }

  const isRegister = accountMode === "register";
  const username = accountUsername.value.trim();
  const password = accountPassword.value;

  if (!username || !password) {
    accountStatus.textContent = "Enter your username and password.";
    return;
  }

  const payload = { username, password };

  if (isRegister) {
    payload.displayName = accountDisplayName.value.trim();
    payload.inviteCode = accountInviteCode.value.trim();
  }

  let signedIn = false;
  setAuthLoading(true);
  accountStatus.textContent = isRegister ? "Creating account..." : "Logging in...";

  try {
    const response = await fetch(`/api/auth/${isRegister ? "register" : "login"}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    const data = await readJsonResponse(response);

    if (!response.ok) {
      throw new Error(data.error || "Account request failed.");
    }

    if (!data.user) {
      throw new Error("Account request finished without a user.");
    }

    authState = {
      authConfigured: true,
      user: data.user
    };
    accountForm.reset();
    renderAccountState();
    accountProfileStatus.textContent = isRegister ? "Account created." : "Logged in.";
    signedIn = true;

    if (window.location.hash === "#watchlist") {
      openWatchlist(accountButton, { updateHistory: false });
    }
  } catch (error) {
    accountStatus.textContent = error.message;
  } finally {
    setAuthLoading(false);

    if (signedIn) {
      window.requestAnimationFrame(() => accountLogoutButton.focus());
    }
  }
}

// Logs the current user out and resets account UI state.
async function handleAccountLogout() {
  if (isAuthLoading) {
    return;
  }

  const shouldFocusModalLogin = !accountModal.hidden;
  let signedOut = false;
  setAuthLoading(true);
  accountProfileStatus.textContent = "Logging out...";

  try {
    const response = await fetch("/api/auth/logout", { method: "POST" });
    const data = await readJsonResponse(response);

    if (!response.ok) {
      throw new Error(data.error || "Logout failed.");
    }

    authState = {
      authConfigured: true,
      user: null
    };
    accountForm.reset();
    setAccountMode("login", { preserveStatus: true });
    renderAccountState();
    accountStatus.textContent = "Logged out.";
    signedOut = true;
  } catch (error) {
    accountProfileStatus.textContent = error.message;
  } finally {
    setAuthLoading(false);

    if (signedOut) {
      window.requestAnimationFrame(() => {
        if (shouldFocusModalLogin) {
          accountUsername.focus();
          return;
        }

        accountButton.focus();
      });
    }
  }
}

// Applies the shared auth-loading flag and refreshes disabled controls.
function setAuthLoading(isLoading) {
  isAuthLoading = isLoading;
  updateAccountControlsDisabled();
}

// Enables or disables account controls based on auth readiness and in-flight requests.
function updateAccountControlsDisabled() {
  const formDisabled = isAuthLoading || authState.authConfigured === false;

  Array.from(accountForm.elements).forEach((element) => {
    element.disabled = formDisabled;
  });

  accountModeButtons.forEach((button) => {
    button.disabled = isAuthLoading;
  });

  accountButton.disabled = isAuthLoading;
  accountLogoutButton.disabled = isAuthLoading;
  accountMenuLogout.disabled = isAuthLoading;

  if (!isAuthLoading) {
    accountSubmit.textContent = accountMode === "register" ? "Create account" : "Login";
    return;
  }

  accountSubmit.textContent = accountMode === "register" ? "Creating..." : "Logging in...";
}

// Safely reads a JSON response body and returns an empty object when parsing fails.
async function readJsonResponse(response) {
  try {
    return await response.json();
  } catch (error) {
    return {};
  }
}

// Chooses the best display name available for a signed-in user.
function getAccountDisplayName(user) {
  return String(user?.displayName || user?.username || "Movie fan").trim();
}

// Shortens long account names so the header button stays compact.
function shortenAccountName(name) {
  const normalizedName = String(name || "Movie fan").trim();

  if (normalizedName.length <= 18) {
    return normalizedName;
  }

  return `${normalizedName.slice(0, 15)}...`;
}

// Clears and hides the movie search result listbox.
function closeResults() {
  movieResultsEl.hidden = true;
  movieResultsEl.replaceChildren();
  movieSearchInput.setAttribute("aria-expanded", "false");
  movieSearchInput.removeAttribute("aria-activedescendant");
  searchResults = [];
  highlightedResult = -1;
}

// Updates the status text inside the movie-picker modal.
function setMovieStatus(text) {
  movieSearchStatus.textContent = text;
}

// Returns the currently selected poster picks in the compact API payload shape.
function getFavoriteMoviePayload() {
  return selectedMovies.filter(Boolean).map((movie) => ({
    id: movie.id,
    title: movie.title,
    year: movie.year
  }));
}

// Builds a stable cache key for the current selected poster picks.
function getSelectedMovieKey() {
  return getFavoriteMoviePayload()
    .map((movie) => String(movie.id || `${movie.title}:${movie.year || ""}`))
    .sort()
    .join("|");
}

// Checks whether cached pick recommendations still belong to the current poster selection.
function hasCurrentPickRecommendations() {
  const selectedMovieKey = getSelectedMovieKey();
  const hasRecommendations = Array.isArray(lastPickRecommendationsData?.results)
    ? lastPickRecommendationsData.results.length > 0
    : false;

  return Boolean(
    selectedMovieKey &&
      hasRecommendations &&
      lastPickRecommendationsData &&
      lastPickRecommendationKey === selectedMovieKey
  );
}

// Formats movie display labels consistently across cards, modals, and status text.
function formatMovieTitle(movie) {
  return movie.year ? `${movie.title} (${movie.year})` : movie.title;
}

// Appends one chat message bubble and scrolls the message pane to the newest item.
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

// Applies chat-loading UI state and updates the top status pill.
function setLoading(isLoading) {
  isChatLoading = isLoading;
  input.disabled = isLoading;
  form.querySelector("button").disabled = isLoading;
  updatePickSearchButtonState();
  statusPill.textContent = isLoading ? "Thinking" : "Ready";
}

// Applies recommendation-loading UI state to genre search and pick search controls.
function setRelatedLoading(isLoading) {
  isRelatedLoading = isLoading;
  genreActorInput.disabled = isLoading;
  genreActorForm.querySelector("button").disabled = isLoading;
  updatePickSearchButtonState();
}

// Enables pick search and cached-result actions according to current loading and cache state.
function updatePickSearchButtonState() {
  const isMoodSearchDisabled = isChatLoading || isRelatedLoading;
  const canShowLastPickRecommendations = hasCurrentPickRecommendations();

  pickSearchButton.disabled = isMoodSearchDisabled;
  pickResultsButton.hidden = !canShowLastPickRecommendations;
  pickResultsButton.disabled = isRelatedLoading || !canShowLastPickRecommendations;
}
