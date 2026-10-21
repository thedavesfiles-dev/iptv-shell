<script>
  // Barra principal estilo marquesina de cine. Rutas con "#" para que el botón
  // Atrás del navegador/celular funcione sin servidor.
  let { route, tabs } = $props();
</script>

<nav aria-label="Secciones">
  <a class="marquee" href="#/catalogo" aria-label="FD-TV, inicio">
    <span class="bulbs" aria-hidden="true"></span>
    <span class="name">FD-TV</span>
    <span class="bulbs" aria-hidden="true"></span>
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
        {t.label}
      </a>
    {/each}
  </div>
</nav>

<style>
  nav {
    position: sticky;
    top: 0;
    z-index: 20;
    display: flex;
    align-items: center;
    gap: 1rem;
    min-height: 66px;
    padding: 0.4rem 1rem;
    background: linear-gradient(180deg, #1a110e 0%, #0f0a08 100%);
    border-bottom: 1px solid var(--gold-dark);
    box-shadow: 0 1px 0 #000, 0 2px 0 rgba(217, 180, 90, 0.25), 0 10px 24px rgba(0, 0, 0, 0.6);
  }

  /* Marquesina: letrero con focos arriba y abajo */
  .marquee {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 3px;
    padding: 5px 14px;
    text-decoration: none;
    background: linear-gradient(180deg, #2a1712, #160c09);
    border: 1px solid var(--gold);
    border-radius: 3px;
    box-shadow: inset 0 0 0 2px #160c09, inset 0 0 0 3px rgba(217, 180, 90, 0.4), 0 0 18px rgba(255, 190, 90, 0.15);
  }
  .name {
    font-family: var(--font-marquee);
    font-size: 1.7rem;
    line-height: 1;
    letter-spacing: 0.06em;
    color: var(--gold-light);
    text-shadow: 0 0 10px rgba(255, 210, 120, 0.55), 0 0 2px rgba(255, 230, 170, 0.9);
  }
  .bulbs {
    width: 100%;
    height: 5px;
    background: radial-gradient(circle, #fff3c4 0 1.6px, rgba(255, 210, 120, 0.6) 2.2px, transparent 2.8px) 0 50% / 10px 5px repeat-x;
    filter: drop-shadow(0 0 2px rgba(255, 210, 120, 0.9));
    animation: chase 1.2s steps(2) infinite;
  }
  @keyframes chase { 50% { background-position: 5px 50%; } }

  /* Pestañas como boletos de cine (muescas a los lados) */
  .tabs { display: flex; align-items: center; gap: 0.6rem; margin-left: auto; }
  .tabs a {
    display: flex;
    align-items: center;
    gap: 0.45rem;
    height: 40px;
    padding: 0 1.3rem;
    color: var(--text);
    text-decoration: none;
    font-family: var(--font-display);
    font-weight: 600;
    font-size: 0.95rem;
    letter-spacing: 0.16em;
    text-transform: uppercase;
    white-space: nowrap;
    background: #1c1310;
    border-top: 1px dashed rgba(217, 180, 90, 0.45);
    border-bottom: 1px dashed rgba(217, 180, 90, 0.45);
    -webkit-mask: radial-gradient(circle 7px at 0 50%, transparent 98%, #000) left / 51% 100% no-repeat,
                  radial-gradient(circle 7px at 100% 50%, transparent 98%, #000) right / 51% 100% no-repeat;
    mask: radial-gradient(circle 7px at 0 50%, transparent 98%, #000) left / 51% 100% no-repeat,
          radial-gradient(circle 7px at 100% 50%, transparent 98%, #000) right / 51% 100% no-repeat;
  }
  .tabs a:hover { color: var(--gold-light); }
  .tabs a.active {
    color: #1a0f0b;
    background: linear-gradient(180deg, var(--gold-light), var(--gold) 55%, #b48d3c);
    border-color: transparent;
  }
  .dot {
    width: 7px;
    height: 7px;
    border-radius: 50%;
    background: var(--live);
    box-shadow: 0 0 6px var(--live);
    animation: blink 1.6s ease-in-out infinite;
  }
  @keyframes blink { 50% { opacity: 0.3; } }

  @media (max-width: 560px) {
    nav { gap: 0.5rem; padding: 0.4rem 0.5rem; }
    .marquee { padding: 4px 8px; }
    .name { font-size: 1.25rem; }
    .tabs { flex: 1; gap: 0.3rem; }
    .tabs a { flex: 1; justify-content: center; padding: 0 0.4rem; font-size: 0.78rem; letter-spacing: 0.08em; }
  }
</style>
