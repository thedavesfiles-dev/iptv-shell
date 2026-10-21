<script>
  // Pestaña "Películas y Series": tendencias de TMDB + búsqueda + ficha de detalle.
  import { getTrending, search, hasKey } from '../api/tmdb.js';
  import PosterGrid from '../components/PosterGrid.svelte';
  import DetailView from '../components/DetailView.svelte';
  import { favorites } from '../stores/favorites.svelte.js';
  import { img } from '../api/tmdb.js';

  const TYPES = [
    { id: 'all', label: 'Todo' },
    { id: 'movie', label: 'Películas' },
    { id: 'tv', label: 'Series' }
  ];

  let type = $state('all');           // all | movie | tv
  let timeWindow = $state('week');    // day | week
  let queryInput = $state('');
  let query = $state('');             // búsqueda "confirmada" (con retraso)
  let items = $state([]);
  let page = $state(1);
  let totalPages = $state(1);
  let loading = $state(false);
  let error = $state('');
  let selected = $state(null);
  const hero = $derived(!query && items.length ? items[0] : null); // panel destacado

  let requestId = 0; // para ignorar respuestas viejas si el usuario cambia rápido de filtro

  // Espera 400 ms después de la última tecla antes de buscar
  $effect(() => {
    const q = queryInput.trim();
    const t = setTimeout(() => (query = q), 400);
    return () => clearTimeout(t);
  });

  async function load(reset) {
    if (!hasKey()) {
      error = 'Falta tu token de TMDB en .env.local';
      return;
    }
    const id = ++requestId;
    const nextPage = reset ? 1 : page + 1;
    loading = true;
    error = '';
    try {
      const res = query
        ? await search(query, type === 'all' ? 'multi' : type, nextPage)
        : await getTrending(type, timeWindow, nextPage);
      if (id !== requestId) return;
      page = res.page;
      totalPages = res.totalPages;
      // TMDB a veces repite un título entre páginas: se filtran duplicados
      const seen = new Set(reset ? [] : items.map((i) => i.key));
      const fresh = res.results.filter((r) => !seen.has(r.key));
      items = reset ? fresh : [...items, ...fresh];
    } catch (e) {
      if (id === requestId) error = e.message;
    } finally {
      if (id === requestId) loading = false;
    }
  }

  // Recarga desde la página 1 cuando cambia el tipo, la ventana de tiempo o la búsqueda
  $effect(() => {
    type; timeWindow; query; // dependencias
    load(true);
  });

  // Scroll infinito: carga la siguiente página al acercarse al final
  let sentinel = $state(null);
  // (El observador se vuelve a crear después de cada carga: así, si el final de la
  // lista sigue visible porque la pantalla es grande, pide otra página de inmediato.)
  $effect(() => {
    if (!sentinel || loading || error || page >= totalPages || items.length === 0) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          io.disconnect();
          load(false);
        }
      },
      { rootMargin: '600px' }
    );
    io.observe(sentinel);
    return () => io.disconnect();
  });
</script>

