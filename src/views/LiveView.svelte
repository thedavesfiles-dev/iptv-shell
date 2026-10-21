<script>
  // Pestaña "Canales en Vivo": favoritos, mis listas guardadas, fuentes comunitarias,
  // archivo temporal (arrastrar y soltar) y reproducción directa.
  import Player from '../player/Player.svelte';
  import FavButton from '../components/FavButton.svelte';
  import { loadM3UFromUrl, loadM3UFromFile, filterChannels } from '../playlists/m3uParser.js';
  import { presets, loadPresets, getPreset, defaultPresetId } from '../playlists/presets.svelte.js';
  import { live } from '../stores/live.svelte.js';
  import { myLists, addList, openList, getList, renameList, removeList } from '../stores/playlists.svelte.js';
  import { favorites, isFavChannel, toggleChannel } from '../stores/favorites.svelte.js';
  import { load, save } from '../lib/storage.js';

  const DEMO_STREAM = 'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8';
  const PAGE_SIZE = 200;
  const SOURCE_KEY = 'iptv-shell:source';
  const pageIsHttps = location.protocol === 'https:';

  let directUrl = $state('');
  let loading = $state(false);
  let failed = $state(null);        // { name, url } si una lista no se pudo descargar
  let dragging = $state(false);
  let limit = $state(PAGE_SIZE);
  let tempFile = $state(null);      // archivo abierto sin guardar (para ofrecer "Guardar")

  // Formulario "Guardar lista"
  let showForm = $state(false);
  let formName = $state('');
  let formMode = $state('url');     // 'url' | 'file'
  let formUrl = $state('');
  let formFile = $state(null);
  let formError = $state('');
  let saving = $state(false);

  const filtered = $derived(
    filterChannels(live.channels, { group: live.group, query: live.query }).filter(
      (c) => !(live.onlyHttps && pageIsHttps && c.url.startsWith('http://'))
    )
  );
  const visible = $derived(filtered.slice(0, limit));
  const httpCount = $derived(live.channels.filter((c) => c.url.startsWith('http://')).length);
  const currentList = $derived(live.sourceId.startsWith('list:') ? getList(live.sourceId.slice(5)) : null);

  $effect(() => {
    live.group; live.query; live.onlyHttps;
    limit = PAGE_SIZE;
  });

  function applyPlaylist(result, sourceId, sourceName) {
    live.channels = result.channels;
    live.groups = result.groups;
    live.group = '';
    live.query = '';
    live.sourceId = sourceId;
    live.sourceName = sourceName;
    failed = null;
    if (sourceId !== 'temp') {
      tempFile = null;
      save(SOURCE_KEY, sourceId);
    }
    const http = result.channels.filter((c) => c.url.startsWith('http://')).length;
    live.message =
      `${sourceName}: ${result.channels.length} canales en ${result.groups.length} grupos` +
      (pageIsHttps && http ? ` · ${http} usan http:// (bloqueados en la web)` : '');
  }

  /** Abre cualquier fuente: 'preset:es', 'list:<id>' */
  async function openSource(sourceId) {
    if (!sourceId || sourceId === 'temp') return;
    let name = '';
    let url = '';
    loading = true;
    failed = null;
    try {
      let result;
      if (sourceId.startsWith('preset:')) {
        const p = getPreset(sourceId.slice(7));
        if (!p) throw new Error('Fuente desconocida');
        name = p.name;
        url = p.url;
        live.message = `Descargando ${name}…`;
        result = await loadM3UFromUrl(url);
      } else {
        const list = getList(sourceId.slice(5));
        if (!list) throw new Error('La lista ya no existe');
        name = list.name;
        url = list.url || '';
        live.message = `Abriendo ${name}…`;
        result = await openList(list.id);
      }
      applyPlaylist(result, sourceId, name);
      return true;
    } catch (err) {
      console.warn('[live] no se pudo abrir', sourceId, err);
      failed = { sourceId, name: name || 'la lista', url, reason: err.message };
      live.message = '';
      return false;
    } finally {
      loading = false;
    }
  }

  async function openTempFile(file) {
    if (!file) return;
    try {
      applyPlaylist(await loadM3UFromFile(file), 'temp', file.name);
      tempFile = file;
    } catch (err) {
      live.message = `Error al leer el archivo: ${err.message}`;
    }
  }

  function openForm(prefill = {}) {
    formName = prefill.name || '';
    formMode = prefill.file ? 'file' : 'url';
    formUrl = prefill.url || '';
    formFile = prefill.file || null;
    formError = '';
    showForm = true;
  }

  async function submitForm(e) {
    e.preventDefault();
    formError = '';
    if (formMode === 'url' && !/^https?:\/\//i.test(formUrl.trim())) {
      formError = 'Escribe una URL que empiece con http:// o https://';
      return;
    }
    if (formMode === 'file' && !formFile) {
      formError = 'Elige un archivo .m3u';
      return;
    }
    saving = true;
    try {
      const { list, result, error } = await addList({
        name: formName.trim(),
        url: formMode === 'url' ? formUrl.trim() : undefined,
        file: formMode === 'file' ? formFile : undefined
      });
      showForm = false;
      if (result) applyPlaylist(result, `list:${list.id}`, list.name);
      else {
        live.sourceId = `list:${list.id}`;
        save(SOURCE_KEY, live.sourceId);
        failed = { sourceId: `list:${list.id}`, name: list.name, url: list.url, reason: error?.message };
      }
    } catch (err) {
      formError = err.message;
    } finally {
      saving = false;
    }
  }

  function renameCurrent() {
    if (!currentList) return;
    const name = prompt('Nuevo nombre de la lista:', currentList.name);
    if (name) {
      renameList(currentList.id, name);
      live.sourceName = name.trim();
    }
  }

  async function deleteCurrent() {
    if (!currentList) return;
    if (!confirm(`¿Eliminar «${currentList.name}» de Mis listas?`)) return;
    await removeList(currentList.id);
    live.sourceId = '';
    save(SOURCE_KEY, '');
    live.message = 'Lista eliminada. Elige otra fuente.';
  }

  function onDrop(e) {
    e.preventDefault();
    dragging = false;
    openTempFile(e.dataTransfer?.files?.[0]);
  }

  function playDirect(url = directUrl) {
    if (!url.trim()) return;
    live.current = { id: 'direct', name: 'Reproducción directa', url: url.trim(), logo: '' };
  }

  // Al entrar: abre la última fuente usada (o "En español" la primera vez). Un solo intento.
  let autoTried = false;
  $effect(() => {
    if (autoTried || live.channels.length) return;
    autoTried = true;
    loadPresets().then(() => {
      const last = load(SOURCE_KEY, '');
      const valid =
        (last.startsWith?.('preset:') && getPreset(last.slice(7))) ||
        (last.startsWith?.('list:') && getList(last.slice(5)));
      openSource(valid ? last : `preset:${defaultPresetId()}`);
    });
  });
