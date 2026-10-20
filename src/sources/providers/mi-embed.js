// src/sources/providers/mi-embed.js

export default {
  id: 'mi-embed',
  name: 'Servidores Alternativos',

  supports(req) {
    return req.type === 'movie' || req.type === 'tv';
  },

  async find(req) {
    const fuentes = [];

    // Servidor 1: VidSrc CC
    if (req.type === 'movie') {
      fuentes.push({ src: `https://vidsrc.cc{req.tmdbId}`, type: 'iframe', label: 'Espejo Principal (Latino/Sub)' });
    } else {
      fuentes.push({ src: `https://vidsrc.cc{req.tmdbId}/${req.season}/${req.episode}`, type: 'iframe', label: 'Espejo Principal (Latino/Sub)' });
    }

    // Servidor 2: VidSrc TO (Alternativo muy usado en Anime)
    if (req.type === 'movie') {
      fuentes.push({ src: `https://vidsrc.to{req.tmdbId}`, type: 'iframe', label: 'Espejo 2 (Castellano/Sub)' });
    } else {
      fuentes.push({ src: `https://vidsrc.to{req.tmdbId}/${req.season}/${req.episode}`, type: 'iframe', label: 'Espejo 2 (Castellano/Sub)' });
    }

    // Servidor 3: AutoEmbed (Agregador secundario por ID de IMDb)
    if (req.imdbId) {
      if (req.type === 'movie') {
        fuentes.push({ src: `https://autoembed.cc{req.imdbId}`, type: 'iframe', label: 'Espejo 3 (Multilenguaje)' });
      } else {
        fuentes.push({ src: `https://autoembed.cc{req.imdbId}/${req.season}/${req.episode}`, type: 'iframe', label: 'Espejo 3 (Multilenguaje)' });
      }
    }

    return fuentes;
  }
};
