<script>
  // Pestaña "Películas y Series": tendencias de TMDB + búsqueda + ficha de detalle.
  import { getTrending, search, hasKey } from '../api/tmdb.js';
  import PosterGrid from '../components/PosterGrid.svelte';
  import DetailView from '../components/DetailView.svelte';

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

  <h2 class="heading">
    {#if query}
      Resultados para “{query}”
    {:else}
      Tendencias {timeWindow === 'day' ? 'de hoy' : 'de la semana'}
    {/if}
  </h2>

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
  .segmented {
    display: flex;
    background: var(--surface);
    border: 1px solid var(--surface-2);
    border-radius: 999px;
    padding: 3px;
  }
  .segmented button {
    border: 0;
    background: transparent;
    border-radius: 999px;
    padding: 0.4rem 0.9rem;
    color: var(--muted);
  }
  .segmented button.active { background: var(--surface-2); color: var(--text); }
  .search { flex: 1; min-width: 200px; border-radius: 999px; padding-left: 1rem; }

  .heading { font-size: 1.15rem; margin: 1.2rem 0 0.9rem; }

  .error {
    display: flex;
    align-items: center;
    gap: 1rem;
    flex-wrap: wrap;
    padding: 0.8rem 1rem;
    border-radius: 10px;
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
  }
</style>
