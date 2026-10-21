// src/sources/providers/mi-embed.js

const provider = {
  id: 'mi-embed',
  name: 'Servidor Alternativo',

  supports(req) {
    return req && (req.type === 'movie' || req.type === 'tv');
  },

  async find(req) {
    if (!req) return [];
    
    let embedUrl = '';
    
    // Cambiamos al espejo .cc que traduce los IDs numéricos de TMDB automáticamente en series
    const baseUrl = 'https://vidsrc.cc';

    if (req.type === 'movie') {
      const movieId = req.imdbId || req.tmdbId;
      if (!movieId) return [];
      embedUrl = `${baseUrl}/movie/${movieId}`;
      
    } else if (req.type === 'tv') {
      const serieId = req.imdbId || req.tmdbId;
      if (!serieId) return [];
      
      const temporadaNum = req.season || 1;
      const episodioNum = req.episode || 1;
      
      // Estructura oficial del espejo compatible: /tv/{id}/{temporada}/{episodio}
      embedUrl = `${baseUrl}/tv/${serieId}/${temporadaNum}/${episodioNum}`;
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

export default provider;

