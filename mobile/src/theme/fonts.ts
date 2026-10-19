import { useFonts } from 'expo-font';

import { fontFamilies } from './theme';

const fontMap = {
  [fontFamilies.display]: require('../../assets/fonts/Baloo2-SemiBold.ttf'),
  [fontFamilies.displayBold]: require('../../assets/fonts/Baloo2-Bold.ttf'),
};

/** Carga Baloo 2. Devuelve true cuando las fuentes están listas (o el mock de tests). */
export function useAppFonts(): boolean {
  const [loaded] = useFonts(fontMap);
  return loaded;
}
