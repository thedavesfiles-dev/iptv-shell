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
    
    // Cambiamos al reproductor API de VidLink que permite incrustación en iframes de desarrollo
    const baseUrl = 'https://vidlink.pro';

    if (req.type === 'movie') {
      const movieId = req.tmdbId || req.imdbId;
      if (!movieId) return [];
      embedUrl = `${baseUrl}/movie/${movieId}`;
      
    } else if (req.type === 'tv') {
      const serieId = req.tmdbId || req.imdbId;
      if (!serieId) return [];
      
      const temporadaNum = req.season || 1;
      const episodioNum = req.episode || 1;
      
      // Formato oficial abierto: /embed/tv/{id}/{temporada}/{episodio}
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


