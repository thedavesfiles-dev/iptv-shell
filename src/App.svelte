<script>
  // Raíz de la app: navegación por "#/ruta" entre Películas y Series y Canales en Vivo.
  import NavBar from './components/NavBar.svelte';
  import CatalogView from './views/CatalogView.svelte';
  import LiveView from './views/LiveView.svelte';

  const TABS = [
    { id: 'catalogo', label: 'Películas y Series', icon: '🎬' },
    { id: 'vivo', label: 'En Vivo', icon: '📡' }
  ];

  function readRoute() {
    const r = location.hash.replace(/^#\/?/, '');
    return TABS.some((t) => t.id === r) ? r : 'catalogo';
  }

  let route = $state(readRoute());
</script>

<svelte:window onhashchange={() => { route = readRoute(); window.scrollTo(0, 0); }} />

<NavBar {route} tabs={TABS} />

<main>
  {#if route === 'vivo'}
    <LiveView />
  {:else}
    <CatalogView />
  {/if}
</main>

<footer>
  <div class="bar">
    <span class="brand">FD-TV</span>
    <span class="credit">
      Datos de <a href="https://www.themoviedb.org" target="_blank" rel="noopener">TMDB</a> ·
      Este producto usa la API de TMDB pero no está respaldado ni certificado por TMDB.
    </span>
  </div>
</footer>

<style>
  main { min-height: calc(100vh - 120px); }
  footer { padding: 2rem 0 0; }
  .bar {
    display: flex;
    align-items: center;
    gap: 1rem;
    padding: 0.55rem 1rem;
    background: var(--red-bg);
    box-shadow: var(--red-shadow);
    color: #fff;
    font-size: 0.75rem;
  }
  .brand {
    font-family: var(--font-display);
    font-weight: 900;
    font-style: italic;
    font-size: 1.2rem;
    letter-spacing: 0.02em;
  }
  .credit { opacity: 0.92; }
  .credit a { color: #fff; font-weight: 700; }
</style>
