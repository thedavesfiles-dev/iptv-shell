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
  <h2>♥ Mis Canales Favoritos</h2>
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

  <aside class="side">
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
        {#each visible as ch (ch.id)}
          <li class:active={live.current?.url === ch.url}>
            <button class="ch" onclick={() => (live.current = ch)}>
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
  .favs { max-width: 1400px; margin: 0 auto; padding: 1rem 1rem 0; }
  .favs h2, .side h2 { font-size: 1rem; margin: 0 0 0.5rem; }
  .hint { color: var(--muted); font-size: 0.88rem; margin: 0; }
  .favrow { list-style: none; margin: 0; padding: 0 0 0.3rem; display: flex; gap: 0.5rem; overflow-x: auto; }
  .favchip {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    max-width: 220px;
    padding: 0.35rem 0.8rem 0.35rem 0.35rem;
    border-radius: 999px;
    white-space: nowrap;
  }
  .favchip span:last-child { overflow: hidden; text-overflow: ellipsis; }
  .favchip img, .favchip .nologo { width: 30px; height: 30px; border-radius: 50%; object-fit: contain; background: var(--bg); flex-shrink: 0; }
  .favchip.active { background: var(--accent); border-color: var(--accent); color: #fff; }

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

  .source { display: flex; align-items: center; gap: 0.5rem; font-weight: 600; }
  .source select { flex: 1; min-width: 0; font-weight: 400; }
  .listactions { display: flex; flex-wrap: wrap; gap: 0.4rem; margin-top: 0.6rem; }
  .listactions button { font-size: 0.85rem; padding: 0.4rem 0.7rem; }
  .danger { color: #ff8a8a; }

  .saveform {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    margin-top: 0.7rem;
    padding: 0.8rem;
    border-radius: 10px;
    background: var(--surface);
    border: 1px solid var(--surface-2);
  }
  .modes { display: flex; gap: 1rem; font-size: 0.9rem; }
  .modes label { display: flex; gap: 0.3rem; align-items: center; }
  .modes input { width: auto; }
  .formerror { color: #ffb4b4; margin: 0; font-size: 0.85rem; }
  .note { color: var(--muted); }
  .primary { background: var(--accent); border-color: var(--accent); color: #fff; font-weight: 600; }

  .row { display: flex; gap: 0.5rem; margin-top: 0.6rem; flex-wrap: wrap; }
  .row input, .row select { flex: 1; min-width: 140px; }

  .side { display: flex; flex-direction: column; min-height: 0; }
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
  .channels li { display: flex; align-items: center; gap: 0.2rem; border-radius: 6px; }
  .channels li:hover { background: var(--surface-2); }
  .channels li.active { background: var(--accent); color: #fff; }
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
    border-radius: 6px;
    padding: 0.4rem;
    color: inherit;
  }
  .channels img, .nologo {
    width: 40px; height: 40px; object-fit: contain; flex-shrink: 0;
    border-radius: 4px; background: var(--surface-2);
  }
  .nologo { display: grid; place-items: center; font-size: 0.8rem; text-transform: uppercase; color: var(--muted); }
  .name { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; flex: 1; min-width: 0; }
  .grp { font-size: 0.7rem; color: var(--muted); white-space: nowrap; max-width: 35%; overflow: hidden; text-overflow: ellipsis; }
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
    font-size: 1.4rem;
    font-weight: 600;
    background: rgba(15, 17, 23, 0.85);
    border: 4px dashed var(--accent);
    pointer-events: none;
  }
</style>
