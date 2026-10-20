/**
 * "Mis listas": listas M3U guardadas por el usuario (por URL o por archivo).
 * - Los datos de cada lista (nombre, URL…) van en localStorage.
 * - El contenido de los archivos subidos va en IndexedDB (pueden pesar varios MB).
 */
import { load, save, idbGet, idbSet, idbDel, newId } from '../lib/storage.js';
import { parseM3U, loadM3UFromUrl } from '../playlists/m3uParser.js';

const KEY = 'iptv-shell:playlists';
const fileKey = (id) => `playlist-file:${id}`;

export const myLists = $state({ items: load(KEY, []) });

function persist() {
  save(KEY, $state.snapshot(myLists.items));
}

export function getList(id) {
  return myLists.items.find((p) => p.id === id) || null;
}

/**
 * Guarda una lista nueva. Devuelve { list, result } con los canales ya procesados.
 * - Por archivo: se valida que tenga canales antes de guardarla.
 * - Por URL: se guarda aunque la descarga falle (puede ser CORS o falta de red
 *   momentánea); en ese caso `result` es null y `error` trae el motivo.
 */
export async function addList({ name, url, file }) {
  const id = newId();
  if (file) {
    const text = await file.text();
    const result = parseM3U(text);
    if (!result.channels.length) throw new Error('El archivo no contiene canales M3U válidos.');
    await idbSet(fileKey(id), text);
    const list = { id, name: name || file.name, kind: 'file', fileName: file.name, addedAt: Date.now() };
    myLists.items.push(list);
    persist();
    return { list, result };
  }

  const list = { id, name: name || url, kind: 'url', url, addedAt: Date.now() };
  myLists.items.push(list);
  persist();
  try {
    return { list, result: await loadM3UFromUrl(url) };
  } catch (error) {
    return { list, result: null, error };
  }
}

/** Descarga (URL) o lee (archivo) y procesa una lista guardada */
export async function openList(id) {
  const list = getList(id);
  if (!list) throw new Error('La lista ya no existe.');
  if (list.kind === 'url') return loadM3UFromUrl(list.url);
  const text = await idbGet(fileKey(id));
  if (!text) throw new Error('No se encontró el archivo guardado en este dispositivo.');
  return parseM3U(text);
}

export function renameList(id, name) {
  const list = getList(id);
  if (!list || !name.trim()) return;
  list.name = name.trim();
  persist();
}

export async function removeList(id) {
  myLists.items = myLists.items.filter((p) => p.id !== id);
  persist();
  await idbDel(fileKey(id)).catch(() => {});
}
