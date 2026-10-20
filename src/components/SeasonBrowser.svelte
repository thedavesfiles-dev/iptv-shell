<script>
  // Selector de temporadas + lista de episodios de una serie.
  import { getSeason, img } from '../api/tmdb.js';

  let { tvId, seasons = [], activeEpisode = null, onplay } = $props();

  // Por defecto la primera temporada "normal" (la lista ya viene con Especiales al final)
  let selected = $state(seasons[0]?.number ?? 1);
  let season = $state(null);
  let loading = $state(false);
  let error = $state('');
  let expanded = $state(new Set()); // episodios con sinopsis desplegada
  let retry = $state(0);

  $effect(() => {
    const n = selected;
    retry; // permite reintentar la misma temporada
    const ctrl = new AbortController();
    loading = true;
    error = '';
    season = null;
    expanded = new Set();
    getSeason(tvId, n, { signal: ctrl.signal })
      .then((res) => (season = res))
      .catch((e) => { if (e.name !== 'AbortError') error = e.message; })
      .finally(() => { if (!ctrl.signal.aborted) loading = false; });
    return () => ctrl.abort();
  });

  function toggle(id) {
    const next = new Set(expanded);
    next.has(id) ? next.delete(id) : next.add(id);
    expanded = next;
  }

  function fmtDate(iso) {
    if (!iso) return '';
    return new Date(iso + 'T12:00:00').toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' });
  }

  const isFuture = (iso) => iso && new Date(iso + 'T23:59:59') > new Date();
</script>

