// C:\Users\16475\Proyectos\IPTV\iptv-shell\src\sources\providers\mi-embed.js

export default {
  id: 'mi-embed',
  name: 'Servidor Alternativo',

  supports(req) {
    return req.type === 'movie' || req.type === 'tv';
  },

  async find(req) {
    let embedUrl = '';
    
    // Usamos el dominio principal activo anunciado por la API
    const baseUrl = 'https://vidsrc.sh';

    if (req.type === 'movie') {
      // En películas, la estructura de tu proyecto guarda el ID directo en req.tmdbId
      const movieId = req.imdbId || req.tmdbId;
      embedUrl = `${baseUrl}/movie/${movieId}`;
      
    } else if (req.type === 'tv') {
      // ¡AQUÍ ESTABA EL ERROR! En series, tu arquitectura guarda los datos dentro de req.show
      // Buscamos primero el imdbId en req.show.imdbId o req.imdbId
      const serieId = req.show?.imdbId || req.imdbId || req.show?.tmdbId || req.tmdbId;
      
      // Estructura oficial: /embed/tv/{id}/{temporada}/{episodio}
      embedUrl = `${baseUrl}/tv/${serieId}/${req.season.number}/${req.episode.number}`;
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

