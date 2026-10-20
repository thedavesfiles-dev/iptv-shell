// Estado compartido de "Canales en Vivo".
// Vive fuera del componente para que la lista cargada no se pierda al cambiar de pestaña.
export const live = $state({
  presetId: '',       // fuente comunitaria seleccionada ('' = lista propia / archivo)
  sourceName: '',
  playlistUrl: '',
  channels: [],
  groups: [],
  group: '',
  query: '',
  onlyHttps: true,    // en la web (https) oculta canales http:// que el navegador bloquea
  current: null,
  message: ''
});
