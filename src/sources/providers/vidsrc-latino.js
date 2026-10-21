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
    const baseUrl = 'https://vidsrc.me.ss';

    if (req.type === 'movie') {
      const movieId = req.tmdbId || req.imdbId;
      if (!movieId) return [];
      embedUrl = `${baseUrl}/movie/${movieId}`;
      
    } else if (req.type === 'tv') {
      const serieId = req.tmdbId || req.imdbId;
      if (!serieId) return [];
      
      const temporadaNum = req.season || 1;
      const episodioNum = req.episode || 1;
      
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
