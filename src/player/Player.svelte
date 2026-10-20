<script>
  /**
   * Reproductor universal:
   *  - .m3u8  -> hls.js (Chrome, Firefox, Android, TV) o HLS nativo (Safari / iOS)
   *  - .mp4   -> <video> nativo
   *  - iframe -> página de reproductor embebido
   *
   * Uso:  <Player src={url} title="Canal" poster={img} />
   */
  import Hls from 'hls.js';
  import { detectType } from './detectType.js';

  let {
    src = '',
    type = 'auto',      // 'auto' | 'hls' | 'mp4' | 'iframe'
    title = '',
    poster = '',
    autoplay = true,
    muted = false,
    onerror = null,     // callback opcional (mensaje) => {}
    onready = null      // callback cuando el video empieza a reproducirse
  } = $props();

  let video = $state(null);
  let hls = null;

  let status = $state('idle');     // idle | loading | playing | paused | error
  let errorMsg = $state('');
  let levels = $state([]);         // calidades disponibles en HLS
  let currentLevel = $state(-1);   // -1 = automático

  const resolvedType = $derived(type === 'auto' ? detectType(src) : type);

  function fail(msg) {
    status = 'error';
    errorMsg = msg;
    onerror?.(msg);
  }

  function destroyHls() {
    if (hls) {
      hls.destroy();
      hls = null;
    }
    levels = [];
    currentLevel = -1;
  }

  function tryPlay() {
    if (!autoplay || !video) return;
    video.play().catch(() => {
      // Los navegadores bloquean el autoplay con sonido: se queda en pausa
      // hasta que el usuario toque "play".
      status = 'paused';
    });
  }

  function attachHls(url) {
    // Safari / iOS reproducen HLS de forma nativa (y hls.js no funciona en iPhone)
    if (!Hls.isSupported() && video.canPlayType('application/vnd.apple.mpegurl')) {
      video.src = url;
      tryPlay();
      return;
    }
    if (!Hls.isSupported()) {
      fail('Este navegador no soporta HLS.');
      return;
    }

    hls = new Hls({
      enableWorker: true,
      lowLatencyMode: true,
      backBufferLength: 30,   // segundos de buffer pasado (ahorra RAM en TVs)
      maxBufferLength: 30
    });

    let mediaRecoveries = 0;

    hls.on(Hls.Events.MANIFEST_PARSED, (_e, data) => {
      levels = data.levels.map((l, i) => ({
        index: i,
        label: l.height ? `${l.height}p` : `${Math.round((l.bitrate || 0) / 1000)} kbps`
      }));
      tryPlay();
    });

    hls.on(Hls.Events.LEVEL_SWITCHED, (_e, data) => {
      if (hls?.autoLevelEnabled) currentLevel = -1;
      else currentLevel = data.level;
    });

    hls.on(Hls.Events.ERROR, (_e, data) => {
      if (!data.fatal) return;
      switch (data.type) {
        case Hls.ErrorTypes.NETWORK_ERROR:
          // Error de red (típico: CORS o enlace caído). Un reintento y luego se rinde.
          if (data.details === Hls.ErrorDetails.MANIFEST_LOAD_ERROR) {
            destroyHls();
            fail('No se pudo cargar el stream (enlace caído o bloqueado por CORS).');
          } else {
            hls.startLoad();
          }
          break;
        case Hls.ErrorTypes.MEDIA_ERROR:
          if (mediaRecoveries++ < 2) hls.recoverMediaError();
          else { destroyHls(); fail('Error de decodificación del video.'); }
          break;
        default:
          destroyHls();
          fail(`Error fatal de reproducción: ${data.details}`);
      }
    });

    hls.loadSource(url);
    hls.attachMedia(video);
  }

  // Se vuelve a ejecutar cada vez que cambian `src` o el tipo
  $effect(() => {
    const url = src;
    const kind = resolvedType;
    if (!url || kind === 'iframe' || !video) return;

    status = 'loading';
    errorMsg = '';

    // Una página https no puede cargar video http:// (contenido mixto): el navegador lo bloquea
    if (location.protocol === 'https:' && url.startsWith('http://')) {
      fail('Este canal usa http:// y el navegador lo bloquea en la versión web (https). Funcionará en la app Android.');
      return;
    }

    if (kind === 'hls') {
      attachHls(url);
    } else {
      video.src = url;
      tryPlay();
    }

    // Limpieza al cambiar de canal o desmontar el componente
    return () => {
      destroyHls();
      if (video) {
        video.pause();
        video.removeAttribute('src');
        video.load();
      }
    };
  });

  function setLevel(e) {
    const value = Number(e.currentTarget.value);
    if (!hls) return;
    hls.currentLevel = value; // -1 vuelve a automático
    currentLevel = value;
  }

  function onVideoError() {
    // Solo aplica a reproducción nativa (mp4 o HLS en Safari)
    if (hls) return;
    if (!video?.getAttribute('src')) return; // limpieza al cambiar de fuente, no es un error real
    const code = video?.error?.code;
    const msgs = {
      1: 'Reproducción cancelada.',
      2: 'Error de red al descargar el video.',
      3: 'El video está dañado o usa un códec no soportado.',
      4: 'Formato no soportado o enlace inválido.'
    };
    fail(msgs[code] || 'No se pudo reproducir el video.');
  }

  function toggleFullscreen() {
    const el = video?.parentElement;
    if (!el) return;
    if (document.fullscreenElement) document.exitFullscreen();
    else if (el.requestFullscreen) el.requestFullscreen();
    else video.webkitEnterFullscreen?.(); // iPhone
  }

  // Atajos de teclado / control remoto de TV
  function onKey(e) {
    if (!video || resolvedType === 'iframe') return;
    switch (e.key) {
      case ' ':
      case 'Enter':
      case 'MediaPlayPause':
        e.preventDefault();
        video.paused ? video.play() : video.pause();
        break;
      case 'f':
        toggleFullscreen();
        break;
      case 'ArrowRight':
        if (Number.isFinite(video.duration)) video.currentTime += 10;
        break;
      case 'ArrowLeft':
        if (Number.isFinite(video.duration)) video.currentTime -= 10;
        break;
    }
  }
