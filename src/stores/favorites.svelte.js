/**
 * Favoritos: canales en vivo y películas/series.
 * Se guardan en localStorage, así que son por dispositivo (cada teléfono tiene los suyos).
 */
import { load, save } from '../lib/storage.js';

const KEY = 'iptv-shell:favorites';
const initial = load(KEY, {});

export const favorites = $state({
  channels: initial.channels || [], // { id, name, url, logo, group }
  titles: initial.titles || []      // { key, id, type, title, year, poster, ... }
});

function persist() {
  save(KEY, $state.snapshot(favorites));
}

// Otra pestaña de la misma app cambió los favoritos → sincronizar
if (typeof window !== 'undefined') {
  window.addEventListener('storage', (e) => {
    if (e.key !== KEY) return;
    const next = load(KEY, {});
    favorites.channels = next.channels || [];
    favorites.titles = next.titles || [];
  });
}

/* ---------- Canales (se identifican por su URL) ---------- */

export function isFavChannel(url) {
  return !!url && favorites.channels.some((c) => c.url === url);
}

export function toggleChannel(ch) {
  if (!ch?.url) return;
  if (isFavChannel(ch.url)) {
    favorites.channels = favorites.channels.filter((c) => c.url !== ch.url);
  } else {
    favorites.channels = [
      { id: `fav-${ch.url}`, name: ch.name, url: ch.url, logo: ch.logo || '', group: ch.group || '' },
      ...favorites.channels
    ];
  }
  persist();
}

/* ---------- Películas y series (clave "movie-123" / "tv-456") ---------- */

export function isFavTitle(key) {
  return !!key && favorites.titles.some((t) => t.key === key);
}

export function toggleTitle(item) {
  if (!item?.key) return;
  if (isFavTitle(item.key)) {
    favorites.titles = favorites.titles.filter((t) => t.key !== item.key);
  } else {
    const { key, id, type, title, originalTitle, year, overview, poster, backdrop, rating, votes } = item;
    favorites.titles = [
      { key, id, type, title, originalTitle, year, overview, poster, backdrop, rating, votes },
      ...favorites.titles
    ];
  }
  persist();
}
