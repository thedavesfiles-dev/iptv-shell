<script>
  // Barra principal estilo "marcador de transmisión". Rutas con "#" para que
  // el botón Atrás del navegador/celular funcione sin servidor.
  let { route, tabs } = $props();
</script>

<nav aria-label="Secciones">
  <a class="brand" href="#/catalogo" aria-label="FD-TV, inicio">
    <span class="fd">FD</span><span class="tv">TV</span>
  </a>
  <div class="tabs" role="tablist">
    {#each tabs as t (t.id)}
      <a
        role="tab"
        href={`#/${t.id}`}
        aria-selected={route === t.id}
        class:active={route === t.id}
      >
        {#if t.id === 'vivo'}<span class="dot" aria-hidden="true"></span>{/if}
        <span class="txt">{t.label}</span>
      </a>
    {/each}
  </div>
</nav>
<div class="redline" aria-hidden="true"></div>

<style>
  nav {
    position: sticky;
    top: 0;
    z-index: 20;
    display: flex;
    align-items: stretch;
    gap: 1rem;
    height: 58px;
    padding: 0 1rem 0 0;
    background: linear-gradient(180deg, #1d2a45 0%, #101a2e 55%, #0a1120 100%);
    box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.18), 0 4px 16px rgba(0, 0, 0, 0.6);
  }
  .redline {
    position: sticky;
    top: 58px;
    z-index: 19;
    height: 4px;
    background: var(--red-bg);
    box-shadow: 0 0 12px var(--accent-glow);
  }

  /* Logotipo: bloque rojo inclinado con "FD" gigante + "TV" */
  .brand {
    display: flex;
    align-items: center;
    gap: 0.15rem;
    padding: 0 1.6rem 0 1rem;
    background: var(--red-bg);
    box-shadow: var(--red-shadow);
    clip-path: polygon(0 0, 100% 0, calc(100% - 18px) 100%, 0 100%);
    text-decoration: none;
    color: #fff;
    font-family: var(--font-display);
    font-style: italic;
    font-weight: 900;
    line-height: 1;
    text-shadow: 2px 2px 0 rgba(0, 0, 0, 0.35);
  }
  .fd { font-size: 2rem; letter-spacing: -0.01em; }
  .tv {
    font-size: 1rem;
    margin-left: 0.2rem;
    padding: 0.12rem 0.35rem;
    background: #fff;
    color: var(--accent-dark);
    text-shadow: none;
    transform: skewX(-10deg);
  }

  .tabs { display: flex; align-items: center; gap: 0.4rem; margin-left: auto; }
  .tabs a {
    display: flex;
    align-items: center;
    gap: 0.45rem;
    height: 38px;
    padding: 0 1.1rem;
    color: var(--muted);
    text-decoration: none;
    font-family: var(--font-display);
    font-weight: 800;
    font-style: italic;
    font-size: 1.05rem;
    letter-spacing: 0.05em;
    text-transform: uppercase;
    white-space: nowrap;
    background: linear-gradient(180deg, #24324f, #141f36);
    border: 1px solid #2e3d5c;
    box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.15);
    clip-path: polygon(8px 0, 100% 0, calc(100% - 8px) 100%, 0 100%);
  }
  .tabs a:hover { color: #fff; }
  .tabs a.active {
    color: #fff;
    background: var(--red-bg);
    border-color: #ff6a5a;
    box-shadow: var(--red-shadow);
  }
  .dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: var(--live);
    box-shadow: 0 0 8px var(--live);
    animation: blink 1.4s ease-in-out infinite;
  }
  .tabs a.active .dot { background: #fff; box-shadow: 0 0 8px #fff; }
  @keyframes blink { 50% { opacity: 0.3; } }

  @media (max-width: 560px) {
    nav { gap: 0.5rem; padding-right: 0.5rem; }
    .brand { padding: 0 1.2rem 0 0.7rem; }
    .fd { font-size: 1.6rem; }
    .tabs { flex: 1; gap: 0.25rem; }
    .tabs a { flex: 1; justify-content: center; padding: 0 0.5rem; font-size: 0.88rem; }
  }
</style>
