/**
 * Punto único donde la app pregunta "¿qué video reproduzco?".
 *
 *  - resolveSources(req): consulta en paralelo todos los proveedores registrados
 *    (src/sources/providers) usando IDs de TMDB/IMDb, temporada y episodio.
 *  - resolveUrl(url): para una URL que pega el usuario. Si es un video directo lo
 *    usa tal cual; si es una página, la analiza con el scraper genérico y, si CORS
 *    impide leerla, la carga como iframe aislado (fallback).
 *
 * Ambos devuelven una lista ORDENADA de fuentes para el reproductor multi-fuente:
 * primero HLS, luego archivos directos y al final iframes.
 */
import providers from './providers/index.js';
import { scrapePage } from '../scrapers/generic.js';
import { detectType } from '../player/detectType.js';

export const DEMO_STREAM = 'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8';

const PROVIDER_TIMEOUT_MS = 12000;
const RANK = { hls: 0, mp4: 1, auto: 2, iframe: 3 };

export function sortSources(list) {
  // sort estable: respeta el orden de proveedores dentro del mismo tipo
  return [...list].sort((a, b) => (RANK[a.type] ?? 2) - (RANK[b.type] ?? 2));
}

async function runWithTimeout(fn, ms) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), ms);
  try {
    return await fn(ctrl.signal);
  } finally {
    clearTimeout(timer);
  }
}

/**
 * @param {object} req  { type, tmdbId, imdbId, title, originalTitle, year, season?, episode? }
 * @returns {Promise<{ label: string, sources: object[], tried: string[] }>}
 */
export async function resolveSources(req) {
  const label = req.type === 'tv' ? `${req.title} · T${req.season} E${req.episode}` : req.title;

  const active = providers.filter((p) => {
    try { return p.supports(req); } catch { return false; }
  });

  console.info('[resolve] buscando', label, '→ proveedores:', active.map((p) => p.id), req);

  const results = await Promise.allSettled(
    active.map((p) =>
      runWithTimeout((signal) => p.find(req, { signal }), PROVIDER_TIMEOUT_MS).then((list) =>
        (list || []).map((s) => ({ ...s, provider: p.name }))
      )
    )
  );

  results.forEach((r, i) => {
    if (r.status === 'rejected') console.warn(`[resolve] ${active[i].id} falló:`, r.reason?.message || r.reason);
    else console.info(`[resolve] ${active[i].id}: ${r.value.length} fuente(s)`);
  });

  const sources = sortSources(results.flatMap((r) => (r.status === 'fulfilled' ? r.value : [])));
  return { label, sources, tried: active.map((p) => p.name) };
}

/**
 * Fuentes a partir de una URL pegada por el usuario.
 * @returns {Promise<object[]>}
 */
export async function resolveUrl(url) {
  const kind = detectType(url);
  if (kind === 'hls' || kind === 'mp4') {
    return [{ src: url, type: kind, label: 'URL directa', provider: 'Manual' }];
  }

  const pageAsIframe = (why) => ({ src: url, type: 'iframe', label: `Página embebida${why}`, provider: 'Respaldo' });

  try {
    const found = await runWithTimeout((signal) => scrapePage(url, { signal }), PROVIDER_TIMEOUT_MS);
    console.info(`[resolve] scraper genérico: ${found.length} enlace(s) en`, url, found);
    const list = sortSources(found.map((f) => ({ ...f, provider: 'Scraper genérico' })));
    return [...list, pageAsIframe('')];
  } catch (e) {
    // Lo más común aquí es CORS: el navegador no deja leer el HTML de otro sitio.
    console.warn('[resolve] no se pudo leer la página (¿CORS?):', e.message);
    return [pageAsIframe(' (no se pudo leer el HTML)')];
  }
}
