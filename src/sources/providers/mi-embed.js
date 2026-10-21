// src/sources/providers/mi-embed.js

export default {
  id: 'mi-embed',
  name: 'Servidor Alternativo',

  supports(req) {
    return req.type === 'movie' || req.type === 'tv';
  },

  async find(req) {
    let embedUrl = '';
    
    // 1. Usamos el dominio principal activo anunciado por la API
    const baseUrl = 'https://vidsrc.sh';

    // 2. Usamos la sintaxis `${ ... }` para que JavaScript reemplace el ID real
    if (req.type === 'movie') {
      // Formato correcto oficial: /embed/movie/{id}
      embedUrl = `${baseUrl}/movie/${req.tmdbId}`;
    } else if (req.type === 'tv') {
      // Formato correcto oficial: /embed/tv/{id}/{temporada}/{episodio}
      embedUrl = `${baseUrl}/tv/${req.tmdbId}/${req.season}/${req.episode}`;
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
