<script>
  // Pestaña "Canales en Vivo": listas comunitarias, URL propia, archivo o arrastrar y soltar.
  import Player from '../player/Player.svelte';
  import { loadM3UFromUrl, loadM3UFromFile, filterChannels } from '../playlists/m3uParser.js';
  import { PRESETS, DEFAULT_PRESET_ID, getPreset } from '../playlists/presets.js';
  import { live } from '../stores/live.svelte.js';

  const DEMO_STREAM = 'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8';
  const PAGE_SIZE = 200;               // canales dibujados a la vez (listas grandes = celular lento)
  const STORAGE_KEY = 'iptv-shell:preset';
  const pageIsHttps = location.protocol === 'https:';

  let directUrl = $state('');
  let loading = $state(false);
  let failed = $state(null);           // { url, name } cuando una lista no se pudo descargar
  let dragging = $state(false);
  let limit = $state(PAGE_SIZE);

  const filtered = $derived(
    filterChannels(live.channels, { group: live.group, query: live.query }).filter(
      (c) => !(live.onlyHttps && pageIsHttps && c.url.startsWith('http://'))
    )
  );
  const visible = $derived(filtered.slice(0, limit));
  const httpCount = $derived(live.channels.filter((c) => c.url.startsWith('http://')).length);

  // Al cambiar filtros se vuelve a mostrar desde el principio
  $effect(() => {
    live.group; live.query; live.onlyHttps;
    limit = PAGE_SIZE;
  });

  function applyPlaylist(result, sourceName) {
    live.channels = result.channels;
    live.groups = result.groups;
    live.group = '';
    live.query = '';
    live.sourceName = sourceName;
    failed = null;
    const http = result.channels.filter((c) => c.url.startsWith('http://')).length;
    live.message =
      `${sourceName}: ${result.channels.length} canales en ${result.groups.length} grupos` +
      (pageIsHttps && http ? ` · ${http} usan http:// y el navegador los bloquea aquí` : '');
  }

  async function loadUrl(url, name) {
    if (!url) return;
    loading = true;
    failed = null;
    live.message = `Descargando ${name}…`;
    try {
      applyPlaylist(await loadM3UFromUrl(url), name);
      return true;
    } catch (err) {
      console.warn('[live] no se pudo descargar la lista', url, err);
      failed = { url, name };
      live.message = '';
      return false;
    } finally {
      loading = false;
    }
  }

  async function loadPreset(id) {
    const p = getPreset(id);
    if (!p) return;
    const ok = await loadUrl(p.url, p.name);
    // Solo se marca y se recuerda si cargó bien (una fuente caída no se reintenta en cada visita)
    if (ok) {
      live.presetId = id;
      try { localStorage.setItem(STORAGE_KEY, id); } catch { /* modo privado */ }
    }
  }

  async function loadCustomUrl() {
    if (await loadUrl(live.playlistUrl.trim(), 'Lista personalizada')) live.presetId = '';
  }

  async function loadFile(file) {
    if (!file) return;
    try {
      live.presetId = '';
      applyPlaylist(await loadM3UFromFile(file), file.name);
    } catch (err) {
      live.message = `Error al leer el archivo: ${err.message}`;
    }
  }

  function onDrop(e) {
    e.preventDefault();
    dragging = false;
    loadFile(e.dataTransfer?.files?.[0]);
  }

  function playDirect(url = directUrl) {
    if (!url.trim()) return;
    live.current = { id: 'direct', name: 'Reproducción directa', url: url.trim(), logo: '' };
  }

  // Carga automática al entrar: la última fuente elegida, o "En español" la primera vez
  let autoTried = false; // solo un intento automático (si falla, no reintenta en bucle)
  $effect(() => {
    if (autoTried || live.channels.length) return;
    autoTried = true;
    let saved = null;
    try { saved = localStorage.getItem(STORAGE_KEY); } catch { /* sin almacenamiento */ }
    loadPreset(getPreset(saved) ? saved : DEFAULT_PRESET_ID);
  });
</script>

<svelte:window
  ondragover={(e) => { e.preventDefault(); dragging = true; }}
  ondragleave={(e) => { if (!e.relatedTarget) dragging = false; }}
  ondrop={onDrop}
