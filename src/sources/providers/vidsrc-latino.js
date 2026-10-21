// src/sources/providers/vidsrc-latino.js

const provider = {
  id: 'vidsrc-latino',
  name: 'Servidor Latino (Audio)',

  supports(req) {
    return req && (req.type === 'movie' || req.type === 'tv');
  },

  async find(req) {
    if (!req) return [];
    
    let embedUrl = '';
    
    // Cambiamos al reproductor API real que indexa doblajes en Español Latino y Castellano
    const baseUrl = 'https://vidsrc.cc/v2/embed';

    if (req.type === 'movie') {
      const movieId = req.imdbId || req.tmdbId;
      if (!movieId) return [];
      embedUrl = `${baseUrl}/movie/${movieId}`;
      
    } else if (req.type === 'tv') {
      const serieId = req.imdbId || req.tmdbId;
      if (!serieId) return [];
      
      const temporadaNum = req.season || 1;
      const episodioNum = req.episode || 1;
      
      // Estructura oficial multilingüe: /tv/{id}/{temporada}/{episodio}
      embedUrl = `${baseUrl}/tv/${serieId}/${temporadaNum}/${episodioNum}`;
    }

    return [
      {
        src: embedUrl,
        type: 'iframe',
        label: 'Servidor Latino (Doblado)'
      }
    ];
  }
};

export default provider;

