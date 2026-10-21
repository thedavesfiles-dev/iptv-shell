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
  footer { padding: 2.5rem 0 0; }
  .bar {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    justify-content: center;
    gap: 0.4rem 1rem;
    padding: 0.9rem 1rem 1.1rem;
    border-top: 1px solid transparent;
    border-image: var(--gold-line) 1;
    background: linear-gradient(180deg, #160e0b, #0c0807);
    color: var(--muted);
    font-size: 0.75rem;
    text-align: center;
  }
  .brand { font-family: var(--font-marquee); font-size: 1.1rem; color: var(--gold); }
  .credit a { color: var(--gold-light); font-weight: 600; }
</style>
