import { profilesLabel, showProfilesLabel } from '../data/labels';

type View = 'cards' | 'list';

const state = { q: '', cat: 'all', city: 'all', view: 'cards' as View };

const $ = <T extends Element = HTMLElement>(sel: string) => document.querySelector<T & Element>(sel)!;
const $$ = <T extends Element = HTMLElement>(sel: string, root: ParentNode = document) =>
  Array.from(root.querySelectorAll<T & Element>(sel));

const setText = (sel: string, text: string) => $$(sel).forEach((el) => (el.textContent = text));

const matches = (el: HTMLElement) => {
  const { name = '', studio = '', category, city } = el.dataset;
  const q = state.q.trim().toLowerCase();
  return (
    (state.cat === 'all' || category === state.cat) &&
    (state.city === 'all' || city === state.city) &&
    (!q || name.toLowerCase().includes(q) || studio.toLowerCase().includes(q))
  );
};

/* ── Scroll reveal ─────────────────────────────────────────────── */

const reveal = (el: HTMLElement, i: number) => {
  el.style.transitionDelay = Math.min(i, 8) * 70 + 'ms';
  el.dataset.revealed = '';
};

const io = new IntersectionObserver(
  (entries) => {
    let i = 0;
    entries.forEach((e) => {
      if (!e.isIntersecting) return;
      reveal(e.target as HTMLElement, i++);
      io.unobserve(e.target);
    });
  },
  { rootMargin: '0px 0px -6% 0px', threshold: 0.05 },
);

let raf = 0;
const observe = () => {
  const run = () => {
    const vh = window.innerHeight;
    let i = 0;
    $$('[data-reveal]:not([data-seen])').forEach((el) => {
      el.dataset.seen = '';
      const r = el.getBoundingClientRect();
      if (r.top < vh * 0.97 && r.bottom > 0) reveal(el, i++);
      else io.observe(el);
    });
  };
  run();
  cancelAnimationFrame(raf);
  raf = requestAnimationFrame(() => requestAnimationFrame(run));
};

// Replays the reveal whenever the set of shown profiles changes.
const resetReveal = () => {
  $$('[data-reveal][data-seen]').forEach((el) => {
    delete el.dataset.seen;
    delete el.dataset.revealed;
    el.style.transitionDelay = '0ms';
    io.unobserve(el);
  });
};

/* ── Render ────────────────────────────────────────────────────── */

let lastKey = '';

