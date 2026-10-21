<script>
  import { img } from '../api/tmdb.js';
  import FavButton from './FavButton.svelte';
  import { isFavTitle, toggleTitle } from '../stores/favorites.svelte.js';

  // row = fila horizontal deslizable (para la sección de favoritos)
  let { items = [], onselect, row = false } = $props();
</script>

<ul class="grid" class:row>
  {#each items as item (item.key)}
    <li>
      <button class="card" onclick={() => onselect?.(item)} aria-label={`${item.title} ${item.year}`}>
        <div class="poster">
          {#if item.poster}
            <img
              src={img(item.poster, 'w342')}
              srcset={`${img(item.poster, 'w185')} 185w, ${img(item.poster, 'w342')} 342w, ${img(item.poster, 'w500')} 500w`}
              sizes="(max-width: 600px) 33vw, 180px"
              alt=""
              loading="lazy"
              decoding="async"
            />
          {:else}
            <div class="noposter">{item.title}</div>
          {/if}
          {#if item.rating}
            <span class="rating">{item.rating.toFixed(1)}</span>
          {/if}
          <span class="kind">{item.type === 'tv' ? 'Serie' : 'Película'}</span>
        </div>
        <div class="meta">
          <span class="title">{item.title}</span>
          <span class="year">{item.year}</span>
        </div>
      </button>
      <div class="favpos">
        <FavButton size="sm" overlay active={isFavTitle(item.key)} label={item.title} onclick={() => toggleTitle(item)} />
      </div>
    </li>
  {/each}
</ul>

<style>
  .grid {
    list-style: none;
    margin: 0;
    padding: 0;
    display: grid;
    gap: 1rem;
    grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
  }
  .grid li { min-width: 0; position: relative; }
  .favpos { position: absolute; top: 6px; right: 6px; }

  .grid.row {
    display: flex;
    overflow-x: auto;
    gap: 0.8rem;
    padding-bottom: 0.4rem;
    scroll-snap-type: x proximity;
  }
  .grid.row li { flex: 0 0 130px; scroll-snap-align: start; }
  @media (max-width: 600px) {
    .grid:not(.row) { gap: 0.6rem; grid-template-columns: repeat(3, minmax(0, 1fr)); }
    .grid.row li { flex-basis: 105px; }
  }

  .card {
    width: 100%;
    padding: 0;
    border: 0;
    background: transparent;
    box-shadow: none;
    text-align: left;
    text-transform: none;
    letter-spacing: normal;
    font-family: var(--font);
    font-weight: 400;
    color: var(--text);
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }
  .card:hover .poster, .card:focus-visible .poster {
    border-color: var(--gold-light);
    box-shadow: 0 0 0 1px var(--gold-light), 0 0 26px rgba(255, 200, 120, 0.28), 0 14px 30px rgba(0, 0, 0, 0.7);
    transform: translateY(-4px);
  }
  .card:hover .title { color: var(--gold-light); }
  .card:focus-visible { outline: none; }

  /* Cartel enmarcado: filo dorado + paspartú negro */
  .poster {
    position: relative;
    aspect-ratio: 2 / 3;
    padding: 4px;
    border: 1px solid var(--gold-dark);
    background: #0a0605;
    box-shadow: 0 10px 22px rgba(0, 0, 0, 0.55);
    transition: transform 0.2s ease, border-color 0.2s ease, box-shadow 0.2s ease;
  }
  .poster img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    display: block;
  }
  .noposter {
    height: 100%;
    display: grid;
    place-items: center;
    padding: 0.5rem;
    text-align: center;
    color: var(--muted);
    font-family: var(--font-marquee);
  }

  /* Calificación: sello dorado */
  .rating {
    position: absolute;
    z-index: 1;
    left: 8px;
    bottom: 8px;
    padding: 0.12rem 0.45rem;
    border: 1px solid var(--gold);
    background: rgba(12, 8, 7, 0.88);
    font-family: var(--font-marquee);
    font-size: 0.9rem;
    color: var(--gold-light);
  }
  .rating::before { content: '★ '; font-size: 0.75em; }
  .kind {
    position: absolute;
    z-index: 1;
    top: 8px;
    left: 8px;
    padding: 0.1rem 0.45rem;
    background: rgba(12, 8, 7, 0.82);
    border: 1px solid rgba(217, 180, 90, 0.45);
    font-family: var(--font-display);
    font-weight: 600;
    font-size: 0.66rem;
    letter-spacing: 0.18em;
    text-transform: uppercase;
    color: var(--gold);
  }

  .meta { display: flex; flex-direction: column; padding: 0 0.15rem; min-width: 0; }
  .title {
    font-family: var(--font-display);
    font-weight: 600;
    font-size: 1.02rem;
    line-height: 1.15;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    color: var(--text);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    transition: color 0.15s;
  }
  .year { font-size: 0.75rem; color: var(--muted); letter-spacing: 0.14em; }

  @media (max-width: 600px) {
    .kind { display: none; }
    .title { font-size: 0.85rem; letter-spacing: 0.03em; }
    .rating { font-size: 0.78rem; left: 6px; bottom: 6px; }
    .poster { padding: 3px; }
  }
</style>
