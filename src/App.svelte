<script>
  // Raíz de la app: navegación por "#/ruta" entre Películas y Series y Canales en Vivo.
  import NavBar from './components/NavBar.svelte';
  import CatalogView from './views/CatalogView.svelte';
  import LiveView from './views/LiveView.svelte';

  const TABS = [
    { id: 'catalogo', label: 'Películas y Series', icon: '🎬' },
    { id: 'vivo', label: 'Canales en Vivo', icon: '📡' }
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
  <a href="https://www.themoviedb.org" target="_blank" rel="noopener">TMDB</a>
  <span>Este producto usa la API de TMDB pero no está respaldado ni certificado por TMDB.</span>
</footer>

<style>
  main { min-height: calc(100vh - 120px); }
  footer a { color: #01b4e4; font-weight: 700; text-decoration: none; }
  footer {
    display: flex;
    align-items: center;
    justify-content: center;
    flex-wrap: wrap;
    gap: 0.6rem;
    padding: 1.5rem 1rem;
    color: var(--muted);
    font-size: 0.75rem;
    text-align: center;
  }
</style>