const render = () => {
  const { q, cat, city, view } = state;
  const isCards = view === 'cards';

  // Directory: cards and list rows are both server-rendered; hide what doesn't match.
  const cards = $$('[data-directory-view="cards"] [data-person]');
  const shown = cards.filter(matches);
  cards.forEach((el) => (el.hidden = !shown.includes(el)));
  $$('[data-directory-view="list"] [data-person]').forEach((el) => (el.hidden = !matches(el)));

  const n = shown.length;
  $('[data-directory-view="cards"]').hidden = !isCards || n === 0;
  $('[data-directory-view="list"]').hidden = isCards || n === 0;
  $('[data-empty]').hidden = n > 0;

  // Curators follow the view toggle and the filters, but are not part of the profile count.
  const curators = $$('[data-curators-view="cards"] [data-person]');
  const curatorsShown = curators.filter(matches).length;
  $$('[data-curators] [data-person]').forEach((el) => (el.hidden = !matches(el)));
  $('[data-curators]').hidden = curatorsShown === 0;
  $('[data-curators-view="cards"]').hidden = !isCards;
  $('[data-curators-view="list"]').hidden = isCards;
  setText('[data-curators-count]', profilesLabel(curatorsShown));

  // Labels
  const nFilters = (cat !== 'all' ? 1 : 0) + (city !== 'all' ? 1 : 0);
  setText('[data-count]', profilesLabel(n));
  setText('[data-show-label]', n === 0 ? 'Niciun profil găsit' : showProfilesLabel(n));
  setText('[data-filters-label]', 'Filtre' + (nFilters ? ` (${nFilters})` : ''));
  setText('[data-reset-label]', nFilters + (q !== '' ? 1 : 0) === 1 ? 'Resetează filtrul' : 'Resetează filtrele');
  $('[data-reset-row]').hidden = q === '' && cat === 'all' && city === 'all';
  // The filter menu's reset covers only what the menu controls (role and city), not the search.
  setText('[data-menu-reset-label]', nFilters === 1 ? 'Resetează filtrul' : 'Resetează filtrele');
  $('[data-menu-reset]').hidden = nFilters === 0;

  // Controls
  $$<HTMLInputElement>('[data-search]').forEach((input) => {
    if (input.value !== q) input.value = q;
  });
  $$('[data-search-dot]').forEach((el) => (el.hidden = q === ''));
  $$('[data-city-option]').forEach((o) => o.setAttribute('aria-selected', String(o.dataset.cityOption === city)));
  setText('[data-city-current]', city === 'all' ? 'Toate orașele' : city);
  $$('[data-cat]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.cat === cat)));
  $$('[data-city]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.city === city)));
  $$('[data-view-btn]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.viewBtn === view)));
  // A jump link whose section is filtered away is greyed out and skipped by the keyboard.
  $$('[data-jump]').forEach((a) => {
    const target = document.getElementById(a.dataset.jump!);
    const off = !target || target.closest('[hidden]') !== null;
    a.setAttribute('aria-disabled', String(off));
    if (off) a.tabIndex = -1;
    else a.removeAttribute('tabindex');
  });

  const key = view + '|' + shown.map((el) => el.dataset.name).join(',');
  if (key !== lastKey) {
    if (lastKey) resetReveal();
    lastKey = key;
  }
  observe();
};

const setState = (patch: Partial<typeof state>) => {
  Object.assign(state, patch);
  render();
};

/* ── Menu, view toggle, navigation ─────────────────────────────── */

const scrollToEl = (el: HTMLElement, gap = 16) =>
  window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY - $('header').offsetHeight - gap, behavior: 'smooth' });

const filterKey = () => [state.q, state.cat, state.city].join('|');

// After filtering from the menu or the mobile search, the list may have shrunk above the viewport:
// if the user is scrolled past the start of the results, bring back the jump links and the reset above them.
const revealResults = () => {
  const curators = $('[data-curators]');
  const start = curators.hidden ? $('#arhitecti') : curators;
  if (start.getBoundingClientRect().top < $('header').offsetHeight) scrollToEl($('[data-results-top]'), 48);
};

const menu = $('[data-menu]');
const setMenu = (open: boolean) => {
  menu.hidden = !open;
  // Keep the page behind the full-screen menu from scrolling.
  document.documentElement.style.overflow = open ? 'hidden' : '';
};

const content = $('[data-content]');
const setView = (view: View) => {
  if (view === state.view) return setMenu(false);
  content.style.opacity = '0';
  content.style.translate = '0 8px';
  setTimeout(() => {
    content.style.opacity = '';
    content.style.translate = '';
    setMenu(false);
    setState({ view });
  }, 260);
};

$$<HTMLInputElement>('[data-search]').forEach((input) =>
  input.addEventListener('input', () => {
    setState({ q: input.value });
    // The mobile search reveals results when it closes, not while the keyboard is up.
    if (!input.closest('[data-search-bar]')) revealResults();
  }),
);
$$('[data-cat]').forEach((b) =>
  b.addEventListener('click', () => {
    setState({ cat: b.dataset.cat! });
    // Inside the full-screen menu, results are revealed when it closes.
    if (!menu.contains(b)) revealResults();
  }),
);
$$('[data-city]').forEach((b) => b.addEventListener('click', () => setState({ city: b.dataset.city! })));
$$('[data-view-btn]').forEach((b) => b.addEventListener('click', () => setView(b.dataset.viewBtn as View)));
$$('[data-reset]').forEach((b) => b.addEventListener('click', () => setState({ q: '', cat: 'all', city: 'all' })));
$('[data-menu-reset]').addEventListener('click', () => setState({ cat: 'all', city: 'all' }));

let keyOnMenuOpen = '';
const openMenu = () => {
  keyOnMenuOpen = filterKey();
  setMenu(true);
  $('[data-menu] [data-menu-close]').focus();
};
const closeMenu = () => {
  setMenu(false);
  $('[data-menu-open]').focus({ preventScroll: true });
  if (filterKey() !== keyOnMenuOpen) revealResults();
};
$$('[data-menu-open]').forEach((b) => b.addEventListener('click', openMenu));
$$('[data-menu-close]').forEach((b) => b.addEventListener('click', closeMenu));

// Escape closes the menu; Tab cycles inside it while it is open.
menu.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') return closeMenu();
  if (e.key !== 'Tab') return;
  const focusable = $$('button, a[href], input', menu).filter((el) => el.getClientRects().length > 0);
  const first = focusable[0];
  const last = focusable[focusable.length - 1];
  if (e.shiftKey && document.activeElement === first) {
    e.preventDefault();
    last.focus();
  } else if (!e.shiftKey && document.activeElement === last) {
    e.preventDefault();
    first.focus();
  }
});

