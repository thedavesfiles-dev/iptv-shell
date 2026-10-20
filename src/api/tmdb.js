/**
 * Cliente mínimo de The Movie Database (TMDB) v3.
 *
 * Acepta cualquiera de las dos credenciales en VITE_TMDB_KEY (.env.local):
 *   - "API Read Access Token" (v4, empieza con "eyJ...") -> se manda como Bearer
 *   - "API Key" (v3, 32 caracteres)                      -> se manda como ?api_key=
 *
 * Todas las funciones devuelven objetos "normalizados" (mismo formato para
 * películas y series) para que la interfaz no tenga que distinguir campos.
 */

const TOKEN = (import.meta.env.VITE_TMDB_KEY || '').trim();
const BASE = 'https://api.themoviedb.org/3';
const IMG_BASE = 'https://image.tmdb.org/t/p';
export const LANGUAGE = 'es-MX';

const isBearer = TOKEN.startsWith('eyJ');

export function hasKey() {
  return TOKEN.length > 0 && TOKEN !== 'pon_tu_key_aqui';
}

// Cache en memoria por URL: evita repetir la misma petición al cambiar de pestaña
const cache = new Map();

async function request(path, params = {}, { signal } = {}) {
  if (!hasKey()) {
    throw new Error('Falta VITE_TMDB_KEY en .env.local (reinicia `npm run dev` después de crearlo).');
  }

  const url = new URL(BASE + path);
  const query = { language: LANGUAGE, ...params };
  if (!isBearer) query.api_key = TOKEN;
  for (const [k, v] of Object.entries(query)) {
    if (v !== undefined && v !== null && v !== '') url.searchParams.set(k, String(v));
  }

  const key = url.href;
  if (cache.has(key)) return cache.get(key);

  const promise = fetch(url, {
    signal,
    headers: {
      accept: 'application/json',
      ...(isBearer ? { Authorization: `Bearer ${TOKEN}` } : {})
    }
  }).then(async (res) => {
    if (!res.ok) {
      let msg = `TMDB respondió HTTP ${res.status}`;
      try {
        const body = await res.json();
        if (body.status_message) msg += `: ${body.status_message}`;
      } catch { /* respuesta sin JSON */ }
      if (res.status === 401) msg += ' (revisa tu token en .env.local)';
      throw new Error(msg);
    }
    return res.json();
  });

  cache.set(key, promise);
  promise.catch(() => cache.delete(key)); // no guardar errores en cache
  return promise;
}

/* ---------- Imágenes ---------- */

/**
 * Construye la URL de una imagen de TMDB.
 * Tamaños útiles: posters w185 / w342 / w500, fondos w780 / w1280, perfiles w185.
 */
export function img(path, size = 'w342') {
  return path ? `${IMG_BASE}/${size}${path}` : '';
}

/* ---------- Normalización ---------- */

function yearOf(date) {
  return date ? date.slice(0, 4) : '';
}

/** Convierte un resultado de lista (trending / search) al formato de la app */
export function normalize(raw, fallbackType) {
  const type = raw.media_type || fallbackType;
  return {
    id: raw.id,
    type, // 'movie' | 'tv'
    key: `${type}-${raw.id}`,
    title: raw.title || raw.name || 'Sin título',
    originalTitle: raw.original_title || raw.original_name || '',
    year: yearOf(raw.release_date || raw.first_air_date),
    overview: raw.overview || '',
    poster: raw.poster_path || '',
    backdrop: raw.backdrop_path || '',
    rating: typeof raw.vote_average === 'number' ? Math.round(raw.vote_average * 10) / 10 : null,
    votes: raw.vote_count || 0
  };
}

function normalizeList(data, fallbackType) {
  return {
    page: data.page,
    totalPages: Math.min(data.total_pages || 1, 500), // TMDB no deja pasar de la página 500
    results: (data.results || [])
      .filter((r) => (r.media_type || fallbackType) !== 'person')
      .map((r) => normalize(r, fallbackType))
  };
}

/* ---------- Endpoints ---------- */

/**
 * Tendencias.
 * @param {'all'|'movie'|'tv'} type
 * @param {'day'|'week'} window
 */
