import { defineConfig } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import { VitePWA } from 'vite-plugin-pwa';

// Nombre del repositorio en GitHub. La app se publica en
// https://<tu-usuario>.github.io/<REPO_NAME>/ y todas las rutas cuelgan de ahí.
// Si renombras el repo, cambia esto (o define BASE_PATH al compilar).
const REPO_NAME = 'iptv-shell';

export default defineConfig(({ command, isPreview }) => ({
  // En desarrollo la app vive en "/"; al compilar (y en `npm run preview`) en "/iptv-shell/".
  // vite-plugin-pwa toma este mismo `base` para el service worker y el manifest.
  base: process.env.BASE_PATH || (command === 'build' || isPreview ? `/${REPO_NAME}/` : '/'),

  plugins: [
    svelte(),
    VitePWA({
      // El service worker se actualiza solo cuando publicas una nueva versión
      registerType: 'autoUpdate',
      includeAssets: ['icons/icon-192.png', 'icons/icon-512.png'],

      manifest: {
        name: 'FD-TV',
        short_name: 'FD-TV',
        description: 'FD-TV: canales en vivo, películas y series',
        lang: 'es',
        start_url: '.',
        scope: '.',
        display: 'standalone',
        orientation: 'any', // celular vertical, TV/PC horizontal
        background_color: '#0c0807',
        theme_color: '#140d0b',
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' }
        ]
      },

      workbox: {
        // Cachea solo el "caparazón" de la app (HTML, JS, CSS, íconos)
        globPatterns: ['**/*.{js,css,html,png,svg,ico,webmanifest,woff2}'],
        navigateFallback: 'index.html',
        runtimeCaching: [
          {
            // Posters y fondos de TMDB: cache-first para no volver a descargarlos
            urlPattern: ({ url }) => url.hostname === 'image.tmdb.org',
            handler: 'CacheFirst',
            options: {
              cacheName: 'tmdb-images',
              expiration: { maxEntries: 500, maxAgeSeconds: 60 * 60 * 24 * 30 },
              cacheableResponse: { statuses: [0, 200] }
            }
          },
          {
            // Respuestas JSON de la API de TMDB: red primero, cache como respaldo
            urlPattern: ({ url }) => url.hostname === 'api.themoviedb.org',
            handler: 'NetworkFirst',
            options: {
              cacheName: 'tmdb-api',
              networkTimeoutSeconds: 5,
              expiration: { maxEntries: 200, maxAgeSeconds: 60 * 60 * 24 }
            }
          }
          // Los streams de video (.m3u8, .ts, .mp4) NO se cachean a propósito:
          // llenarían el almacenamiento del dispositivo y romperían el "en vivo".
        ]
      },

      // Pon enabled: true si quieres probar el service worker en `npm run dev`
      devOptions: { enabled: false }
    })
  ],

  build: {
    chunkSizeWarningLimit: 800 // hls.js pesa ~500 kB; es normal
  },

  server: {
    host: true, // expone el servidor en tu red local (para abrirlo en celular/TV)
    port: 5173
  }
}));
