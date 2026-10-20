/**
 * Parser de listas M3U / M3U8 "extendidas" (formato IPTV).
 *
 * Soporta:
 *   #EXTM3U url-tvg="..." x-tvg-url="..."         -> cabecera (guía EPG)
 *   #EXTINF:-1 tvg-id="" tvg-name="" tvg-logo="" group-title="",Nombre del canal
 *   #EXTGRP:Grupo                                   -> grupo alternativo
 *   #EXTVLCOPT:http-user-agent=... / http-referrer=...
 *   #KODIPROP:...                                   -> se guarda pero no se usa
 *   Líneas de URL sin #EXTINF (listas "simples")
 *
 * Devuelve: { header, channels, groups }
 *   channel = { id, name, url, logo, group, tvgId, tvgName, duration, attrs, httpHeaders }
 */

const ATTR_RE = /([\w-]+)="([^"]*)"/g;

/** Extrae pares clave="valor" de un fragmento de línea */
function parseAttributes(str) {
  const attrs = {};
  for (const m of str.matchAll(ATTR_RE)) attrs[m[1].toLowerCase()] = m[2];
  return attrs;
}

/**
 * Separa "#EXTINF:-1 attr="a, b",Nombre" en duración, atributos y título.
 * La coma que separa el título es la primera coma FUERA de comillas.
 */
function splitExtinf(body) {
  let inQuotes = false;
  let commaIdx = -1;
  for (let i = 0; i < body.length; i++) {
    const ch = body[i];
    if (ch === '"') inQuotes = !inQuotes;
    else if (ch === ',' && !inQuotes) { commaIdx = i; break; }
  }
  const meta = commaIdx === -1 ? body : body.slice(0, commaIdx);
  const title = commaIdx === -1 ? '' : body.slice(commaIdx + 1).trim();
  const durationMatch = meta.match(/^\s*(-?\d+(?:\.\d+)?)/);
  return {
    duration: durationMatch ? Number(durationMatch[1]) : -1,
    attrs: parseAttributes(meta),
    title
  };
}

function isUrlLine(line) {
  return /^(https?|rtmp|rtsp|udp|rtp|mms):\/\//i.test(line) || /^[./]/.test(line);
}

/** Resuelve URLs relativas contra la URL de la lista (si se conoce) */
function resolveUrl(url, baseUrl) {
  if (!baseUrl) return url;
  try { return new URL(url, baseUrl).href; } catch { return url; }
}

/**
 * Parsea el texto de una lista M3U.
 * @param {string} text   Contenido de la lista
 * @param {object} [opts]
 * @param {string} [opts.baseUrl]  URL de origen, para resolver rutas relativas
 */
export function parseM3U(text, { baseUrl } = {}) {
  if (typeof text !== 'string') throw new TypeError('parseM3U espera un string');

  const lines = text.replace(/^﻿/, '').split(/\r?\n/);
  const header = {};
  const channels = [];
  const groupSet = new Set();

  let pending = null; // datos acumulados del #EXTINF hasta encontrar la URL

  const newPending = () => ({ attrs: {}, httpHeaders: {}, kodiProps: {} });

  for (const raw of lines) {
    const line = raw.trim();
    if (!line) continue;

    if (line.startsWith('#EXTM3U')) {
      Object.assign(header, parseAttributes(line));
      continue;
    }

    if (line.startsWith('#EXTINF:')) {
      const { duration, attrs, title } = splitExtinf(line.slice(8));
      pending = { ...newPending(), ...(pending || {}), duration, attrs, title };
      continue;
    }

    if (line.startsWith('#EXTGRP:')) {
      pending = pending || newPending();
      pending.extgrp = line.slice(8).trim();
      continue;
    }

    if (line.startsWith('#EXTVLCOPT:')) {
      pending = pending || newPending();
      const [key, ...rest] = line.slice(11).split('=');
      const value = rest.join('=').trim();
      const k = key.trim().toLowerCase();
      if (k === 'http-user-agent') pending.httpHeaders['User-Agent'] = value;
      else if (k === 'http-referrer' || k === 'http-referer') pending.httpHeaders['Referer'] = value;
      else if (k === 'http-origin') pending.httpHeaders['Origin'] = value;
      continue;
    }

    if (line.startsWith('#KODIPROP:')) {
      pending = pending || newPending();
      const [key, ...rest] = line.slice(10).split('=');
      pending.kodiProps[key.trim()] = rest.join('=').trim();
      continue;
    }

    if (line.startsWith('#')) continue; // otras directivas / comentarios

    if (isUrlLine(line)) {
      const p = pending || newPending();
      const url = resolveUrl(line, baseUrl);
      let name = p.title || p.attrs['tvg-name'] || url.split('/').pop() || 'Canal';
      let group = p.attrs['group-title'] || p.extgrp || '';
      // Listas sin group-title que usan el formato "[MX]Canal": el prefijo se usa como grupo
      const prefix = !group && name.match(/^\[([^\]]{1,20})\]\s*(.+)$/);
      if (prefix) { group = prefix[1]; name = prefix[2]; }
      group = group || 'Sin grupo';

      groupSet.add(group);
      channels.push({
        id: `${channels.length}-${p.attrs['tvg-id'] || name}`,
        name,
        url,
        logo: p.attrs['tvg-logo'] || '',
        group,
        tvgId: p.attrs['tvg-id'] || '',
        tvgName: p.attrs['tvg-name'] || '',
        duration: p.duration ?? -1,
        attrs: p.attrs,
        httpHeaders: p.httpHeaders,
        kodiProps: p.kodiProps
      });
      pending = null;
    }
  }

  return {
    header: {
      ...header,
      epgUrl: header['url-tvg'] || header['x-tvg-url'] || ''
    },
    channels,
    groups: [...groupSet].sort((a, b) => a.localeCompare(b, 'es'))
  };
}

/**
 * Descarga y parsea una lista desde una URL.
 * Ojo: en el navegador fallará si el servidor no envía cabeceras CORS.
 * (Con Capacitor o con el proxy de la fase siguiente se resuelve.)
 */
export async function loadM3UFromUrl(url, { signal } = {}) {
  const res = await fetch(url, { signal });
  if (!res.ok) throw new Error(`No se pudo descargar la lista (HTTP ${res.status})`);
  const text = await res.text();
  return parseM3U(text, { baseUrl: res.url || url });
}

/** Lee y parsea un archivo .m3u elegido con <input type="file"> */
export async function loadM3UFromFile(file) {
  const text = await file.text();
  return parseM3U(text);
}

/** Filtra canales por grupo y texto de búsqueda (sin acentos ni mayúsculas) */
export function filterChannels(channels, { group = '', query = '' } = {}) {
  const norm = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
  const q = norm(query.trim());
  return channels.filter(
    (c) => (!group || c.group === group) && (!q || norm(c.name).includes(q))
  );
}
