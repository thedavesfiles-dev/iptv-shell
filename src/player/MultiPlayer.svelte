<script>
  /**
   * Reproductor multi-fuente: recibe una lista de fuentes ordenada y, si la actual
   * falla (error o no arranca en 20 s), pasa automáticamente a la siguiente.
   * Los iframes no avisan si fallan, por eso siempre hay un botón "Siguiente fuente".
   */
  import Player from './Player.svelte';

  let { sources = [], title = '', poster = '', actions = null } = $props();

  const START_TIMEOUT_MS = 20000;

  let index = $state(0);
  let notice = $state('');
  let exhausted = $state(false);
  let timer = null;

  const current = $derived(sources[index]);

  // Lista nueva → empezar desde la primera fuente
  $effect(() => {
    sources;
    index = 0;
    notice = '';
    exhausted = false;
  });

  // Si un video directo no empieza en X segundos, se considera caído
  $effect(() => {
    const s = current;
    clearTimeout(timer);
    if (!s || s.type === 'iframe') return;
    timer = setTimeout(() => next('no respondió a tiempo'), START_TIMEOUT_MS);
    return () => clearTimeout(timer);
  });

  function describe(s, i) {
    return `${i + 1}. ${s.provider ?? ''}${s.label ? ' · ' + s.label : ''}`;
  }

  function next(reason) {
    clearTimeout(timer);
    if (index < sources.length - 1) {
      notice = `Fuente ${index + 1} falló (${reason}). Probando la ${index + 2} de ${sources.length}…`;
      console.warn('[multi-source]', notice, current);
      index += 1;
    } else {
      exhausted = true;
      notice = `Ninguna de las ${sources.length} fuentes funcionó (última: ${reason}).`;
    }
  }

  function onready() {
    clearTimeout(timer);
    notice = '';
  }

  function pick(e) {
    index = Number(e.currentTarget.value);
    exhausted = false;
    notice = '';
  }
</script>

{#if current}
  <Player
    src={current.src}
    type={current.type}
    {title}
    {poster}
    {actions}
    onready={onready}
    onerror={(msg) => next(msg)}
  />

  <div class="sources">
    <label>
      Fuente
      <select value={index} onchange={pick}>
        {#each sources as s, i (i)}
          <option value={i}>{describe(s, i)} [{s.type.toUpperCase()}]</option>
        {/each}
      </select>
    </label>
    {#if index < sources.length - 1}
      <button onclick={() => next('cambio manual')}>Siguiente fuente ▸</button>
    {/if}
  </div>

  {#if notice}
    <p class="notice" class:bad={exhausted}>{notice}</p>
  {/if}
{/if}

<style>
  .sources { display: flex; flex-wrap: wrap; gap: 0.6rem; align-items: center; margin-top: 0.2rem; }
  label { display: flex; gap: 0.4rem; align-items: center; font-size: 0.85rem; color: var(--muted); flex: 1; min-width: 0; }
  select { flex: 1; min-width: 0; max-width: 100%; font-size: 0.85rem; }
  button { font-size: 0.85rem; }
  .notice { margin: 0.5rem 0 0; font-size: 0.85rem; color: var(--gold); }
  .notice.bad { color: #ffb4b4; }
</style>
