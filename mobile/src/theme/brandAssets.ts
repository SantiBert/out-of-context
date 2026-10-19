export type BrandAssetKey =
  'logoLight' | 'logoDark' | 'markLight' | 'markDark' | 'splash' | 'appIcon';

export type BrandAssetStatus = 'ready' | 'missing';

export type BrandAssetVariant = 'light' | 'dark' | 'neutral';

export type BrandAssetEntry = {
  key: BrandAssetKey;
  /** Path relativo a `mobile/` para documentación e integración futura. */
  path: string;
  status: BrandAssetStatus;
  variant: BrandAssetVariant;
  recommendedSize: string;
  /** Module id de Metro solo cuando `status === 'ready'`. */
  source: number | null;
  notes: string;
};

/**
 * Registro central de assets de marca (OOC-020.3).
 * No hacer `require` de paths inexistentes: Metro falla en build.
 * Al recibir PNG aprobados, añadir require y marcar `ready`.
 */
export const brandAssetManifest: Record<BrandAssetKey, BrandAssetEntry> = {
  logoLight: {
    key: 'logoLight',
    path: 'assets/brand/logo-light.png',
    status: 'missing',
    variant: 'light',
    recommendedSize: '1200x400',
    source: null,
    notes:
      'Logo horizontal sobre fondos claros. Bloqueado: falta archivo aprobado.',
  },
  logoDark: {
    key: 'logoDark',
    path: 'assets/brand/logo-dark.png',
    status: 'missing',
    variant: 'dark',
    recommendedSize: '1200x400',
    source: null,
    notes:
      'Logo horizontal sobre fondos oscuros. Bloqueado: falta archivo aprobado.',
  },
  markLight: {
    key: 'markLight',
    path: 'assets/brand/mark-light.png',
    status: 'missing',
    variant: 'light',
    recommendedSize: '1024x1024',
    source: null,
    notes: 'Mark / glyph para UI sobre fondos claros. Bloqueado.',
  },
  markDark: {
    key: 'markDark',
    path: 'assets/brand/mark-dark.png',
    status: 'missing',
    variant: 'dark',
    recommendedSize: '1024x1024',
    source: null,
    notes: 'Mark / glyph para UI sobre fondos oscuros. Bloqueado.',
  },
  splash: {
    key: 'splash',
    path: 'assets/brand/splash.png',
    status: 'missing',
    variant: 'neutral',
    recommendedSize: '1284x2778 o contain sobre cream',
    source: null,
    notes:
      'Splash de marca pendiente. Puente: assets/splash-icon.png (Expo) + cream en app.json.',
  },
  appIcon: {
    key: 'appIcon',
    path: 'assets/brand/app-icon.png',
    status: 'missing',
    variant: 'neutral',
    recommendedSize: '1024x1024',
    source: null,
    notes: 'Ícono de app pendiente. Puente: assets/icon.png (Expo).',
  },
};

export const brandLogoSizes = {
  sm: { width: 160, fontSize: 18, lineHeight: 22 },
  md: { width: 220, fontSize: 24, lineHeight: 28 },
  lg: { width: 280, fontSize: 30, lineHeight: 34 },
} as const;

export type BrandLogoSize = keyof typeof brandLogoSizes;

export const brandMarkSizes = {
  sm: 40,
  md: 64,
  lg: 96,
} as const;

export type BrandMarkSize = keyof typeof brandMarkSizes;

export function getBrandAsset(key: BrandAssetKey): BrandAssetEntry {
  return brandAssetManifest[key];
}

export function hasBrandAsset(key: BrandAssetKey): boolean {
  return brandAssetManifest[key].status === 'ready';
}

export function logoAssetKey(
  variant: 'light' | 'dark',
): 'logoLight' | 'logoDark' {
  return variant === 'dark' ? 'logoDark' : 'logoLight';
}

export function markAssetKey(
  variant: 'light' | 'dark',
): 'markLight' | 'markDark' {
  return variant === 'dark' ? 'markDark' : 'markLight';
}

export function listMissingBrandAssets(): BrandAssetKey[] {
  return (Object.keys(brandAssetManifest) as BrandAssetKey[]).filter(
    (key) => brandAssetManifest[key].status === 'missing',
  );
}
