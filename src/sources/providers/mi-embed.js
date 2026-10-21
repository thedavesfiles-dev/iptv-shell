// src/sources/providers/mi-embed.js

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
      // 1. En películas, el ID se guarda directo en req.tmdbId o req.imdbId
      const movieId = req.imdbId || req.tmdbId;
      embedUrl = `${baseUrl}/movie/${movieId}`;
      
    } else if (req.type === 'tv') {
      // 2. ¡AQUÍ ESTÁ LA CLAVE! En las series, tu app agrupa los datos dentro de req.show
      // Buscamos de forma segura el identificador de la serie
      const serieId = req.show?.imdbId || req.imdbId || req.show?.tmdbId || req.tmdbId;
      
      // 3. Tu app maneja las temporadas y episodios como objetos. 
      // Extraemos exclusivamente el número entero (.number) para armar la URL oficial de VidSrc
      const temporadaNum = req.season?.number || req.season;
      const episodioNum = req.episode?.number || req.episode;
      
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


