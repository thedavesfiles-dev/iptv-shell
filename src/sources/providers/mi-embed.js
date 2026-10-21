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
    const baseUrl = 'https://vidsrc.sh';

    if (req.type === 'movie') {
      const movieId = req.imdbId || req.tmdbId;
      if (!movieId) return [];
      embedUrl = `${baseUrl}/movie/${movieId}`;
      
    } else if (req.type === 'tv') {
      const serieId = req.imdbId || req.tmdbId;
      if (!serieId) return [];
      
      // Mapeo directo usando el contrato nativo de tu index.js
      const temporadaNum = req.season || 1;
      const episodioNum = req.episode || 1;
      
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

// ESTA ES LA LÍNEA QUE FALTA Y QUE REPARA EL ERROR DE GITHUB
export default provider;