export async function getTrending(type = 'all', window = 'week', page = 1, opts) {
  const data = await request(`/trending/${type}/${window}`, { page }, opts);
  return normalizeList(data, type === 'all' ? undefined : type);
}

/**
 * Búsqueda por texto.
 * @param {'multi'|'movie'|'tv'} type
 */
export async function search(query, type = 'multi', page = 1, opts) {
  const data = await request(`/search/${type}`, { query, page, include_adult: false }, opts);
  return normalizeList(data, type === 'multi' ? undefined : type);
}

/** Ficha completa: géneros, duración, reparto, tráiler, IDs externos */
export async function getDetails(type, id, opts) {
  const raw = await request(
    `/${type}/${id}`,
    { append_to_response: 'videos,credits,external_ids', include_video_language: 'es,en,null' },
    opts
  );
  const base = normalize(raw, type);

  const videos = raw.videos?.results || [];
  const trailer =
    videos.find((v) => v.site === 'YouTube' && v.type === 'Trailer' && v.iso_639_1 === 'es') ||
    videos.find((v) => v.site === 'YouTube' && v.type === 'Trailer') ||
    videos.find((v) => v.site === 'YouTube');

  const runtime = raw.runtime || raw.episode_run_time?.[0] || null;

  return {
    ...base,
    tagline: raw.tagline || '',
    genres: (raw.genres || []).map((g) => g.name),
    runtime, // minutos
    status: raw.status || '',
    seasons: raw.number_of_seasons ?? null,
    episodes: raw.number_of_episodes ?? null,
    cast: (raw.credits?.cast || []).slice(0, 10).map((c) => ({
      id: c.id,
      name: c.name,
      character: c.character,
      photo: c.profile_path || ''
    })),
    trailerKey: trailer?.key || '',
    imdbId: raw.external_ids?.imdb_id || raw.imdb_id || '',
    // Solo series: lista de temporadas (la 0 suele ser "Especiales")
    seasonList: (raw.seasons || [])
      .filter((s) => s.episode_count > 0)
      .map((s) => ({
        number: s.season_number,
        name: s.name || (s.season_number === 0 ? 'Especiales' : `Temporada ${s.season_number}`),
        episodeCount: s.episode_count,
        year: yearOf(s.air_date),
        poster: s.poster_path || ''
      }))
      // Temporadas normales primero, "Especiales" al final
      .sort((a, b) => (a.number === 0) - (b.number === 0) || a.number - b.number)
  };
}

/**
 * Episodios de una temporada.
 * Muchas series no tienen sinopsis en español: en ese caso se completa
 * con la versión en inglés (y se marca con `overviewLang: 'en'`).
 */
export async function getSeason(tvId, seasonNumber, opts) {
  const raw = await request(`/tv/${tvId}/season/${seasonNumber}`, {}, opts);

  let english = null;
  const missing = (raw.episodes || []).some((e) => !e.overview);
  if (missing) {
    try {
      english = await request(`/tv/${tvId}/season/${seasonNumber}`, { language: 'en-US' }, opts);
    } catch { /* si falla, se queda sin sinopsis */ }
  }
  const enByNumber = new Map((english?.episodes || []).map((e) => [e.episode_number, e]));

  const genericName = /^(episodio|episode|capítulo)\s*\d+$/i;

  return {
    number: raw.season_number,
    name: raw.name,
    overview: raw.overview || '',
    episodes: (raw.episodes || []).map((e) => {
      const en = enByNumber.get(e.episode_number);
      const useEnName = genericName.test(e.name || '') && en?.name && !genericName.test(en.name);
      return {
        id: e.id,
        season: e.season_number,
        number: e.episode_number,
        title: (useEnName ? en.name : e.name) || `Episodio ${e.episode_number}`,
        overview: e.overview || en?.overview || '',
        overviewLang: e.overview ? 'es' : en?.overview ? 'en' : '',
        still: e.still_path || '',
        runtime: e.runtime || null,
        airDate: e.air_date || '',
        rating: e.vote_average ? Math.round(e.vote_average * 10) / 10 : null
      };
    })
  };
}
