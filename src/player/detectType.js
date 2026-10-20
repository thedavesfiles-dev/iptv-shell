/**
 * Adivina el tipo de flujo a partir de la URL.
 * 'hls'    -> .m3u8 (usa hls.js o HLS nativo en Safari/iOS)
 * 'mp4'    -> archivos progresivos (.mp4, .webm, .mov, .m4v)
 * 'iframe' -> página de reproductor embebido (no se puede reproducir con <video>)
 * 'unknown'-> se intenta con <video> nativo
 */
export function detectType(url = '') {
  let path = url;
  try { path = new URL(url, location.href).pathname; } catch { /* url relativa o inválida */ }
  const p = path.toLowerCase();

  if (p.endsWith('.m3u8') || /[?&](type|format)=m3u8/i.test(url)) return 'hls';
  if (/\.(mp4|m4v|webm|mov|ogv)$/.test(p)) return 'mp4';
  if (/\/(embed|e|player)\//.test(p) || /\.(html?|php)$/.test(p)) return 'iframe';

  // Muchas listas IPTV usan URLs tipo /live/usuario/clave/123.ts o sin extensión: suelen ser HLS
  if (p.endsWith('.ts') || /\/live\//.test(p)) return 'hls';
  return 'unknown';
}
