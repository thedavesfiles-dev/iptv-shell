/**
 * Scraper genérico: analiza el HTML de una página que el usuario proporciona
 * y extrae enlaces de video.
 *
 * Busca, en este orden:
 *   1. <video src> / <source src>
 *   2. <meta property="og:video..."> (muchas páginas lo publican para redes sociales)
 *   3. URLs .m3u8 / .mp4 / .webm escritas en el HTML o en scripts (incluye "https:\/\/...")
 *   4. <iframe src> (reproductores embebidos)
 *
 * Limitación: solo ve el HTML inicial. Si la página arma el reproductor con
 * JavaScript, el enlace no aparece aquí (se usará la página como iframe).
 */
import { detectType } from '../player/detectType.js';

const MEDIA_RE = /https?:\/\/[^\s"'<>\\()]+?\.(?:m3u8|mp4|webm|m4v)(?:\?[^\s"'<>\\()]*)?/gi;

function decodeEntities(s) {
  return s.replace(/&amp;/g, '&').replace(/&#x2F;/gi, '/').replace(/&#47;/g, '/');
}

export function extractMediaLinks(html, baseUrl) {
  const doc = new DOMParser().parseFromString(html, 'text/html');
  const found = new Map();

  const add = (raw, via, forcedType) => {
    if (!raw) return;
    let url;
    try { url = new URL(decodeEntities(raw.trim()), baseUrl).href; } catch { return; }
    if (!/^https?:/i.test(url) || found.has(url)) return;
    let type = forcedType || detectType(url);
    if (type === 'unknown') type = 'auto';
    found.set(url, { src: url, type, label: via });
  };

  doc.querySelectorAll('video[src]').forEach((el) => add(el.getAttribute('src'), '<video>'));
  doc.querySelectorAll('source[src]').forEach((el) => {
    const t = el.getAttribute('type') || '';
    add(el.getAttribute('src'), '<source>', /mpegurl/i.test(t) ? 'hls' : /mp4|webm/i.test(t) ? 'mp4' : undefined);
  });
  doc
    .querySelectorAll('meta[property="og:video"], meta[property="og:video:url"], meta[property="og:video:secure_url"]')
    .forEach((el) => add(el.getAttribute('content'), 'og:video'));

  const text = html.replace(/\\\//g, '/'); // des-escapa "https:\/\/" de JSON embebido
  for (const m of text.matchAll(MEDIA_RE)) add(m[0], 'enlace en el HTML');

  doc.querySelectorAll('iframe[src], iframe[data-src]').forEach((el) =>
    add(el.getAttribute('src') || el.getAttribute('data-src'), '<iframe>', 'iframe')
  );

  return [...found.values()];
}

/**
 * Descarga y analiza una página.
 * En el navegador lanzará un error si el sitio no permite CORS
 * (con Capacitor en Android esa restricción desaparece).
 */
export async function scrapePage(url, { signal } = {}) {
  const res = await fetch(url, { signal });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const html = await res.text();
  return extractMediaLinks(html, res.url || url);
}
