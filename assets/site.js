function setupNavigation() {
  const header = document.querySelector(".site-header");
  const nav = document.querySelector(".site-nav");
  const menu = document.querySelector(".menu-toggle");
  const mobileLayout = window.matchMedia("(max-width: 760px)");

  function setMenuOpen(open) {
    nav.toggleAttribute("data-open", open);
    menu.setAttribute("aria-expanded", String(open));
  }

  document.documentElement.classList.add("has-menu");
  menu.hidden = false;
  menu.addEventListener("click", () => {
    const opened = !nav.hasAttribute("data-open");
    setMenuOpen(opened);
    if (opened) nav.querySelector("a").focus();
  });
  nav.addEventListener("click", (event) => {
    if (event.target.closest("a")) setMenuOpen(false);
  });
  document.addEventListener("click", (event) => {
    if (!header.contains(event.target)) setMenuOpen(false);
  });
  header.addEventListener("focusout", (event) => {
    if (event.relatedTarget && !header.contains(event.relatedTarget)) setMenuOpen(false);
  });
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && nav.hasAttribute("data-open")) {
      setMenuOpen(false);
      menu.focus();
    }
  });
  mobileLayout.addEventListener("change", () => setMenuOpen(false));

  const languageLink = document.querySelector("[data-language-switch]");
  const languageURL = new URL(languageLink.href);

  function syncLanguageLink() {
    languageURL.hash = window.location.hash;
    languageLink.href = languageURL.href;
  }

  syncLanguageLink();
  window.addEventListener("hashchange", syncLanguageLink);
}

function setupGameDetails() {
  const dialog = document.querySelector(".game-dialog");
  if (typeof dialog?.showModal !== "function") return;

  const dialogImage = dialog.querySelector(".dialog-image");
  const dialogGenre = dialog.querySelector(".dialog-genre");
  const dialogTitle = dialog.querySelector("#dialog-title");
  const dialogDescription = dialog.querySelector("#dialog-description");
  let activeButton;

  for (const game of document.querySelectorAll(".game-card")) {
    const openButton = game.querySelector(".game-open");
    const image = game.querySelector(".game-image");
    const description = game.querySelector(".game-description");
    openButton.hidden = false;
    description.hidden = true;
    openButton.addEventListener("click", () => {
      activeButton = openButton;
      dialogImage.src = image.currentSrc || image.src;
      dialogImage.alt = image.alt;
      dialogGenre.textContent = game.querySelector(".game-genre").textContent;
      dialogTitle.textContent = game.querySelector(".game-title").textContent;
      dialogDescription.textContent = description.textContent;
      dialog.style.setProperty("--game-accent", getComputedStyle(game).getPropertyValue("--game-accent"));
      dialog.showModal();
    });
  }

  dialog.addEventListener("click", (event) => {
    if (event.target === dialog) dialog.close();
  });
  dialog.addEventListener("close", () => activeButton?.focus({ preventScroll: true }));
}

function setupMotion() {
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const ticker = document.querySelector(".ticker");
  if (ticker) {
    const tickerToggle = ticker.querySelector(".ticker-toggle");
    ticker.setAttribute("data-animated", "");
    tickerToggle.hidden = false;
    tickerToggle.addEventListener("click", () => {
      const paused = ticker.toggleAttribute("data-paused");
      tickerToggle.setAttribute("aria-pressed", String(paused));
    });
  }

  if (!reducedMotion.matches && "IntersectionObserver" in window) {
    const observer = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        entry.target.classList.add("is-revealed");
        observer.unobserve(entry.target);
      }
    }, { threshold: 0.12 });

    for (const item of document.querySelectorAll("[data-reveal]")) observer.observe(item);
  }

  const hero = document.querySelector(".hero");
  if (!hero) return;
  hero.addEventListener("pointermove", (event) => {
    if (reducedMotion.matches || event.pointerType !== "mouse") return;

    const bounds = hero.getBoundingClientRect();
    const x = ((event.clientX - bounds.left) / bounds.width - 0.5) * 27;
    const y = ((event.clientY - bounds.top) / bounds.height - 0.5) * 20;
    hero.style.setProperty("--hero-x", `${x}px`);
    hero.style.setProperty("--hero-y", `${y}px`);
  }, { passive: true });
  hero.addEventListener("pointerleave", () => {
    hero.style.removeProperty("--hero-x");
    hero.style.removeProperty("--hero-y");
  });
}