<section class="catalog">
  <!-- Panel destacado: el #1 en tendencias -->
  {#if hero}
    <button class="hero" onclick={() => (selected = hero)} style:--bd={hero.backdrop ? `url(${img(hero.backdrop, 'w1280')})` : 'none'}>
      <div class="hero-poster">
        {#if hero.poster}<img src={img(hero.poster, 'w342')} alt="" />{/if}
      </div>
      <div class="hero-info">
        <span class="kicker">★ En cartelera · #1 {timeWindow === 'day' ? 'hoy' : 'esta semana'} ★</span>
        <span class="hero-title">{hero.title}</span>
        {#if hero.overview}<span class="hero-sub">{hero.overview}</span>{/if}
      </div>
      {#if hero.rating}
        <div class="hero-score"><span class="bignum">{hero.rating.toFixed(1)}</span><small>de 10</small></div>
      {/if}
      <div class="hero-bar">
        <span>{hero.type === 'tv' ? 'Serie' : 'Película'}</span>
        {#if hero.year}<span>{hero.year}</span>{/if}
        <span class="go">Ver ficha ▸</span>
      </div>
    </button>
  {/if}

  <section class="favs">
    <div class="sect"><span class="tag">♥</span><div class="label"><h2>Mis favoritas</h2><small>Películas y series guardadas</small></div></div>
    {#if favorites.titles.length}
      <PosterGrid row items={favorites.titles} onselect={(it) => (selected = it)} />
    {:else}
      <p class="empty">Toca el ♡ de cualquier póster para guardarlo aquí.</p>
    {/if}
  </section>

  <div class="toolbar">
    <div class="segmented" role="group" aria-label="Tipo">
      {#each TYPES as t (t.id)}
        <button class:active={type === t.id} aria-pressed={type === t.id} onclick={() => (type = t.id)}>
          {t.label}
        </button>
      {/each}
    </div>

    {#if !query}
      <div class="segmented" role="group" aria-label="Periodo">
        <button class:active={timeWindow === 'day'} aria-pressed={timeWindow === 'day'} onclick={() => (timeWindow = 'day')}>Hoy</button>
        <button class:active={timeWindow === 'week'} aria-pressed={timeWindow === 'week'} onclick={() => (timeWindow = 'week')}>Semana</button>
      </div>
    {/if}

    <input class="search" type="search" bind:value={queryInput} placeholder="Buscar películas o series…" />
  </div>

  <div class="sect">
    <span class="tag">{query ? 'Buscar' : 'Top'}</span>
    <div class="label">
      {#if query}
        <h2>Resultados: {query}</h2><small>Películas y series</small>
      {:else}
        <h2>Tendencias {timeWindow === 'day' ? 'de hoy' : 'de la semana'}</h2><small>Lo más visto según TMDB</small>
      {/if}
    </div>
  </div>

  {#if error}
    <div class="error">
      <p>⚠ {error}</p>
      <button onclick={() => load(true)}>Reintentar</button>
    </div>
  {/if}

  {#if !loading && !error && items.length === 0}
    <p class="empty">No se encontraron resultados.</p>
  {/if}

  <PosterGrid {items} onselect={(it) => (selected = it)} />

  {#if loading}
    <div class="loading"><div class="spinner"></div></div>
  {/if}

  <div bind:this={sentinel} class="sentinel"></div>
</section>

{#if selected}
  <DetailView item={selected} onclose={() => (selected = null)} />
{/if}

<style>
  .catalog { max-width: 1400px; margin: 0 auto; padding: 1rem; }

  .toolbar { display: flex; flex-wrap: wrap; gap: 0.6rem; align-items: center; }
  .segmented { display: flex; gap: 0; border: 1px solid var(--gold-dark); border-radius: 2px; }
  .segmented button {
    padding: 0.45rem 1rem;
    border: 0;
    border-right: 1px solid #3a2a1f;
    border-radius: 0;
    background: transparent;
    color: var(--muted);
    font-size: 0.9rem;
  }
  .segmented button:last-child { border-right: 0; }
  .segmented button.active { background: linear-gradient(180deg, var(--gold-light), var(--gold) 60%, #b48d3c); color: #1a0f0b; }
  .search { flex: 1; min-width: 200px; }

  .favs { margin-bottom: 0.4rem; }
  .favs .sect { margin-top: 0.4rem; }
  .favs .empty { margin: 0 0 0.8rem; font-size: 0.9rem; }

  /* ---------- Panel destacado: póster de vestíbulo con marco dorado ---------- */
  .hero {
    position: relative;
    display: grid;
    grid-template-columns: auto 1fr auto;
    align-items: end;
    gap: 1.6rem;
    width: 100%;
    min-height: 300px;
    margin: 1rem 0 0.4rem;
    padding: 1.6rem 1.8rem 1.8rem;
    text-align: left;
    text-transform: none;
    letter-spacing: normal;
    font-family: var(--font);
    font-weight: 400;
    color: var(--text);
    border: 1px solid var(--gold);
    border-radius: 2px;
    background:
      linear-gradient(90deg, rgba(12, 8, 7, 0.96) 0%, rgba(12, 8, 7, 0.75) 45%, rgba(12, 8, 7, 0.25) 100%),
      linear-gradient(0deg, rgba(12, 8, 7, 0.9), transparent 45%),
      var(--bd) center 25% / cover no-repeat,
      #120c0a;
    box-shadow: inset 0 0 0 6px #120c0a, inset 0 0 0 7px rgba(217, 180, 90, 0.45), 0 18px 40px rgba(0, 0, 0, 0.6);
  }
  .hero:hover { border-color: var(--gold-light); color: var(--text); }
  .hero:hover .go { background: var(--gold); color: #1a0f0b; }
  .hero-poster img {
    display: block;
    width: 160px;
    aspect-ratio: 2 / 3;
    object-fit: cover;
    border: 1px solid var(--gold);
    outline: 5px solid #120c0a;
    box-shadow: 0 0 0 6px rgba(217, 180, 90, 0.5), 0 16px 36px rgba(0, 0, 0, 0.75);
  }
  .hero-info { display: flex; flex-direction: column; gap: 0.5rem; min-width: 0; }
  .kicker {
    font-family: var(--font-display);
    font-weight: 600;
    font-size: 0.82rem;
    letter-spacing: 0.28em;
    text-transform: uppercase;
    color: var(--gold);
  }
  .hero-title {
    font-family: var(--font-marquee);
    font-size: clamp(2rem, 5vw, 3.6rem);
    line-height: 1.02;
    color: var(--text);
    text-shadow: 0 2px 18px rgba(0, 0, 0, 0.8);
  }
  .hero-sub {
    max-width: 60ch;
    color: #d6cab8;
    font-size: 0.95rem;
    line-height: 1.5;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }
  /* Calificación en sello dorado redondo */
  .hero-score {
    display: grid;
    place-items: center;
    align-content: center;
    width: 92px;
    height: 92px;
    border-radius: 50%;
    border: 1px solid var(--gold);
    background: radial-gradient(circle at 35% 30%, #2a1b14, #120c0a 70%);
    box-shadow: inset 0 0 0 4px #120c0a, inset 0 0 0 5px rgba(217, 180, 90, 0.5), 0 8px 20px rgba(0, 0, 0, 0.6);
  }
  .hero-score .bignum { font-size: 2rem; color: var(--gold-light); }
  .hero-score small { font-family: var(--font-display); font-weight: 600; letter-spacing: 0.2em; text-transform: uppercase; color: var(--muted); font-size: 0.62rem; }
  .hero-bar {
    grid-column: 2 / -1;
    margin-top: -0.6rem;
    display: flex;
    align-items: center;
    gap: 1.2rem;
    font-family: var(--font-display);
    font-weight: 600;
    font-size: 0.8rem;
    letter-spacing: 0.22em;
    text-transform: uppercase;
    color: var(--muted);
  }
  .hero-bar .go {
    margin-left: auto;
    padding: 0.3rem 0.9rem;
    border: 1px solid var(--gold);
    color: var(--gold-light);
    transition: background 0.15s, color 0.15s;
  }

  .error {
    display: flex;
    align-items: center;
    gap: 1rem;
    flex-wrap: wrap;
    padding: 0.8rem 1rem;
    border-radius: 2px;
    border-left: 3px solid var(--accent);
    background: rgba(229, 72, 77, 0.12);
    color: #ffb4b4;
    margin-bottom: 1rem;
  }
  .error p { margin: 0; }
  .empty { color: var(--muted); }

  .loading { display: grid; place-items: center; padding: 2rem; }
  .spinner {
    width: 36px;
    height: 36px;
    border: 4px solid var(--surface-2);
    border-top-color: var(--accent);
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
  }
  @keyframes spin { to { transform: rotate(360deg); } }
  .sentinel { height: 1px; }

  @media (max-width: 600px) {
    .catalog { padding: 0.75rem; }
    .search { min-width: 100%; order: -1; }
    .hero { grid-template-columns: auto 1fr; min-height: 0; padding: 1rem; gap: 0.9rem; }
    .hero-poster img { width: 92px; }
    .hero-bar { grid-column: 1 / -1; margin-top: 0; }
    .kicker { font-size: 0.68rem; letter-spacing: 0.14em; }
    .hero-score { display: none; }
    .hero-sub { display: none; }
  }
</style>
