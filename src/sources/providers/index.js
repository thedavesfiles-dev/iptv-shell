/**
 * Registro de proveedores de video.
 *
 * Contrato de cada proveedor:
 *   {
 *     id: 'mi-proveedor',
 *     name: 'Nombre visible',
 *     supports(req) -> boolean,                    // ¿puede buscar este título?
 *     async find(req, { signal }) -> Source[]      // [] si no lo tiene
 *   }
 *   Source = { src, type: 'hls'|'mp4'|'iframe', label }
 *
 *   req = { type: 'movie'|'tv', tmdbId, imdbId, title, originalTitle, year, season?, episode? }
 *
 * Para agregar uno nuevo: crea el archivo en esta carpeta e impórtalo aquí.
 * El orden del arreglo es la prioridad cuando dos fuentes son del mismo tipo.
 */
import miEmbed from './mi-embed.js';
import jellyfin from './jellyfin.js';
import archive from './archive.js';

export default [miEmbed, jellyfin, archive];

