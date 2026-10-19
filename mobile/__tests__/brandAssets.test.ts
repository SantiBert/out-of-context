import { describe, expect, it } from '@jest/globals';

import { BrandLogo } from '../src/components/BrandLogo';
import { BrandMark } from '../src/components/BrandMark';
import {
  brandAssetManifest,
  getBrandAsset,
  hasBrandAsset,
  listMissingBrandAssets,
  logoAssetKey,
  markAssetKey,
} from '../src/theme/brandAssets';

describe('brandAssets OOC-020.3', () => {
  it('declara las claves de marca esperadas', () => {
    expect(Object.keys(brandAssetManifest).sort()).toEqual(
      [
        'appIcon',
        'logoDark',
        'logoLight',
        'markDark',
        'markLight',
        'splash',
      ].sort(),
    );
  });

  it('marca los PNG de producto como missing hasta entrega', () => {
    expect(hasBrandAsset('logoLight')).toBe(false);
    expect(hasBrandAsset('logoDark')).toBe(false);
    expect(hasBrandAsset('markLight')).toBe(false);
    expect(getBrandAsset('logoLight').source).toBeNull();
    expect(listMissingBrandAssets()).toHaveLength(6);
  });

  it('resuelve claves por variante light/dark', () => {
    expect(logoAssetKey('light')).toBe('logoLight');
    expect(logoAssetKey('dark')).toBe('logoDark');
    expect(markAssetKey('light')).toBe('markLight');
    expect(markAssetKey('dark')).toBe('markDark');
  });

  it('exporta componentes BrandLogo y BrandMark', () => {
    expect(typeof BrandLogo).toBe('function');
    expect(typeof BrandMark).toBe('function');
  });
});
