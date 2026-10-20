// src/sources/providers/mi-embed.js

export default {
  id: 'mi-embed',
  name: 'Servidor Alternativo',

  supports(req) {
    return req.type === 'movie' || req.type === 'tv';
  },

  async find(req) {
    let embedUrl = '';

    // Usamos el dominio activo vidsrc.me con las variables bien estructuradas
    if (req.type === 'movie') {
      embedUrl = `https://vidsrc.me{req.tmdbId}`;
    } else if (req.type === 'tv') {
      embedUrl = `https://vidsrc.me{req.tmdbId}&sea=${req.season}&epi=${req.episode}`;
    }

    return [
      {
        src: embedUrl,
        type: 'iframe',
        label: 'Servidor Principal (Latino/Sub)'
      }
    ];
  }
};
