/**
 * Almacenamiento local del navegador.
 *  - load/save: datos pequeños en localStorage (favoritos, lista de listas).
 *  - idbGet/idbSet/idbDel: datos grandes en IndexedDB (contenido de archivos .m3u).
 * Todo va envuelto en try/catch: en modo privado o con el almacenamiento lleno
 * la app sigue funcionando, solo que sin guardar.
 */

export function load(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

export function save(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch (e) {
    console.warn('[storage] no se pudo guardar', key, e);
    return false;
  }
}

/* ---------- IndexedDB (clave → valor) ---------- */

const DB_NAME = 'iptv-shell';
const STORE = 'kv';
let dbPromise = null;

function openDb() {
  dbPromise ??= new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
  return dbPromise;
}

async function run(mode, fn) {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, mode);
    const req = fn(tx.objectStore(STORE));
    tx.oncomplete = () => resolve(req?.result);
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error);
  });
}

export const idbGet = (key) => run('readonly', (s) => s.get(key));
export const idbSet = (key, value) => run('readwrite', (s) => s.put(value, key));
export const idbDel = (key) => run('readwrite', (s) => s.delete(key));

export function newId() {
  return globalThis.crypto?.randomUUID?.() ?? `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}
