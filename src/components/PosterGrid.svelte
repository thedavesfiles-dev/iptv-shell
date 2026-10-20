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
            <span class="rating">★ {item.rating.toFixed(1)}</span>
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
    text-align: left;
    display: flex;
    flex-direction: column;
    gap: 0.4rem;
    border-radius: 10px;
  }
  .card:hover .poster img,
  .card:focus-visible .poster img { transform: scale(1.04); }
  .card:focus-visible { outline: 3px solid var(--accent); outline-offset: 3px; }

  .poster {
    position: relative;
    aspect-ratio: 2 / 3;
    border-radius: 10px;
    overflow: hidden;
    background: var(--surface-2);
  }
  .poster img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    display: block;
    transition: transform 0.25s ease;
  }
  .noposter {
    height: 100%;
    display: grid;
    place-items: center;
    padding: 0.5rem;
    text-align: center;
    color: var(--muted);
    font-size: 0.85rem;
  }

  .rating, .kind {
    position: absolute;
    font-size: 0.72rem;
    font-weight: 600;
    padding: 0.15rem 0.4rem;
    border-radius: 5px;
    background: rgba(0, 0, 0, 0.72);
  }
  .rating { top: 6px; left: 6px; color: #ffd166; }
  .kind { bottom: 6px; right: 6px; color: #fff; }

  .meta { display: flex; flex-direction: column; padding: 0 0.15rem; min-width: 0; }
  .title {
    font-size: 0.9rem;
    font-weight: 600;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .year { font-size: 0.8rem; color: var(--muted); }

  @media (max-width: 600px) {
    .kind { display: none; }
    .title { font-size: 0.8rem; }
  }
</style>
