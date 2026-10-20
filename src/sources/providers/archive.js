/**
 * Proveedor: Internet Archive (archive.org) — películas de dominio público.
 *
 * Empareja por título original + año (±1) dentro de la colección "feature_films"
 * y devuelve el archivo de video directo (.mp4 / .webm / .ogv).
 * archive.org envía cabeceras CORS, así que funciona desde el navegador.
 *
 * Títulos para probar: "Night of the Living Dead" (1968), "Nosferatu" (1922),
 * "His Girl Friday" (1940), "Charade" (1963), "The General" (1926).
 */

const SEARCH = 'https://archive.org/advancedsearch.php';

async function getJson(url, signal) {
  const res = await fetch(url, { signal });
  if (!res.ok) throw new Error(`archive.org HTTP ${res.status}`);
  return res.json();
}

// Prefiere MP4 h.264 (máxima compatibilidad) y luego el de mayor tamaño
function scoreFile(f) {
  const name = f.name.toLowerCase();
  let s = 0;
  if (name.endsWith('.mp4') || name.endsWith('.m4v')) s += 1000;
  if (/h\.?264|mpeg4|512kb/i.test(f.format || '')) s += 100;
  if (/\.ia\.mp4$/.test(name)) s -= 50; // derivados de baja calidad
  s += Math.min(Number(f.size) || 0, 5e9) / 1e7; // + tamaño (aprox. calidad)
  return s;
}

const encodePath = (p) => p.split('/').map(encodeURIComponent).join('/');

export default {
  id: 'archive',
  name: 'Internet Archive',

  supports(req) {
    return req.type === 'movie' && Boolean(req.originalTitle || req.title);
  },

  async find(req, { signal }) {
    const titles = [...new Set([req.originalTitle, req.title].filter(Boolean))];
    const year = parseInt(req.year, 10);
    const out = [];

    for (const t of titles) {
      const clean = t.replace(/["\\:]/g, ' ').trim();
      let q = `title:("${clean}") AND mediatype:(movies) AND collection:(feature_films)`;
      if (year) q += ` AND year:[${year - 1} TO ${year + 1}]`;

      const url =
        `${SEARCH}?q=${encodeURIComponent(q)}` +
        '&fl[]=identifier&fl[]=title&fl[]=year&sort[]=downloads+desc&rows=3&output=json';

      const docs = (await getJson(url, signal)).response?.docs || [];

      for (const doc of docs.slice(0, 2)) {
        const meta = await getJson(`https://archive.org/metadata/${doc.identifier}`, signal);
        const files = (meta.files || [])
          .filter((f) => /\.(mp4|m4v|webm|ogv)$/i.test(f.name))
          .sort((a, b) => scoreFile(b) - scoreFile(a));
        const best = files[0];
        if (!best) continue;
        out.push({
          src: `https://archive.org/download/${doc.identifier}/${encodePath(best.name)}`,
          type: 'mp4',
          label: `${doc.title}${doc.year ? ` (${doc.year})` : ''}`
        });
      }
      if (out.length) break; // ya encontró con el primer título
    }
    return out;
  }
};
