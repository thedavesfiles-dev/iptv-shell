// Estado compartido de "Canales en Vivo".
// Vive fuera del componente para que la lista cargada no se pierda al cambiar de pestaña.
export const live = $state({
  playlistUrl: '',
  channels: [],
  groups: [],
  group: '',
  query: '',
  current: null,
  message: ''
});
