<script>
  // Barra de navegación principal. Usa rutas con "#" para que el botón
  // Atrás del navegador/celular funcione sin necesitar servidor.
  let { route, tabs } = $props();
</script>

<nav aria-label="Secciones">
  <a class="brand" href="#/catalogo">
    <img src={`${import.meta.env.BASE_URL}icons/icon-192.png`} alt="" width="28" height="28" />
    <span>IPTV Shell</span>
  </a>
  <div class="tabs" role="tablist">
    {#each tabs as t (t.id)}
      <a
        role="tab"
        href={`#/${t.id}`}
        aria-selected={route === t.id}
        class:active={route === t.id}
      >
        <span aria-hidden="true">{t.icon}</span>
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
    padding: 0.6rem 1rem;
    background: color-mix(in srgb, var(--bg) 88%, transparent);
    backdrop-filter: blur(10px);
    border-bottom: 1px solid var(--surface-2);
  }
  .brand {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-weight: 700;
    color: var(--text);
    text-decoration: none;
  }
  .brand img { border-radius: 6px; }
  .tabs { display: flex; gap: 0.3rem; margin-left: auto; }
  .tabs a {
    display: flex;
    align-items: center;
    gap: 0.4rem;
    padding: 0.5rem 0.9rem;
    border-radius: 999px;
    color: var(--muted);
    text-decoration: none;
    white-space: nowrap;
  }
  .tabs a:hover { color: var(--text); background: var(--surface-2); }
  .tabs a.active { color: #fff; background: var(--accent); }

  @media (max-width: 560px) {
    .brand span { display: none; }
    .tabs { margin-left: 0; flex: 1; }
    .tabs a { flex: 1; justify-content: center; padding: 0.5rem; font-size: 0.9rem; }
  }
</style>
