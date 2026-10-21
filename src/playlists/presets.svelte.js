/**
 * "Fuentes Comunitarias" de Canales en Vivo.
 *
 * Las listas se leen de public/listas.json (fácil de editar a mano, sin tocar código).
 * Cada entrada:  { "nombre": "...", "url": "https://..." }
 *          o:    { "nombre": "...", "archivo": "mi-lista.m3u" }   ← archivo en public/listas/
 *
 * Si listas.json no se puede leer (sin conexión, JSON mal escrito…), se usan las de respaldo.
 */

const BASE = import.meta.env.BASE_URL; // "/iptv-shell/" en GitHub Pages, "/" en desarrollo
const IPTV_ORG = 'https://iptv-org.github.io/iptv';

const FALLBACK = [
  { nombre: 'En español', descripcion: 'Todos los canales en idioma español (iptv-org)', url: `${IPTV_ORG}/languages/spa.m3u` },
  { nombre: 'México', descripcion: 'Canales de México (iptv-org)', url: `${IPTV_ORG}/countries/mx.m3u` },
  { nombre: 'Noticias', descripcion: 'Noticias de todo el mundo (iptv-org)', url: `${IPTV_ORG}/categories/news.m3u` }
];

function slug(s) {
  return String(s)
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'lista';
}

function normalizeEntry(e) {
  if (!e || typeof e !== 'object' || !e.nombre || !(e.url || e.archivo)) return null;
  const url = e.url ? String(e.url).trim() : `${BASE}listas/${encodeURIComponent(String(e.archivo).trim())}`;
  return {
    id: e.id ? slug(e.id) : slug(e.nombre),
    name: String(e.nombre),
    description: String(e.descripcion || ''),
    url
  };
}

function toPresets(entries) {
  const seen = new Set();
  return entries
    .map(normalizeEntry)
    .filter(Boolean)
    .filter((p) => (seen.has(p.id) ? false : seen.add(p.id)));
}

export const presets = $state({
  items: toPresets(FALLBACK),
  loaded: false,
  error: ''
});

let loading = null;

/** Lee public/listas.json (una vez por sesión) */
export function loadPresets() {
  loading ??= fetch(`${BASE}listas.json`, { cache: 'no-cache' })
    .then((res) => {
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return res.json();
    })
    .then((data) => {
      const list = toPresets(Array.isArray(data) ? data : data.listas || []);
      if (!list.length) throw new Error('listas.json no tiene listas válidas');
      presets.items = list;
    })
    .catch((e) => {
      console.warn('[presets] no se pudo leer listas.json, uso las de respaldo:', e.message);
      presets.error = e.message;
    })
    .finally(() => (presets.loaded = true));
  return loading;
}

export function getPreset(id) {
  return presets.items.find((p) => p.id === id) || null;
}

export function defaultPresetId() {
  return presets.items[0]?.id || '';
}
