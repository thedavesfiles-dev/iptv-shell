<script>
  // Ficha de una película o serie (se abre como ventana sobre la cuadrícula).
  import { getDetails, img } from '../api/tmdb.js';
  import { resolveSources, resolveUrl } from '../sources/resolve.js';
  import MultiPlayer from '../player/MultiPlayer.svelte';
  import SeasonBrowser from './SeasonBrowser.svelte';

  let { item, onclose } = $props();

  let details = $state(null);
  let error = $state('');
  let playUrl = $state('');
  let playing = $state(null); // { sources, title, episode? }
  let notFound = $state('');
  let resolving = $state(false);
  let closeBtn = $state(null);
  let playerBox = $state(null);

  // Mientras llega la ficha completa, mostramos los datos básicos de la cuadrícula
  const d = $derived(details || item);

  $effect(() => {
    const ctrl = new AbortController();
    details = null;
    error = '';
    playing = null;
    getDetails(item.type, item.id, { signal: ctrl.signal })
      .then((res) => (details = res))
      .catch((e) => { if (e.name !== 'AbortError') error = e.message; });
    return () => ctrl.abort();
  });

  $effect(() => {
    closeBtn?.focus(); // foco inicial (control remoto / teclado)
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden'; // evita que se desplace la página de fondo
    return () => (document.body.style.overflow = prev);
  });

  function onKey(e) {
    if (e.key === 'Escape' || (e.key === 'Backspace' && e.target === document.body)) onclose?.();
  }

  function playTrailer() {
    notFound = '';
    playing = {
      sources: [{
        src: `https://www.youtube-nocookie.com/embed/${details.trailerKey}?autoplay=1`,
        type: 'iframe',
        label: 'Tráiler',
        provider: 'YouTube'
      }],
      title: `Tráiler · ${d.title}`
    };
    showPlayer();
  }

  // URL pegada por el usuario: video directo, o página analizada por el scraper genérico
  async function playFromUrl(e) {
    e.preventDefault();
    const url = playUrl.trim();
    if (!url) return;
    resolving = true;
    notFound = '';
    try {
      playing = { sources: await resolveUrl(url), title: d.title };
      showPlayer();
    } finally {
      resolving = false;
    }
  }

  // Lleva el reproductor a la vista (útil en celular, donde queda abajo)
  function showPlayer() {
    requestAnimationFrame(() => playerBox?.scrollIntoView({ behavior: 'smooth', block: 'center' }));
  }

  // Consulta a todos los proveedores registrados (src/sources/providers)
  async function play(extra = {}) {
    resolving = true;
    notFound = '';
    try {
      const res = await resolveSources({
        type: d.type,
        tmdbId: d.id,
        imdbId: details?.imdbId,
        title: d.title,
        originalTitle: d.originalTitle,
        year: d.year,
        ...extra
      });
      if (!res.sources.length) {
        playing = null;
        notFound = res.tried.length
          ? `No se encontró «${res.label}» en: ${res.tried.join(', ')}.`
          : `Ningún proveedor configurado puede buscar «${res.label}».`;
        return;
      }
      playing = {
        sources: res.sources,
        title: res.label,
        episode: extra.season != null ? extra : null
      };
      showPlayer();
    } catch (e) {
      notFound = `Error al buscar fuentes: ${e.message}`;
    } finally {
      resolving = false;
    }
  }

  const playEpisode = (ep) => play({ season: ep.season, episode: ep.number });

  function fmtRuntime(min) {
    if (!min) return '';
    const h = Math.floor(min / 60);
    const m = min % 60;
    return h ? `${h} h ${m} min` : `${m} min`;
  }
</script>

<svelte:window onkeydown={onKey} />

