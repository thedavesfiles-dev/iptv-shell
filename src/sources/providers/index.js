// src/sources/index.js
import miEmbed from './mi-embed.js';
import jellyfin from './jellyfin.js';
import archive from './archive.js';

// Creamos una lista limpia de proveedores registrados
const providersList = [miEmbed, jellyfin, archive];

// Exportamos un objeto compatible con lo que el motor de tu reproductor espera consumir
export default {
  providers: providersList,
  
  // Añadimos un método de filtrado directo por si el motor de la app lo llama desde aquí
  filter(callback) {
    return providersList.filter(callback);
  },
  
  // Añadimos soporte para bucles directos en caso de que la app recorra el objeto completo
  forEach(callback) {
    providersList.forEach(callback);
  }
};


