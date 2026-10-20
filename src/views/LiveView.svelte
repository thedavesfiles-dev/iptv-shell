<script>
  // Pestaña "Canales en Vivo": carga listas M3U y reproduce canales.
  import Player from '../player/Player.svelte';
  import { loadM3UFromUrl, loadM3UFromFile, filterChannels } from '../playlists/m3uParser.js';
  import { live } from '../stores/live.svelte.js';

  // Stream público de prueba (contenido de demostración de Mux)
  const DEMO_STREAM = 'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8';

  let directUrl = $state('');
  let loading = $state(false);

  const visible = $derived(filterChannels(live.channels, { group: live.group, query: live.query }));

  function applyPlaylist(result) {
    live.channels = result.channels;
    live.groups = result.groups;
    live.group = '';
    live.message = `${result.channels.length} canales cargados en ${result.groups.length} grupos`;
  }

  async function loadFromUrl() {
    if (!live.playlistUrl.trim()) return;
    loading = true;
    live.message = '';
    try {
      applyPlaylist(await loadM3UFromUrl(live.playlistUrl.trim()));
    } catch (err) {
      live.message = `Error: ${err.message}. Si es CORS, descarga el .m3u y ábrelo como archivo.`;
    } finally {
      loading = false;
    }
  }

  async function loadFromFile(e) {
    const file = e.currentTarget.files?.[0];
    if (!file) return;
    try {
      applyPlaylist(await loadM3UFromFile(file));
    } catch (err) {
      live.message = `Error al leer el archivo: ${err.message}`;
    }
  }

  function playDirect(url = directUrl) {
    if (!url.trim()) return;
    live.current = { id: 'direct', name: 'Reproducción directa', url: url.trim(), logo: '' };
  }
</script>

<section class="layout">
  <div class="stage">
    <Player src={live.current?.url} title={live.current?.name} />

    <form class="row" onsubmit={(e) => { e.preventDefault(); playDirect(); }}>
      <input bind:value={directUrl} placeholder="Pega una URL .m3u8 o .mp4" inputmode="url" />
      <button type="submit">Reproducir</button>
      <button type="button" class="ghost" onclick={() => playDirect(DEMO_STREAM)}>Stream de prueba</button>
    </form>
  </div>

  <aside class="side">
    <form class="row" onsubmit={(e) => { e.preventDefault(); loadFromUrl(); }}>
      <input bind:value={live.playlistUrl} placeholder="URL de lista .m3u" inputmode="url" />
      <button type="submit" disabled={loading}>{loading ? 'Cargando…' : 'Cargar'}</button>
    </form>

    <label class="file">
      o abre un archivo .m3u
      <input type="file" accept=".m3u,.m3u8,audio/x-mpegurl,application/vnd.apple.mpegurl,text/plain" onchange={loadFromFile} />
    </label>

    {#if live.message}<p class="msg">{live.message}</p>{/if}

    {#if live.channels.length}
      <div class="row">
        <select bind:value={live.group}>
          <option value="">Todos los grupos</option>
          {#each live.groups as g (g)}<option value={g}>{g}</option>{/each}
        </select>
        <input bind:value={live.query} placeholder="Buscar canal" type="search" />
      </div>

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
            </button>
          </li>
        {/each}
      </ul>
    {/if}
  </aside>
</section>

<style>
  .layout {
    max-width: 1400px;
    margin: 0 auto;
    padding: 1rem;
    display: grid;
    gap: 1rem;
    grid-template-columns: 1fr;
  }
  @media (min-width: 900px) { .layout { grid-template-columns: 2fr 1fr; } }

  .row { display: flex; gap: 0.5rem; margin-top: 0.6rem; flex-wrap: wrap; }
  .row input, .row select { flex: 1; min-width: 140px; }

  .side { display: flex; flex-direction: column; min-height: 0; }
  .file { display: block; margin-top: 0.8rem; color: var(--muted); font-size: 0.9rem; }
  .file input { display: block; margin-top: 0.3rem; width: 100%; }
  .msg { color: var(--muted); font-size: 0.9rem; }

  .channels {
    list-style: none;
    margin: 0.6rem 0 0;
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
  .name { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
</style>
