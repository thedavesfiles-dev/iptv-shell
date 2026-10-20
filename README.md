# IPTV Shell — Fase 1

Shell multimedia personal (PWA, client-side): reproductor M3U / HLS / MP4.
Stack: Vite 8 + Svelte 5 + vite-plugin-pwa + hls.js.

## Primera vez (Windows)

1. Instala Node.js LTS (v22 o superior):
   `winget install OpenJS.NodeJS.LTS`  — o descárgalo de https://nodejs.org
   Cierra y vuelve a abrir la terminal, luego verifica: `node -v` y `npm -v`
2. Entra a la carpeta del proyecto:
   `cd "C:\Users\16475\Proyectos\IPTV\iptv-shell"`
3. Instala dependencias: `npm install`
4. (Opcional, fase 2) copia `.env.example` como `.env.local` y pon tu key de TMDB.
5. Arranca en modo desarrollo: `npm run dev`
   - En la PC: http://localhost:5173
   - En el celular/TV (misma Wi-Fi): la dirección "Network" que imprime la terminal,
     p. ej. http://192.168.1.50:5173

## Comandos

| Comando           | Qué hace                                             |
|-------------------|------------------------------------------------------|
| `npm run dev`     | Servidor de desarrollo con recarga en vivo           |
| `npm run build`   | Compila la versión final en `dist/` (con PWA)        |
| `npm run preview` | Sirve `dist/` para probar el service worker / PWA    |

## Archivos de la fase 1

- `vite.config.js` — Svelte + PWA (manifest, cache de imágenes TMDB)
- `src/playlists/m3uParser.js` — `parseM3U`, `loadM3UFromUrl`, `loadM3UFromFile`, `filterChannels`
- `src/player/Player.svelte` — reproductor HLS/MP4/iframe con selector de calidad y teclas de TV
- `src/player/detectType.js` — detecta hls / mp4 / iframe por la URL
- `src/App.svelte` — pantalla de prueba: carga listas y reproduce canales

## Notas

- Si una lista o stream falla con "CORS", es una restricción del navegador, no del código:
  descarga la lista y ábrela como archivo, o espera la fase con Capacitor/proxy.
- La PWA solo se puede "instalar" con HTTPS (o en localhost). En la red local por IP
  funciona la app, pero no el botón de instalar; para eso publícala en GitHub Pages / Netlify.

## Fase 2 — TMDB + navegación

- `.env.local` — tu token (`VITE_TMDB_KEY`). Si lo cambias, reinicia `npm run dev`.
- `src/api/tmdb.js` — `getTrending`, `search`, `getDetails`, `img` (acepta token v4 o key v3)
- `src/App.svelte` — navegación por `#/catalogo` y `#/vivo` (funciona el botón Atrás)
- `src/components/NavBar.svelte`, `PosterGrid.svelte`, `DetailView.svelte`
- `src/views/CatalogView.svelte` — tendencias (hoy/semana), filtro película/serie, búsqueda, scroll infinito
- `src/views/LiveView.svelte` — lo que antes era la pantalla de canales
- `src/stores/live.svelte.js` — la lista cargada se conserva al cambiar de pestaña

## Fase 3 — Fuentes de video

- `src/sources/resolve.js` — `resolveSources(req)` (proveedores por TMDB/IMDb) y `resolveUrl(url)` (URL pegada)
- `src/sources/providers/` — registro de proveedores: `archive.js` (dominio público), `jellyfin.js` (tu servidor)
- `src/scrapers/generic.js` — extrae `<video>`, `<source>`, `og:video`, `.m3u8/.mp4` y `<iframe>` de una página
- `src/player/MultiPlayer.svelte` — prueba fuentes en orden (HLS → MP4 → iframe) y salta a la siguiente si una falla
- El iframe de respaldo va con `sandbox` (sin pop-ups ni redirecciones de la página principal)

## Despliegue — GitHub Pages

- `vite.config.js` usa `base: '/iptv-shell/'` al compilar (cámbialo en `REPO_NAME` si renombras el repo).
- `.github/workflows/deploy.yml` compila y publica en cada push a `main`.
- El token se configura como secreto del repo: **Settings → Secrets and variables → Actions → `VITE_TMDB_KEY`**.
- Publicación: **Settings → Pages → Source: GitHub Actions**. URL: `https://<usuario>.github.io/iptv-shell/`
- Probar la versión compilada en local: `npm run build` y luego `npm run preview` → http://localhost:4173/iptv-shell/
