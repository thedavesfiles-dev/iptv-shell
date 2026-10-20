/**
 * Proveedor: tu propio servidor Jellyfin (biblioteca personal).
 *
 * Se activa solo si defines en .env.local:
 *   VITE_JELLYFIN_URL=http://192.168.x.x:8096
 *   VITE_JELLYFIN_KEY=<API key creada en Panel de control → Claves API>
 *
 * Empareja por ID de TMDB / IMDb (Jellyfin los guarda en ProviderIds),
 * así que funciona aunque el título en tu biblioteca esté en otro idioma.
 */

const BASE = (import.meta.env.VITE_JELLYFIN_URL || '').trim().replace(/\/+$/, '');
const KEY = (import.meta.env.VITE_JELLYFIN_KEY || '').trim();

async function jf(path, params, signal) {
  const url = new URL(BASE + path);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, String(v));
  const res = await fetch(url, { signal, headers: { 'X-Emby-Token': KEY } });
  if (!res.ok) throw new Error(`Jellyfin HTTP ${res.status}`);
  return res.json();
}

function matches(item, req) {
  const ids = item.ProviderIds || {};
  const tmdb = ids.Tmdb || ids.tmdb;
  const imdb = ids.Imdb || ids.imdb;
  return (tmdb && String(tmdb) === String(req.tmdbId)) || (req.imdbId && imdb === req.imdbId);
}

async function findItem(req, signal) {
  const kind = req.type === 'tv' ? 'Series' : 'Movie';
  const terms = [...new Set([req.originalTitle, req.title].filter(Boolean))];
  for (const term of terms) {
    const res = await jf('/Items', {
      Recursive: true,
      IncludeItemTypes: kind,
      SearchTerm: term,
      Fields: 'ProviderIds',
      Limit: 25
    }, signal);
    const hit = (res.Items || []).find((i) => matches(i, req));
    if (hit) return hit;
  }
  return null;
}

export default {
  id: 'jellyfin',
  name: 'Jellyfin',

  supports() {
    return Boolean(BASE && KEY);
  },

  async find(req, { signal }) {
    const item = await findItem(req, signal);
    if (!item) return [];

    let target = item;
    if (req.type === 'tv') {
      const eps = await jf(`/Shows/${item.Id}/Episodes`, { season: req.season }, signal);
      target = (eps.Items || []).find(
        (e) => e.ParentIndexNumber === req.season && e.IndexNumber === req.episode
      );
      if (!target) return [];
    }

    const id = target.Id;
    return [
      {
        // Transcodificado a HLS: lo reproduce cualquier navegador
        src: `${BASE}/Videos/${id}/master.m3u8?api_key=${KEY}&MediaSourceId=${id}` +
             '&VideoCodec=h264&AudioCodec=aac,mp3&TranscodingMaxAudioChannels=2',
        type: 'hls',
        label: 'Biblioteca personal (HLS)'
      },
      {
        // Archivo original sin transcodificar (puede fallar si es .mkv)
        src: `${BASE}/Videos/${id}/stream?static=true&api_key=${KEY}`,
        type: 'mp4',
        label: 'Biblioteca personal (archivo original)'
      }
    ];
  }
};
