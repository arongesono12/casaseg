// Los iconos sueltos de @hugeicons/core-free-icons no traen tipos por archivo;
// se importan por subruta para no empaquetar los miles del barril.
declare module '@hugeicons/core-free-icons/*' {
  import type { IconSvgElement } from '@hugeicons/react-native';

  const icon: IconSvgElement;
  export default icon;
}
