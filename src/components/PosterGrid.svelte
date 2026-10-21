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
    display: flex;
    flex-direction: column;
    gap: 0;
    border-radius: 3px;
  }
  .card:hover { filter: none; }
  .card:hover .poster, .card:focus-visible .poster {
    border-color: var(--gold);
    box-shadow: 0 0 0 1px var(--gold), 0 10px 24px rgba(0, 0, 0, 0.6);
    transform: translateY(-3px);
  }
  .card:focus-visible { outline: none; }

  /* Póster con marco metálico biselado y brillo de vidrio arriba */
  .poster {
    position: relative;
    aspect-ratio: 2 / 3;
    border: 2px solid #3a4c74;
    border-bottom: 0;
    border-radius: 3px 3px 0 0;
    overflow: hidden;
    background: var(--panel-bg);
    box-shadow: 0 6px 16px rgba(0, 0, 0, 0.5);
    transition: transform 0.18s ease, border-color 0.18s ease, box-shadow 0.18s ease;
  }
  .poster::after {
    content: '';
    position: absolute;
    inset: 0;
    background: linear-gradient(180deg, rgba(255, 255, 255, 0.16) 0%, rgba(255, 255, 255, 0) 22%, rgba(0, 0, 0, 0) 60%, rgba(0, 0, 0, 0.55) 100%);
    pointer-events: none;
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
    font-family: var(--font-display);
    font-weight: 800;
    font-style: italic;
    text-transform: uppercase;
  }

  /* Calificación: número grande tipo marcador */
  .rating {
    position: absolute;
    z-index: 1;
    left: 0;
    bottom: 6px;
    padding: 0.05rem 0.45rem 0.05rem 0.35rem;
    background: var(--panel-bg);
    border: 1px solid #3a4c74;
    border-left: 3px solid var(--gold);
    font-family: var(--font-display);
    font-weight: 900;
    font-style: italic;
    font-size: 1.05rem;
    color: var(--gold);
    box-shadow: var(--panel-shadow);
  }
  .kind {
    position: absolute;
    z-index: 1;
    top: 6px;
    left: 0;
    padding: 0.05rem 0.45rem;
    background: var(--red-bg);
    font-family: var(--font-display);
    font-weight: 800;
    font-style: italic;
    font-size: 0.7rem;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: #fff;
  }

  /* Rótulo inferior: título en mayúsculas condensadas + año */
  .meta {
    display: flex;
    flex-direction: column;
    padding: 0.35rem 0.5rem 0.4rem;
    min-width: 0;
    background: var(--panel-bg);
    border: 2px solid #3a4c74;
    border-top: 3px solid var(--accent);
    border-radius: 0 0 3px 3px;
  }
  .title {
    font-family: var(--font-display);
    font-weight: 800;
    font-style: italic;
    font-size: 1rem;
    line-height: 1.1;
    text-transform: uppercase;
    color: #fff;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .year { font-size: 0.75rem; color: var(--muted); letter-spacing: 0.06em; }

  @media (max-width: 600px) {
    .kind { display: none; }
    .title { font-size: 0.85rem; }
    .rating { font-size: 0.9rem; }
  }
</style>
