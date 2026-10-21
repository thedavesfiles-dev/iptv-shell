// C:\Users\16475\Proyectos\IPTV\iptv-shell\src\sources\providers\mi-embed.js

export default {
  id: 'mi-embed',
  name: 'Servidor Alternativo',

  supports(req) {
    return req.type === 'movie' || req.type === 'tv';
  },

  async find(req) {
    let embedUrl = '';
    const baseUrl = 'https://vidsrc.sh';

    if (req.type === 'movie') {
      // Si hay IMDb ID (tt...) lo prefiere, si no usa TMDB numérico
      const movieId = req.imdbId || req.tmdbId;
      embedUrl = `${baseUrl}/movie/${movieId}`;
      
    } else if (req.type === 'tv') {
      // Las series en VidSrc exigen obligatoriamente el IMDb ID (tt...) para no dar 404
      const serieId = req.imdbId || req.tmdbId;
      
      // Según el contrato de tu archivo index, llegan directo como req.season y req.episode
      const temporadaNum = req.season;
      const episodioNum = req.episode;
      
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


