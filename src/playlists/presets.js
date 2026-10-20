/**
 * Listas M3U predefinidas ("Fuentes Comunitarias").
 *
 * - iptv-org (https://github.com/iptv-org/iptv): proyecto mantenido que solo
 *   incluye canales que sus dueños emiten gratis y en abierto. Se actualiza a
 *   diario y su servidor permite CORS, así que carga directo en el navegador.
 * - imDazui/Tvlist-awesome-m3u-m3u8: lista comunitaria de televisoras
 *   internacionales (actualizada por última vez en 2024; muchos enlaces pueden
 *   estar caídos y más de la mitad son http://).
 *
 * Para agregar otra: { id, name, description, url }. La URL debe ser el enlace
 * "Raw" del archivo .m3u (raw.githubusercontent.com/... o similar).
 */

const IPTV_ORG = 'https://iptv-org.github.io/iptv';
const IMDAZUI = 'https://raw.githubusercontent.com/imDazui/Tvlist-awesome-m3u-m3u8/master/m3u';

export const PRESETS = [
  {
    id: 'es',
    name: 'En español',
    description: 'Todos los canales en idioma español (iptv-org)',
    url: `${IPTV_ORG}/languages/spa.m3u`
  },
  {
    id: 'mx',
    name: 'México',
    description: 'Canales de México (iptv-org)',
    url: `${IPTV_ORG}/countries/mx.m3u`
  },
  {
    id: 'ca',
    name: 'Canadá',
    description: 'Canales de Canadá (iptv-org)',
    url: `${IPTV_ORG}/countries/ca.m3u`
  },
  {
    id: 'news',
    name: 'Noticias',
    description: 'Noticias de todo el mundo (iptv-org)',
    url: `${IPTV_ORG}/categories/news.m3u`
  },
  {
    id: 'movies',
    name: 'Películas 24/7',
    description: 'Canales gratuitos de cine con publicidad (iptv-org)',
    url: `${IPTV_ORG}/categories/movies.m3u`
  },
  {
    id: 'kids',
    name: 'Infantiles',
    description: 'Canales para niños (iptv-org)',
    url: `${IPTV_ORG}/categories/kids.m3u`
  },
  {
    id: 'music',
    name: 'Música',
    description: 'Canales musicales (iptv-org)',
    url: `${IPTV_ORG}/categories/music.m3u`
  },
  {
    id: 'intl-imdazui',
    name: 'Internacionales (imDazui)',
    description: 'Televisoras de varios países · lista de 2024, muchos enlaces http',
    url: `${IMDAZUI}/${encodeURIComponent('国外电视台202409.m3u')}`
  }
];

export const DEFAULT_PRESET_ID = 'es';

export function getPreset(id) {
  return PRESETS.find((p) => p.id === id) || null;
}