<div class="backdrop" role="presentation" onclick={(e) => e.target === e.currentTarget && onclose?.()}>
  <div class="sheet" role="dialog" aria-modal="true" aria-label={d.title}>
    <header class="hero" style:background-image={d.backdrop ? `url(${img(d.backdrop, 'w1280')})` : 'none'}>
      <button class="close" bind:this={closeBtn} onclick={() => onclose?.()} aria-label="Cerrar">✕</button>
    </header>

    <div class="body">
      <div class="top">
        {#if d.poster}
          <img class="poster" src={img(d.poster, 'w342')} alt="" />
        {/if}
        <div class="info">
          <h2>{d.title}</h2>
          {#if d.originalTitle && d.originalTitle !== d.title}
            <p class="orig">{d.originalTitle}</p>
          {/if}
          <p class="facts">
            {[
              d.type === 'tv' ? 'Serie' : 'Película',
              d.year,
              fmtRuntime(details?.runtime),
              details?.seasons ? `${details.seasons} temporada${details.seasons > 1 ? 's' : ''}` : ''
            ].filter(Boolean).join(' · ')}
          </p>
          {#if d.rating}
            <p class="rating">★ {d.rating.toFixed(1)} <small>({d.votes.toLocaleString('es')} votos)</small></p>
          {/if}
          {#if details?.genres?.length}
            <ul class="chips">
              {#each details.genres as g (g)}<li>{g}</li>{/each}
            </ul>
          {/if}
        </div>
      </div>

      {#if details?.tagline}<p class="tagline">“{details.tagline}”</p>{/if}
      <p class="overview">{d.overview || 'Sin sinopsis disponible en español.'}</p>

      {#if error}<p class="error">⚠ {error}</p>{/if}

      <div class="actions">
        {#if d.type === 'movie'}
          <button class="primary" onclick={() => play()} disabled={resolving}>
            {resolving ? 'Buscando…' : '▶ Reproducir'}
          </button>
        {/if}
        {#if details?.trailerKey}
          <button class={d.type === 'movie' ? '' : 'primary'} onclick={() => { playTrailer(); showPlayer(); }}>🎞 Ver tráiler</button>
        {/if}
      </div>

      {#if resolving}
        <p class="status">Buscando fuentes…</p>
      {/if}
      {#if notFound}
        <p class="status warn">⚠ {notFound}</p>
      {/if}

      {#if playing}
        <div class="player" bind:this={playerBox}>
          <MultiPlayer sources={playing.sources} title={playing.title} poster={img(d.backdrop, 'w780')} />
        </div>
      {/if}

      {#if d.type === 'tv' && details?.seasonList?.length}
        <SeasonBrowser
          tvId={d.id}
          seasons={details.seasonList}
          activeEpisode={playing?.episode}
          onplay={playEpisode}
        />
      {/if}

      <details class="manual">
        <summary>Reproducir desde una URL propia</summary>
        <form class="urlform" onsubmit={playFromUrl}>
          <input bind:value={playUrl} placeholder="Pega una URL .m3u8 / .mp4" inputmode="url" />
          <button type="submit" disabled={resolving}>Reproducir</button>
        </form>
        <small>Acepta un .m3u8/.mp4 directo o una página: se buscará el video dentro; si no se puede leer, se abre la página embebida.</small>
      </details>

      {#if details?.cast?.length}
        <h3>Reparto</h3>
        <ul class="cast">
          {#each details.cast as c (c.id)}
            <li>
              {#if c.photo}
                <img src={img(c.photo, 'w185')} alt="" loading="lazy" />
              {:else}
                <div class="nophoto">{c.name.slice(0, 1)}</div>
              {/if}
              <strong>{c.name}</strong>
              <small>{c.character}</small>
            </li>
          {/each}
        </ul>
      {/if}
    </div>
  </div>
</div>

<style>
  .backdrop {
    position: fixed;
    inset: 0;
    z-index: 50;
    background: rgba(0, 0, 0, 0.7);
    display: flex;
    justify-content: center;
    align-items: flex-start;
    overflow-y: auto;
    padding: 2rem 1rem;
  }
  .sheet {
    width: 100%;
    max-width: 920px;
    background: var(--surface);
    border-radius: 14px;
    overflow: hidden;
    box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
  }
  .hero {
    position: relative;
    height: 260px;
    background: var(--surface-2) center / cover no-repeat;
  }
  .hero::after {
    content: '';
    position: absolute;
    inset: 0;
    background: linear-gradient(to bottom, transparent 40%, var(--surface));
  }
  .close {
    position: absolute;
    top: 0.8rem;
    right: 0.8rem;
    z-index: 1;
    width: 40px;
    height: 40px;
    border-radius: 50%;
    border: 0;
    background: rgba(0, 0, 0, 0.6);
    font-size: 1.1rem;
  }

  .body { padding: 0 1.5rem 1.5rem; margin-top: -90px; position: relative; }
  .top { display: flex; gap: 1.2rem; align-items: flex-end; }
  .poster {
    width: 150px;
    aspect-ratio: 2 / 3;
    object-fit: cover;
    border-radius: 10px;
    flex-shrink: 0;
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.5);
  }
  .info { min-width: 0; }
  h2 { margin: 0; font-size: 1.7rem; line-height: 1.15; }
  .orig { margin: 0.2rem 0 0; color: var(--muted); font-style: italic; }
  .facts { margin: 0.4rem 0 0; color: var(--muted); }
  .rating { margin: 0.3rem 0 0; color: #ffd166; font-weight: 600; }
  .rating small { color: var(--muted); font-weight: 400; }

  .chips { list-style: none; padding: 0; margin: 0.6rem 0 0; display: flex; flex-wrap: wrap; gap: 0.35rem; }
  .chips li { font-size: 0.78rem; padding: 0.2rem 0.6rem; border-radius: 999px; background: var(--surface-2); }

  .tagline { margin: 1.2rem 0 0; color: var(--muted); font-style: italic; }
  .overview { line-height: 1.55; margin: 0.8rem 0 0; }
  .error { color: #ffb4b4; }

  .actions { display: flex; flex-wrap: wrap; gap: 0.6rem; margin-top: 1.2rem; }
  .primary { background: var(--accent); border-color: var(--accent); color: #fff; font-weight: 600; }
  .status { margin: 0.8rem 0 0; color: var(--muted); font-size: 0.9rem; }
  .status.warn { color: #ffd166; }
  .manual small { display: block; margin-top: 0.4rem; }
  .manual { margin-top: 1.4rem; color: var(--muted); font-size: 0.9rem; }
  .manual summary { cursor: pointer; }
  .manual .urlform { margin-top: 0.6rem; }
  .urlform { display: flex; gap: 0.5rem; flex: 1; min-width: 260px; }
  .urlform input { flex: 1; min-width: 0; }

  .player { margin-top: 1rem; }

  h3 { margin: 1.6rem 0 0.6rem; font-size: 1.05rem; }
  .cast {
    list-style: none;
    padding: 0 0 0.4rem;
    margin: 0;
    display: flex;
    gap: 0.8rem;
    overflow-x: auto;
  }
  .cast li { width: 92px; flex-shrink: 0; display: flex; flex-direction: column; gap: 0.2rem; }
  .cast img, .nophoto {
    width: 92px;
    height: 120px;
    object-fit: cover;
    border-radius: 8px;
    background: var(--surface-2);
  }
  .nophoto { display: grid; place-items: center; font-size: 1.5rem; color: var(--muted); }
  .cast strong { font-size: 0.8rem; line-height: 1.2; }
  .cast small { font-size: 0.72rem; color: var(--muted); line-height: 1.2; }

  @media (max-width: 600px) {
    .backdrop { padding: 0; }
    .sheet { border-radius: 0; min-height: 100%; }
    .hero { height: 200px; }
    .body { padding: 0 1rem 1.5rem; margin-top: -70px; }
    .poster { width: 100px; }
    h2 { font-size: 1.3rem; }
  }
</style>
