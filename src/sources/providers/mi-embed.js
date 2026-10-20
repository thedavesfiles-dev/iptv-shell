// src/sources/providers/mi-embed.js

export default {
  id: 'mi-embed',
  name: 'Servidor Alternativo',

  // Verifica si el tipo es película o serie
  supports(req) {
    return req.type === 'movie' || req.type === 'tv';
  },

  // Construye la URL exacta usando el paquete req que envía la app
  async find(req) {
    let embedUrl = '';

    if (req.type === 'movie') {
      embedUrl = `https://vidsrc.cc{req.tmdbId}`;
    } else if (req.type === 'tv') {
      embedUrl = `https://vidsrc.cc{req.tmdbId}/${req.season}/${req.episode}`;
    }

    // Retorna la estructura Source exacta: { src, type, label }
    return [
      {
        src: embedUrl,
        type: 'iframe',
        label: 'Servidor Alternativo (Latino/Sub)'
      }
    ];
  }
};