/* ── Mobile search ──────────────────────────────────────────────── */

const searchBar = $('[data-search-bar]');
const searchOpen = $('[data-search-open]');
const searchInput = $<HTMLInputElement>('[data-search-bar] [data-search]');

let keyOnSearchOpen = '';
const setSearchOpen = (open: boolean) => {
  searchBar.toggleAttribute('data-open', open);
  searchOpen.setAttribute('aria-expanded', String(open));
  if (open) {
    keyOnSearchOpen = filterKey();
    // Focus inside the tap handler so mobile browsers open the keyboard.
    searchInput.focus();
  } else {
    searchInput.blur();
    if (filterKey() !== keyOnSearchOpen) revealResults();
  }
};

searchOpen.addEventListener('click', () => setSearchOpen(true));
$('[data-search-close]').addEventListener('click', () => setSearchOpen(false));
searchInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' || e.key === 'Escape') setSearchOpen(false);
});
// Tapping anywhere outside the open search bar closes it.
document.addEventListener('pointerdown', (e) => {
  const t = e.target as Node;
  if (searchBar.hasAttribute('data-open') && !searchBar.contains(t) && !searchOpen.contains(t)) setSearchOpen(false);
});

/* ── City dropdown ─────────────────────────────────────────────── */

const cityDropdown = $('[data-city-dropdown]');
const cityTrigger = $('[data-city-trigger]');
const cityList = $('[data-city-list]');
const cityOptions = $$('[data-city-option]');
let activeIdx = -1;

const setActive = (i: number) => {
  activeIdx = (i + cityOptions.length) % cityOptions.length;
  cityOptions.forEach((o, j) => o.toggleAttribute('data-active', j === activeIdx));
  const opt = cityOptions[activeIdx];
  cityList.setAttribute('aria-activedescendant', opt.id);
  opt.scrollIntoView({ block: 'nearest' });
};

const setCityOpen = (open: boolean, focusTrigger = false) => {
  cityList.hidden = !open;
  cityTrigger.setAttribute('aria-expanded', String(open));
  if (open) {
    setActive(Math.max(0, cityOptions.findIndex((o) => o.dataset.cityOption === state.city)));
    cityList.focus();
  } else {
    cityOptions.forEach((o) => o.removeAttribute('data-active'));
    if (focusTrigger) cityTrigger.focus();
  }
};

const pickCity = (i: number) => {
  setState({ city: cityOptions[i].dataset.cityOption! });
  setCityOpen(false, true);
  revealResults();
};

cityTrigger.addEventListener('click', () => setCityOpen(cityList.hidden !== false));
cityTrigger.addEventListener('keydown', (e) => {
  if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
    e.preventDefault();
    setCityOpen(true);
  }
});
cityOptions.forEach((o, i) => {
  o.addEventListener('click', () => pickCity(i));
  o.addEventListener('mousemove', () => activeIdx !== i && setActive(i));
});
cityList.addEventListener('keydown', (e) => {
  const moves: Record<string, number> = {
    ArrowDown: activeIdx + 1,
    ArrowUp: activeIdx - 1,
    Home: 0,
    End: cityOptions.length - 1,
  };
  if (e.key in moves) setActive(moves[e.key]);
  else if (e.key === 'Enter' || e.key === ' ') pickCity(activeIdx);
  else if (e.key === 'Escape') setCityOpen(false, true);
  else if (e.key === 'Tab') return setCityOpen(false);
  else return;
  e.preventDefault();
});
document.addEventListener('pointerdown', (e) => {
  if (cityList.hidden === false && !cityDropdown.contains(e.target as Node)) setCityOpen(false);
});

$$('[data-jump]').forEach((a) =>
  a.addEventListener('click', (e) => {
    e.preventDefault();
    setMenu(false);
    setTimeout(() => {
      const el = document.getElementById(a.dataset.jump!);
      if (el && !el.closest('[hidden]')) scrollToEl(el);
    }, 60);
  }),
);

$('[data-back-to-top]').addEventListener('click', (e) => {
  e.preventDefault();
  window.scrollTo({ top: 0, behavior: 'smooth' });
});

render();
