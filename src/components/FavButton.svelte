<script>
  // Botón de corazón para agregar / quitar favoritos.
  let { active = false, onclick, label = '', size = 'md', overlay = false } = $props();
</script>

<button
  type="button"
  class="fav {size}"
  class:active
  class:overlay
  aria-pressed={active}
  aria-label={active ? `Quitar ${label} de favoritos` : `Agregar ${label} a favoritos`}
  title={active ? 'Quitar de favoritos' : 'Agregar a favoritos'}
  onclick={(e) => { e.stopPropagation(); e.preventDefault(); onclick?.(e); }}
>
  {active ? '♥' : '♡'}
</button>

<style>
  .fav {
    flex-shrink: 0;
    display: grid;
    place-items: center;
    padding: 0;
    border-radius: 50%;
    line-height: 1;
    color: var(--muted);
    background: var(--surface-2);
    border: 1px solid transparent;
    transition: transform 0.12s ease, color 0.12s ease;
  }
  .fav.md { width: 38px; height: 38px; font-size: 1.15rem; }
  .fav.sm { width: 30px; height: 30px; font-size: 0.95rem; background: transparent; }
  .fav:hover { color: var(--text); transform: scale(1.08); }
  .fav.active { color: #ff5c7a; }
  .fav.overlay { background: rgba(0, 0, 0, 0.6); color: #fff; }
  .fav.overlay.active { color: #ff5c7a; }
</style>