/>

<section class="layout">
  <div class="stage">
    <Player src={live.current?.url} title={live.current?.name} poster={live.current?.logo} />

    <form class="row" onsubmit={(e) => { e.preventDefault(); playDirect(); }}>
      <input bind:value={directUrl} placeholder="Pega una URL .m3u8 o .mp4" inputmode="url" />
      <button type="submit">Reproducir</button>
      <button type="button" class="ghost" onclick={() => playDirect(DEMO_STREAM)}>Stream de prueba</button>
    </form>
  </div>

  <aside class="side">
    <h2>Fuentes Comunitarias</h2>
    <div class="presets" role="group" aria-label="Fuentes comunitarias">
      {#each PRESETS as p (p.id)}
        <button
          class:active={live.presetId === p.id}
          aria-pressed={live.presetId === p.id}
          title={p.description}
          disabled={loading}
          onclick={() => loadPreset(p.id)}
        >
          {p.name}
        </button>
      {/each}
    </div>

    <details class="more">
      <summary>Usar mi propia lista</summary>
      <form class="row" onsubmit={(e) => { e.preventDefault(); loadCustomUrl(); }}>
        <input bind:value={live.playlistUrl} placeholder="URL de lista .m3u" inputmode="url" />
        <button type="submit" disabled={loading}>Cargar</button>
      </form>
      <label class="file">
        o elige un archivo .m3u (también puedes arrastrarlo a la ventana)
        <input type="file" accept=".m3u,.m3u8,audio/x-mpegurl,application/vnd.apple.mpegurl,text/plain"
               onchange={(e) => loadFile(e.currentTarget.files?.[0])} />
      </label>
    </details>

    {#if loading}
      <p class="msg"><span class="spinner"></span> {live.message}</p>
    {:else if failed}
      <div class="cors">
        <strong>No se pudo descargar «{failed.name}»</strong>
        <p>
          Puede que el servidor bloquee la descarga desde el navegador (CORS) o que no haya conexión.
          Puedes hacerlo a mano:
        </p>
        <ol>
          <li><a href={failed.url} target="_blank" rel="noopener" download>Descarga el archivo .m3u</a> (se abre en otra pestaña: guárdalo con Ctrl+S).</li>
          <li>Arrástralo a esta ventana o elígelo aquí:
            <input type="file" accept=".m3u,.m3u8,text/plain" onchange={(e) => loadFile(e.currentTarget.files?.[0])} />
          </li>
        </ol>
        <button onclick={() => loadUrl(failed.url, failed.name)}>Reintentar</button>
      </div>
    {:else if live.message}
      <p class="msg">{live.message}</p>
    {/if}

    {#if live.channels.length}
      <div class="row">
        <select bind:value={live.group}>
          <option value="">Todos los grupos</option>
          {#each live.groups as g (g)}<option value={g}>{g}</option>{/each}
        </select>
        <input bind:value={live.query} placeholder="Buscar canal" type="search" />
      </div>

      {#if pageIsHttps && httpCount}
        <label class="check">
          <input type="checkbox" bind:checked={live.onlyHttps} />
          Ocultar {httpCount} canales http:// (no se pueden ver desde la web)
        </label>
      {/if}

      <p class="count">{filtered.length} canales</p>

      <ul class="channels">
        {#each visible as ch (ch.id)}
          <li>
            <button class:active={live.current?.id === ch.id} onclick={() => (live.current = ch)}>
              {#if ch.logo}
                <img src={ch.logo} alt="" loading="lazy" referrerpolicy="no-referrer"
                     onerror={(e) => (e.currentTarget.style.visibility = 'hidden')} />
              {:else}
                <span class="nologo">{ch.name.slice(0, 2)}</span>
              {/if}
              <span class="name">{ch.name}</span>
              {#if ch.group && !live.group}<span class="grp">{ch.group}</span>{/if}
            </button>
          </li>
        {/each}
      </ul>
      {#if filtered.length > limit}
        <button class="showmore" onclick={() => (limit += PAGE_SIZE)}>
          Mostrar más ({filtered.length - limit} restantes)
        </button>
      {/if}
    {/if}
  </aside>
</section>

{#if dragging}
  <div class="dropzone" aria-hidden="true">Suelta aquí tu archivo .m3u</div>
{/if}

<style>
  .layout {
    max-width: 1400px;
    margin: 0 auto;
    padding: 1rem;
    display: grid;
    gap: 1rem;
    grid-template-columns: 1fr;
  }
  @media (min-width: 900px) {
    .layout { grid-template-columns: 2fr 1fr; align-items: start; }
    .stage { position: sticky; top: 70px; }
  }

  h2 { font-size: 1rem; margin: 0 0 0.5rem; }
  .presets { display: flex; flex-wrap: wrap; gap: 0.4rem; }
  .presets button {
    border-radius: 999px;
    padding: 0.4rem 0.85rem;
    font-size: 0.88rem;
  }
  .presets button.active { background: var(--accent); border-color: var(--accent); color: #fff; }

  .more { margin-top: 0.8rem; color: var(--muted); font-size: 0.9rem; }
  .more summary { cursor: pointer; }

  .row { display: flex; gap: 0.5rem; margin-top: 0.6rem; flex-wrap: wrap; }
  .row input, .row select { flex: 1; min-width: 140px; }

  .side { display: flex; flex-direction: column; min-height: 0; }
  .file { display: block; margin-top: 0.8rem; font-size: 0.85rem; }
  .file input { display: block; margin-top: 0.3rem; width: 100%; }
  .msg { color: var(--muted); font-size: 0.9rem; display: flex; align-items: center; gap: 0.5rem; }
  .count { color: var(--muted); font-size: 0.8rem; margin: 0.5rem 0 0; }
  .check { display: flex; gap: 0.5rem; align-items: center; font-size: 0.85rem; color: var(--muted); margin-top: 0.6rem; }
  .check input { width: auto; }

  .cors {
    margin-top: 0.8rem;
    padding: 0.8rem 1rem;
    border-radius: 10px;
    background: rgba(255, 209, 102, 0.08);
    border: 1px solid rgba(255, 209, 102, 0.35);
    font-size: 0.88rem;
  }
  .cors strong { color: #ffd166; }
  .cors p { margin: 0.4rem 0; color: var(--muted); }
  .cors ol { margin: 0.4rem 0 0.7rem; padding-left: 1.2rem; display: flex; flex-direction: column; gap: 0.4rem; }
  .cors a { color: #8ab4ff; }
  .cors input { display: block; margin-top: 0.3rem; width: 100%; }

  .channels {
    list-style: none;
    margin: 0.4rem 0 0;
    padding: 0;
    overflow-y: auto;
    max-height: 60vh;
  }
  .channels button {
    width: 100%;
    display: flex;
    align-items: center;
    gap: 0.6rem;
    text-align: left;
    background: transparent;
    border: 0;
    border-radius: 6px;
    padding: 0.4rem;
  }
  .channels button:hover, .channels button:focus-visible { background: var(--surface-2); }
  .channels button.active { background: var(--accent); color: #fff; }
  .channels img, .nologo {
    width: 40px; height: 40px; object-fit: contain; flex-shrink: 0;
    border-radius: 4px; background: var(--surface-2);
  }
  .nologo { display: grid; place-items: center; font-size: 0.8rem; text-transform: uppercase; color: var(--muted); }
  .name { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; flex: 1; min-width: 0; }
  .grp { font-size: 0.7rem; color: var(--muted); white-space: nowrap; max-width: 35%; overflow: hidden; text-overflow: ellipsis; }
  .channels button.active .grp { color: #fff; }
  .showmore { margin-top: 0.5rem; }

  .spinner {
    width: 16px; height: 16px; flex-shrink: 0;
    border: 3px solid var(--surface-2);
    border-top-color: var(--accent);
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
  }
  @keyframes spin { to { transform: rotate(360deg); } }

  .dropzone {
    position: fixed;
    inset: 0;
    z-index: 60;
    display: grid;
    place-items: center;
    font-size: 1.4rem;
    font-weight: 600;
    background: rgba(15, 17, 23, 0.85);
    border: 4px dashed var(--accent);
    pointer-events: none;
  }
</style>