</script>

<svelte:window
  ondragover={(e) => { e.preventDefault(); dragging = true; }}
  ondragleave={(e) => { if (!e.relatedTarget) dragging = false; }}
  ondrop={onDrop}
/>

<!-- ♥ Favoritos: fila fija arriba -->
<section class="favs">
  <div class="sect"><span class="tag">♥</span><div class="label"><h2>Mis canales favoritos</h2><small>Acceso rápido</small></div></div>
  {#if favorites.channels.length}
    <ul class="favrow">
      {#each favorites.channels as ch (ch.url)}
        <li>
          <button class="favchip" class:active={live.current?.url === ch.url} onclick={() => (live.current = ch)} title={ch.name}>
            {#if ch.logo}
              <img src={ch.logo} alt="" loading="lazy" referrerpolicy="no-referrer"
                   onerror={(e) => (e.currentTarget.style.visibility = 'hidden')} />
            {:else}
              <span class="nologo">{ch.name.slice(0, 2)}</span>
            {/if}
            <span>{ch.name}</span>
          </button>
        </li>
      {/each}
    </ul>
  {:else}
    <p class="hint">Toca el ♡ junto a un canal para tenerlo siempre a mano aquí.</p>
  {/if}
</section>

<section class="layout">
  <div class="stage">
    <Player src={live.current?.url} title={live.current?.name} poster={live.current?.logo}>
      {#snippet actions()}
        {#if live.current && live.current.id !== 'direct'}
          <FavButton size="sm" active={isFavChannel(live.current.url)} label={live.current.name}
                     onclick={() => toggleChannel(live.current)} />
        {/if}
      {/snippet}
    </Player>

    <form class="row" onsubmit={(e) => { e.preventDefault(); playDirect(); }}>
      <input bind:value={directUrl} placeholder="Pega una URL .m3u8 o .mp4" inputmode="url" />
      <button type="submit">Reproducir</button>
      <button type="button" class="ghost" onclick={() => playDirect(DEMO_STREAM)}>Stream de prueba</button>
    </form>
  </div>

  <aside class="side panel">
    <div class="sidehead">
      <span class="live-tag">En vivo</span>
      <span class="sidetitle">Guía de canales</span>
    </div>
    <!-- Selector de fuente -->
    <label class="source">
      <span>Lista</span>
      <select value={live.sourceId} disabled={loading} onchange={(e) => openSource(e.currentTarget.value)}>
        {#if !live.sourceId}<option value="" disabled>Elige una lista…</option>{/if}
        {#if live.sourceId === 'temp'}<option value="temp">📄 {live.sourceName} (sin guardar)</option>{/if}
        {#if myLists.items.length}
          <optgroup label="Mis listas">
            {#each myLists.items as l (l.id)}
              <option value={`list:${l.id}`}>{l.kind === 'file' ? '📄' : '🔗'} {l.name}</option>
            {/each}
          </optgroup>
        {/if}
        <optgroup label="Fuentes Comunitarias">
          {#each presets.items as p (p.id)}
            <option value={`preset:${p.id}`}>{p.name}</option>
          {/each}
        </optgroup>
      </select>
    </label>

    <div class="listactions">
      <button onclick={() => (showForm ? (showForm = false) : openForm())}>{showForm ? 'Cancelar' : '＋ Guardar lista'}</button>
      {#if currentList}
        <button class="ghost" onclick={renameCurrent}>Renombrar</button>
        <button class="ghost danger" onclick={deleteCurrent}>Eliminar</button>
      {/if}
      {#if live.sourceId === 'temp' && tempFile}
        <button class="ghost" onclick={() => openForm({ name: tempFile.name.replace(/\.m3u8?$/i, ''), file: tempFile })}>💾 Guardar esta lista</button>
      {/if}
    </div>

    {#if showForm}
      <form class="saveform" onsubmit={submitForm}>
        <input bind:value={formName} placeholder="Nombre (ej. Canales de la casa)" maxlength="60" />
        <div class="modes" role="radiogroup" aria-label="Origen de la lista">
          <label><input type="radio" bind:group={formMode} value="url" /> Por URL</label>
          <label><input type="radio" bind:group={formMode} value="file" /> Archivo .m3u</label>
        </div>
        {#if formMode === 'url'}
          <input bind:value={formUrl} placeholder="https://…/lista.m3u" inputmode="url" />
        {:else}
          <input type="file" accept=".m3u,.m3u8,audio/x-mpegurl,application/vnd.apple.mpegurl,text/plain"
                 onchange={(e) => (formFile = e.currentTarget.files?.[0] || null)} />
          {#if formFile}<small>{formFile.name}</small>{/if}
        {/if}
        {#if formError}<p class="formerror">{formError}</p>{/if}
        <button type="submit" class="primary" disabled={saving}>{saving ? 'Guardando…' : 'Guardar en Mis listas'}</button>
        <small class="note">Se guarda solo en este dispositivo.</small>
      </form>
    {/if}

    {#if loading}
      <p class="msg"><span class="spinner"></span> {live.message}</p>
    {:else if failed}
      <div class="cors">
        <strong>No se pudo abrir «{failed.name}»</strong>
        <p>
          {#if failed.url}
            Puede que el servidor bloquee la descarga desde el navegador (CORS) o que no haya conexión.
          {:else}
            {failed.reason}
          {/if}
        </p>
        {#if failed.url}
          <ol>
            <li><a href={failed.url} target="_blank" rel="noopener" download>Descarga el archivo .m3u</a> y guárdalo.</li>
            <li>Arrástralo a esta ventana o elígelo aquí:
              <input type="file" accept=".m3u,.m3u8,text/plain" onchange={(e) => openTempFile(e.currentTarget.files?.[0])} />
            </li>
          </ol>
        {/if}
        <button onclick={() => openSource(failed.sourceId)}>Reintentar</button>
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
        {#each visible as ch, i (ch.id)}
          <li class:active={live.current?.url === ch.url}>
            <button class="ch" onclick={() => (live.current = ch)}>
              <span class="num">{String(i + 1).padStart(2, '0')}</span>
              {#if ch.logo}
                <img src={ch.logo} alt="" loading="lazy" referrerpolicy="no-referrer"
                     onerror={(e) => (e.currentTarget.style.visibility = 'hidden')} />
              {:else}
                <span class="nologo">{ch.name.slice(0, 2)}</span>
              {/if}
              <span class="name">{ch.name}</span>
              {#if ch.group && !live.group}<span class="grp">{ch.group}</span>{/if}
            </button>
            <FavButton size="sm" active={isFavChannel(ch.url)} label={ch.name} onclick={() => toggleChannel(ch)} />
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
  .favs { max-width: 1400px; margin: 0 auto; padding: 0.6rem 1rem 0; }
  .favs .sect { margin-top: 0.6rem; }
  .hint { color: var(--muted); font-size: 0.88rem; margin: 0; }
  .favrow { list-style: none; margin: 0; padding: 0 0 0.4rem; display: flex; gap: 0.5rem; overflow-x: auto; }
  .favchip {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    max-width: 240px;
    height: 46px;
    padding: 0 0.9rem 0 0.35rem;
    white-space: nowrap;
    font-style: italic;
    font-size: 1rem;
    clip-path: polygon(0 0, 100% 0, calc(100% - 8px) 100%, 0 100%);
  }
  .favchip span:last-child { overflow: hidden; text-overflow: ellipsis; }
  .favchip img, .favchip .nologo { width: 36px; height: 36px; object-fit: contain; background: #fff; border-radius: 2px; flex-shrink: 0; }
  .favchip .nologo { background: var(--surface-3); }
  .favchip.active { background: var(--red-bg); border-color: #ff6a5a; color: #fff; box-shadow: var(--red-shadow); }

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
    .stage { position: sticky; top: 76px; }
  }

  /* Panel lateral = guía de canales */
  .side { display: flex; flex-direction: column; min-height: 0; padding: 0 0.8rem 0.8rem; }
  .sidehead {
    display: flex;
    align-items: center;
    gap: 0.6rem;
    margin: 0 -0.8rem 0.8rem;
    padding: 0.55rem 0.8rem;
    border-bottom: 3px solid var(--accent);
    background: linear-gradient(180deg, rgba(255, 255, 255, 0.06), transparent);
  }
  .sidetitle {
    font-family: var(--font-display);
    font-weight: 900;
    font-style: italic;
    font-size: 1.35rem;
    text-transform: uppercase;
  }

  .source { display: flex; align-items: center; gap: 0.5rem; }
  .source span { font-family: var(--font-display); font-weight: 800; font-style: italic; text-transform: uppercase; letter-spacing: 0.06em; color: var(--muted); }
  .source select { flex: 1; min-width: 0; }
  .listactions { display: flex; flex-wrap: wrap; gap: 0.4rem; margin-top: 0.6rem; }
  .listactions button { font-size: 0.85rem; padding: 0.4rem 0.7rem; }
  .danger { color: #ff8a8a; }

  .saveform {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    margin-top: 0.7rem;
    padding: 0.8rem;
    border-radius: 3px;
    background: rgba(0, 0, 0, 0.25);
    border: 1px solid #2e3d5c;
    border-left: 3px solid var(--accent);
  }
  .modes { display: flex; gap: 1rem; font-size: 0.9rem; }
  .modes label { display: flex; gap: 0.3rem; align-items: center; }
  .modes input { width: auto; }
  .formerror { color: #ffb4b4; margin: 0; font-size: 0.85rem; }
  .note { color: var(--muted); }

  .row { display: flex; gap: 0.5rem; margin-top: 0.6rem; flex-wrap: wrap; }
  .row input, .row select { flex: 1; min-width: 140px; }

  .msg { color: var(--muted); font-size: 0.9rem; display: flex; align-items: center; gap: 0.5rem; }
  .count {
    margin: 0.6rem 0 0;
    font-family: var(--font-display);
    font-weight: 800;
    font-style: italic;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    color: var(--gold);
  }
  .check { display: flex; gap: 0.5rem; align-items: center; font-size: 0.85rem; color: var(--muted); margin-top: 0.6rem; }
  .check input { width: auto; }

  .cors {
    margin-top: 0.8rem;
    padding: 0.8rem 1rem;
    border-radius: 3px;
    background: rgba(255, 197, 49, 0.08);
    border: 1px solid rgba(255, 197, 49, 0.35);
    border-left: 4px solid var(--gold);
    font-size: 0.88rem;
  }
  .cors strong { color: var(--gold); }
  .cors p { margin: 0.4rem 0; color: var(--muted); }
  .cors ol { margin: 0.4rem 0 0.7rem; padding-left: 1.2rem; display: flex; flex-direction: column; gap: 0.4rem; }
  .cors a { color: #8ab4ff; }
  .cors input { display: block; margin-top: 0.3rem; width: 100%; }

  /* Lista de canales tipo tabla de marcador */
  .channels {
    list-style: none;
    margin: 0.4rem 0 0;
    padding: 0;
    overflow-y: auto;
    max-height: 60vh;
    border: 1px solid #22304d;
  }
  .channels li { display: flex; align-items: center; gap: 0.2rem; padding-right: 0.3rem; border-bottom: 1px solid #1a2540; }
  .channels li:nth-child(even) { background: rgba(255, 255, 255, 0.025); }
  .channels li:hover { background: rgba(47, 95, 184, 0.25); }
  .channels li.active { background: var(--red-bg); box-shadow: var(--red-shadow); color: #fff; }
  .channels li.active :global(.fav) { color: #fff; }
  .ch {
    flex: 1;
    min-width: 0;
    display: flex;
    align-items: center;
    gap: 0.6rem;
    text-align: left;
    background: transparent;
    border: 0;
    box-shadow: none;
    border-radius: 0;
    padding: 0.35rem 0.4rem;
    color: inherit;
    text-transform: none;
    letter-spacing: normal;
    font-family: var(--font);
    font-weight: 500;
  }
  .ch:hover { filter: none; }
  .num {
    width: 2.2rem;
    flex-shrink: 0;
    text-align: right;
    font-family: var(--font-display);
    font-weight: 900;
    font-style: italic;
    font-size: 1.2rem;
    color: var(--muted);
  }
  .channels li.active .num { color: #fff; }
  .channels img, .nologo {
    width: 40px; height: 40px; object-fit: contain; flex-shrink: 0;
    border-radius: 2px; background: rgba(255, 255, 255, 0.92);
  }
  .nologo {
    display: grid;
    place-items: center;
    background: var(--surface-3);
    font-family: var(--font-display);
    font-weight: 800;
    font-style: italic;
    font-size: 0.85rem;
    text-transform: uppercase;
    color: var(--muted);
  }
  .name {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    flex: 1;
    min-width: 0;
    font-family: var(--font-display);
    font-weight: 700;
    font-size: 1.05rem;
    text-transform: uppercase;
    letter-spacing: 0.02em;
  }
  .grp { font-size: 0.7rem; color: var(--muted); white-space: nowrap; max-width: 35%; overflow: hidden; text-overflow: ellipsis; text-transform: uppercase; letter-spacing: 0.05em; }
  .channels li.active .grp { color: #fff; }
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
    font-family: var(--font-display);
    font-weight: 900;
    font-style: italic;
    font-size: 2rem;
    text-transform: uppercase;
    background: rgba(6, 10, 20, 0.88);
    border: 4px dashed var(--accent);
    pointer-events: none;
  }
</style>
