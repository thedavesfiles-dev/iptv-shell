// C:\Users\16475\Proyectos\IPTV\iptv-shell\src\sources\providers\mi-embed.js

export const id = 'mi-embed';
export const name = 'Servidor Alternativo';

export function supports(req) {
  return req && (req.type === 'movie' || req.type === 'tv');
}

export async function find(req) {
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