function normalizeSearch(value) {
  return value.normalize("NFKD").toLowerCase()
    .replace(/[يى]/gu, "ی")
    .replace(/ك/gu, "ک")
    .replace(/[^\p{Letter}\p{Number}]/gu, "");
}

function setupCatalogue() {
  const controls = document.querySelector(".catalogue-controls");
  if (!controls) return;

  const search = controls.querySelector("input[type='search']");
  const filters = Array.from(controls.querySelectorAll("[data-filter]"));
  const genreLabels = new Map(filters.map((filter) => [filter.dataset.filter, filter.textContent]));
  const count = controls.querySelector(".catalogue-count");
  const empty = document.querySelector(".catalogue-empty");
  const number = new Intl.NumberFormat(document.documentElement.lang);
  const games = Array.from(document.querySelectorAll(".game-card"), (card) => {
    const title = card.querySelector(".game-title").textContent;
    const alias = card.dataset.search ?? title;
    const genre = card.dataset.genre;
    const terms = [title, alias, alias.replaceAll("&", "and"), card.querySelector(".game-genre").textContent, genreLabels.get(genre) ?? ""];
    return { card, genre, terms: terms.map(normalizeSearch) };
  });
  let selectedGenre = "all";

  function updateResults() {
    const query = normalizeSearch(search.value);
    let visible = 0;

    for (const game of games) {
      const matchesGenre = selectedGenre === "all" || game.genre === selectedGenre;
      const matchesQuery = game.terms.some((term) => term.includes(query));
      game.card.hidden = !(matchesGenre && matchesQuery);
      if (!game.card.hidden) visible += 1;
    }

    count.textContent = count.dataset.format.replace("{count}", number.format(visible)).replace("{total}", number.format(games.length));
    empty.hidden = visible > 0;
  }

  function selectGenre(genre) {
    selectedGenre = genre;
    for (const filter of filters) filter.setAttribute("aria-pressed", String(filter.dataset.filter === genre));
    updateResults();
  }

  for (const filter of filters) filter.addEventListener("click", () => selectGenre(filter.dataset.filter));
  search.addEventListener("input", updateResults);
  empty.querySelector("[data-reset-filters]").addEventListener("click", () => {
    search.value = "";
    selectGenre("all");
    search.focus();
  });

  controls.hidden = false;
  updateResults();
}

function setupContactForm() {
  const form = document.querySelector(".contact-form");
  if (!form) return;

  const name = form.elements.namedItem("name");
  const email = form.elements.namedItem("email");
  const topic = form.elements.namedItem("topic");
  const message = form.elements.namedItem("message");
  const status = form.querySelector(".form-status");
  const draft = form.querySelector(".message-draft");
  const preview = draft.querySelector("textarea");
  const openMail = draft.querySelector("[data-open-mail]");
  const recipient = document.querySelector("[data-contact-email]").href;

  form.addEventListener("input", () => {
    name.setCustomValidity("");
    message.setCustomValidity("");
    draft.hidden = true;
    status.textContent = "";
  });

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const sender = name.value.trim();
    const text = message.value.trim();

    name.setCustomValidity(sender ? "" : form.dataset.invalidName);
    message.setCustomValidity(text ? "" : form.dataset.invalid);
    if (!form.reportValidity()) return;

    const body = `${text.replace(/\r?\n/g, "\r\n")}\r\n\r\n${sender}\r\n${email.value.trim()}`;
    preview.value = body;
    openMail.href = `${recipient}?subject=${encodeURIComponent(topic.value)}&body=${encodeURIComponent(body)}`;
    draft.hidden = false;
    status.textContent = form.dataset.ready;
    openMail.focus();
  });

  draft.querySelector("[data-copy-mail]").addEventListener("click", async () => {
    try {
      await navigator.clipboard.writeText(preview.value);
      status.textContent = form.dataset.copied;
    } catch {
      preview.focus();
      preview.select();
      status.textContent = form.dataset.select;
    }
  });

  form.hidden = false;
}

setupNavigation();
setupGameDetails();
setupMotion();
setupCatalogue();
setupContactForm();