</script>

<div class="player" tabindex="0" role="region" aria-label="Reproductor de video" onkeydown={onKey}>
  {#if !src}
    <div class="placeholder">Elige un canal o pega una URL para reproducir</div>
  {:else if resolvedType === 'iframe'}
    <iframe
      {src}
      title={title || 'Reproductor embebido'}
      allow="autoplay; fullscreen; encrypted-media; picture-in-picture"
      allowfullscreen
      referrerpolicy="no-referrer"
      sandbox="allow-scripts allow-same-origin allow-presentation allow-forms"
    ></iframe>
  {:else}
    <!-- svelte-ignore a11y_media_has_caption -->
    <video
      bind:this={video}
      {poster}
      {muted}
      controls
      playsinline
      preload="auto"
      onplaying={() => { status = 'playing'; onready?.(); }}
      oncanplay={() => onready?.()}
      onpause={() => (status = 'paused')}
      onwaiting={() => (status = 'loading')}
      onerror={onVideoError}
    ></video>

    {#if status === 'loading'}
      <div class="overlay"><div class="spinner"></div></div>
    {/if}

    {#if status === 'error'}
      <div class="overlay error">
        <strong>⚠ {errorMsg}</strong>
        <small>{src}</small>
      </div>
    {/if}
  {/if}
</div>

{#if src && resolvedType !== 'iframe'}
  <div class="bar">
    <span class="title">{title}</span>
    <span class="badge">{resolvedType.toUpperCase()}</span>
    {#if levels.length > 1}
      <label>
        Calidad
        <select value={currentLevel} onchange={setLevel}>
          <option value={-1}>Auto</option>
          {#each levels as l (l.index)}
            <option value={l.index}>{l.label}</option>
          {/each}
        </select>
      </label>
    {/if}
    <button onclick={toggleFullscreen}>Pantalla completa</button>
  </div>
{/if}

<style>
  .player {
    position: relative;
    width: 100%;
    aspect-ratio: 16 / 9;
    background: #000;
    border-radius: 10px;
    overflow: hidden;
    outline: none;
  }
  .player:focus-visible { box-shadow: 0 0 0 3px var(--accent); }

  video, iframe {
    width: 100%;
    height: 100%;
    border: 0;
    display: block;
    background: #000;
  }

  .placeholder {
    position: absolute;
    inset: 0;
    display: grid;
    place-items: center;
    color: var(--muted);
    padding: 1rem;
    text-align: center;
  }

  .overlay {
    position: absolute;
    inset: 0;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
    pointer-events: none;
    background: rgba(0, 0, 0, 0.35);
  }
  .overlay.error {
    background: rgba(0, 0, 0, 0.8);
    color: #ffb4b4;
    padding: 1rem;
    text-align: center;
    pointer-events: auto;
  }
  .overlay.error small {
    color: var(--muted);
    word-break: break-all;
    max-width: 90%;
  }

  .spinner {
    width: 42px;
    height: 42px;
    border: 4px solid rgba(255, 255, 255, 0.25);
    border-top-color: var(--accent);
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
  }
  @keyframes spin { to { transform: rotate(360deg); } }

  .bar {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 0.75rem;
    padding: 0.6rem 0.2rem;
  }
  .title { font-weight: 600; flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .badge {
    font-size: 0.7rem;
    padding: 0.15rem 0.45rem;
    border-radius: 4px;
    background: var(--surface-2);
    color: var(--muted);
  }
  label { display: flex; gap: 0.4rem; align-items: center; font-size: 0.9rem; color: var(--muted); }
</style>