<section class="seasons">
  <h3>Temporadas y episodios</h3>

  <div class="season-tabs" role="tablist" aria-label="Temporadas">
    {#each seasons as s (s.number)}
      <button
        role="tab"
        aria-selected={selected === s.number}
        class:active={selected === s.number}
        onclick={() => (selected = s.number)}
        title={`${s.episodeCount} episodios${s.year ? ' · ' + s.year : ''}`}
      >
        {s.number === 0 ? 'Especiales' : `Temporada ${s.number}`}
      </button>
    {/each}
  </div>

  {#if season?.overview}
    <p class="season-overview">{season.overview}</p>
  {/if}

  {#if error}
    <p class="error">⚠ {error} <button onclick={() => retry++}>Reintentar</button></p>
  {/if}

  {#if loading}
    <ul class="episodes">
      {#each Array(4) as _, i (i)}
        <li class="episode skeleton"><div class="thumb"></div><div class="lines"><span></span><span></span></div></li>
      {/each}
    </ul>
  {:else if season}
    <ul class="episodes">
      {#each season.episodes as ep (ep.id)}
        {@const active = activeEpisode && activeEpisode.season === ep.season && activeEpisode.episode === ep.number}
        <li class="episode" class:active>
          <button class="play" onclick={() => onplay?.(ep)} aria-label={`Reproducir episodio ${ep.number}: ${ep.title}`}>
            <div class="thumb">
              {#if ep.still}
                <img src={img(ep.still, 'w300')} alt="" loading="lazy" />
              {:else}
                <span class="noimg">E{ep.number}</span>
              {/if}
              <span class="playicon" aria-hidden="true">▶</span>
            </div>
          </button>

          <div class="text">
            <button class="title" onclick={() => onplay?.(ep)}>
              <span class="num">{ep.number}.</span> {ep.title}
            </button>
            <p class="meta">
              {[ep.runtime ? `${ep.runtime} min` : '', fmtDate(ep.airDate), ep.rating ? `★ ${ep.rating}` : '']
                .filter(Boolean).join(' · ')}
              {#if isFuture(ep.airDate)}<span class="soon">Próximamente</span>{/if}
            </p>
            {#if ep.overview}
              <p class="overview" class:open={expanded.has(ep.id)}>
                {ep.overview}
                {#if ep.overviewLang === 'en'}<span class="lang">EN</span>{/if}
              </p>
              {#if ep.overview.length > 140}
                <button class="more" onclick={() => toggle(ep.id)}>
                  {expanded.has(ep.id) ? 'Ver menos' : 'Ver más'}
                </button>
              {/if}
            {/if}
          </div>
        </li>
      {/each}
    </ul>
  {/if}
</section>

<style>
  .seasons { margin-top: 1.6rem; }
  h3 { margin: 0 0 0.7rem; font-size: 1.05rem; }

  .season-tabs {
    display: flex;
    gap: 0.4rem;
    overflow-x: auto;
    padding-bottom: 0.4rem;
    scrollbar-width: thin;
  }
  .season-tabs button {
    flex-shrink: 0;
    border-radius: 999px;
    padding: 0.4rem 0.9rem;
    background: var(--surface-2);
    border: 1px solid transparent;
    color: var(--muted);
    font-size: 0.9rem;
  }
  .season-tabs button.active { background: var(--text); color: var(--bg); font-weight: 600; }

  .season-overview { color: var(--muted); font-size: 0.9rem; line-height: 1.5; margin: 0.6rem 0 0; }
  .error { color: #ffb4b4; }

  .episodes { list-style: none; padding: 0; margin: 0.8rem 0 0; display: flex; flex-direction: column; gap: 0.4rem; }
  .episode {
    display: flex;
    gap: 0.9rem;
    padding: 0.6rem;
    border-radius: 10px;
  }
  .episode:hover { background: var(--surface-2); }
  .episode.active { background: color-mix(in srgb, var(--accent) 18%, transparent); }

  .play { padding: 0; border: 0; background: none; border-radius: 8px; flex-shrink: 0; }
  .thumb {
    position: relative;
    width: 168px;
    aspect-ratio: 16 / 9;
    border-radius: 8px;
    overflow: hidden;
    background: var(--surface-2);
  }
  .thumb img { width: 100%; height: 100%; object-fit: cover; display: block; }
  .noimg { position: absolute; inset: 0; display: grid; place-items: center; color: var(--muted); font-weight: 700; }
  .playicon {
    position: absolute;
    inset: 0;
    display: grid;
    place-items: center;
    font-size: 1.4rem;
    color: #fff;
    background: rgba(0, 0, 0, 0.35);
    opacity: 0;
    transition: opacity 0.15s;
  }
  .play:hover .playicon, .play:focus-visible .playicon, .episode.active .playicon { opacity: 1; }

  .text { min-width: 0; flex: 1; }
  .title {
    padding: 0;
    border: 0;
    background: none;
    text-align: left;
    font-weight: 600;
    font-size: 0.95rem;
  }
  .title:hover { text-decoration: underline; }
  .num { color: var(--muted); }
  .meta { margin: 0.15rem 0 0; font-size: 0.78rem; color: var(--muted); }
  .soon {
    margin-left: 0.4rem;
    font-size: 0.7rem;
    padding: 0.05rem 0.4rem;
    border-radius: 4px;
    background: var(--surface-2);
    color: var(--text);
  }
  .overview {
    margin: 0.35rem 0 0;
    font-size: 0.85rem;
    line-height: 1.45;
    color: color-mix(in srgb, var(--text) 85%, transparent);
    display: -webkit-box;
    -webkit-line-clamp: 2;
    line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }
  .overview.open { -webkit-line-clamp: unset; line-clamp: unset; display: block; }
  .lang {
    font-size: 0.65rem;
    padding: 0 0.3rem;
    margin-left: 0.3rem;
    border-radius: 3px;
    background: var(--surface-2);
    color: var(--muted);
  }
  .more {
    padding: 0;
    border: 0;
    background: none;
    color: var(--accent);
    font-size: 0.8rem;
    margin-top: 0.2rem;
  }

  .skeleton .thumb, .skeleton .lines span {
    animation: pulse 1.2s ease-in-out infinite;
  }
  .skeleton .lines { flex: 1; display: flex; flex-direction: column; gap: 0.5rem; padding-top: 0.3rem; }
  .skeleton .lines span { height: 0.8rem; border-radius: 4px; background: var(--surface-2); width: 60%; }
  .skeleton .lines span + span { width: 90%; }
  @keyframes pulse { 50% { opacity: 0.5; } }

  @media (max-width: 600px) {
    .episode { gap: 0.7rem; padding: 0.5rem 0.2rem; }
    .thumb { width: 120px; }
    .title { font-size: 0.88rem; }
  }
</style>
