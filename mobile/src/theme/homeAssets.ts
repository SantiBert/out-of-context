import type { BrandAssetStatus, BrandAssetVariant } from './brandAssets';

export type HomeAssetKey =
  | 'homeLogo'
  | 'homePeople'
  | 'homeBackground'
  | 'homePlayIcon'
  | 'homeBookIcon';

export type HomeAssetEntry = {
  key: HomeAssetKey;
  /** Path relativo a `mobile/`. */
  path: string;
  status: BrandAssetStatus;
  variant: BrandAssetVariant;
  recommendedSize: string;
  /** Module id de Metro solo cuando `status === 'ready'`. */
  source: number | null;
  notes: string;
};

/**
 * Assets de la pantalla de inicio (`assets/brand/inicio/`).
 * No registrar playbutton.png ni howtoplay.png: CTAs son nativos.
 */
export const homeAssetManifest: Record<HomeAssetKey, HomeAssetEntry> = {
  homeLogo: {
    key: 'homeLogo',
    path: 'assets/brand/inicio/logo.png',
    status: 'ready',
    variant: 'light',
    recommendedSize: '1200x600',
    source: require('../../assets/brand/inicio/logo.png'),
    notes: 'Logo sticker OUT OF CONTEXT para Home.',
  },
  homePeople: {
    key: 'homePeople',
    path: 'assets/brand/inicio/people.png',
    status: 'ready',
    variant: 'neutral',
    recommendedSize: '1200x900',
    source: require('../../assets/brand/inicio/people.png'),
    notes: 'Ilustración hero de personajes; no es captura a pantalla completa.',
  },
  homeBackground: {
    key: 'homeBackground',
    path: 'assets/brand/inicio/background.png',
    status: 'ready',
    variant: 'neutral',
    recommendedSize: '1200x800',
    source: require('../../assets/brand/inicio/background.png'),
    notes:
      'Decoración de ondas menta detrás del hero; fondo de pantalla = cream.',
  },
  homePlayIcon: {
    key: 'homePlayIcon',
    path: 'assets/brand/inicio/playicon.png',
    status: 'ready',
    variant: 'neutral',
    recommendedSize: '128x128',
    source: require('../../assets/brand/inicio/playicon.png'),
    notes: 'Icono leading del CTA nativo Jugar.',
  },
  homeBookIcon: {
    key: 'homeBookIcon',
    path: 'assets/brand/inicio/book.png',
    status: 'ready',
    variant: 'neutral',
    recommendedSize: '128x128',
    source: require('../../assets/brand/inicio/book.png'),
    notes: 'Icono leading del CTA nativo Cómo se juega.',
  },
};

export function getHomeAsset(key: HomeAssetKey): HomeAssetEntry {
  return homeAssetManifest[key];
}

export function hasHomeAsset(key: HomeAssetKey): boolean {
  return homeAssetManifest[key].status === 'ready';
}

export function listReadyHomeAssets(): HomeAssetKey[] {
  return (Object.keys(homeAssetManifest) as HomeAssetKey[]).filter(
    (key) => homeAssetManifest[key].status === 'ready',
  );
}
