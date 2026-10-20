/**
 * Transmisión a TV.
 *
 *  1. Google Cast (Chromecast, Google TV y teles con Chromecast integrado):
 *     usa el SDK oficial "Cast Web Sender". Solo funciona en Chrome / Edge
 *     (escritorio y Android). Se le pasa la URL del stream y la TV lo reproduce
 *     sola: el teléfono queda libre como control remoto.
 *  2. AirPlay (iPhone / iPad / Mac con Safari): selector nativo de Apple.
 *  3. Remote Playback API: otros navegadores, solo con video directo (no hls.js).
 *
 * El SDK se carga una sola vez y solo cuando hace falta.
 */

const SDK_URL = 'https://www.gstatic.com/cv/js/sender/v1/cast_sender.js?loadCastFramework=1';

export const castInfo = $state({
  ready: false,      // SDK cargado y disponible en este navegador
  available: false,  // hay al menos un dispositivo Cast en la red
  connected: false,  // transmitiendo ahora mismo
  deviceName: ''
});

let loading = null;

export function initCast() {
  if (loading) return loading;
  loading = new Promise((resolve) => {
    if (typeof window === 'undefined') return resolve(false);

    window.__onGCastApiAvailable = (isAvailable) => {
      if (!isAvailable || !window.cast?.framework) return resolve(false);
      try {
        const fw = window.cast.framework;
        const ctx = fw.CastContext.getInstance();
        ctx.setOptions({
          receiverApplicationId: window.chrome.cast.media.DEFAULT_MEDIA_RECEIVER_APP_ID,
          autoJoinPolicy: window.chrome.cast.AutoJoinPolicy.ORIGIN_SCOPED
        });
        const update = () => {
          const state = ctx.getCastState();
          castInfo.available = state !== fw.CastState.NO_DEVICES_AVAILABLE;
          castInfo.connected = state === fw.CastState.CONNECTED;
          castInfo.deviceName = ctx.getCurrentSession()?.getCastDevice()?.friendlyName || '';
        };
        ctx.addEventListener(fw.CastContextEventType.CAST_STATE_CHANGED, update);
        update();
        castInfo.ready = true;
        resolve(true);
      } catch (e) {
        console.warn('[cast] no se pudo iniciar', e);
        resolve(false);
      }
    };

    const script = document.createElement('script');
    script.src = SDK_URL;
    script.async = true;
    script.onerror = () => resolve(false); // sin internet o navegador sin soporte
    document.head.appendChild(script);
  });
  return loading;
}

/**
 * Envía un video a la TV. Si no hay sesión abierta, muestra el selector de dispositivos.
 * @param {{ src: string, type: 'hls'|'mp4'|'auto', title?: string, poster?: string, live?: boolean }} media
 */
export async function castMedia({ src, type, title = '', poster = '', live = false }) {
  const ctx = window.cast.framework.CastContext.getInstance();
  if (!ctx.getCurrentSession()) {
    try {
      await ctx.requestSession();
    } catch {
      throw new Error('Transmisión cancelada.');
    }
  }
  const session = ctx.getCurrentSession();
  if (!session) throw new Error('No se conectó con la TV.');

  const media = window.chrome.cast.media;
  const contentType =
    type === 'hls' ? 'application/x-mpegURL' : /\.webm(\?|$)/i.test(src) ? 'video/webm' : 'video/mp4';
  const info = new media.MediaInfo(src, contentType);
  info.streamType = live ? media.StreamType.LIVE : media.StreamType.BUFFERED;
  const meta = new media.GenericMediaMetadata();
  meta.title = title;
  if (poster) meta.images = [new window.chrome.cast.Image(poster)];
  info.metadata = meta;

  try {
    const err = await session.loadMedia(new media.LoadRequest(info));
    if (err) throw err;
  } catch (e) {
    throw new Error(`La TV no pudo reproducir este video (${e?.message || e}).`);
  }
}

export function stopCasting() {
  window.cast?.framework?.CastContext.getInstance().endCurrentSession(true);
}
