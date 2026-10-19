import { describe, expect, it } from '@jest/globals';

import { HomeCtaButton } from '../src/components/HomeCtaButton';
import {
  getHomeAsset,
  hasHomeAsset,
  homeAssetManifest,
  listReadyHomeAssets,
} from '../src/theme/homeAssets';

describe('homeAssets', () => {
  it('declara las claves de inicio esperadas', () => {
    expect(Object.keys(homeAssetManifest).sort()).toEqual(
      [
        'homeBackground',
        'homeBookIcon',
        'homeLogo',
        'homePeople',
        'homePlayIcon',
      ].sort(),
    );
  });

  it('marca los PNG de Home como ready con source', () => {
    for (const key of listReadyHomeAssets()) {
      expect(hasHomeAsset(key)).toBe(true);
      expect(getHomeAsset(key).source).not.toBeNull();
      expect(getHomeAsset(key).path).toContain('assets/brand/inicio/');
    }
    expect(listReadyHomeAssets()).toHaveLength(5);
  });

  it('no incluye botones rasterizados como assets runtime', () => {
    const paths = Object.values(homeAssetManifest).map((entry) => entry.path);
    expect(paths.some((path) => path.includes('playbutton'))).toBe(false);
    expect(paths.some((path) => path.includes('howtoplay'))).toBe(false);
  });

  it('exporta HomeCtaButton nativo', () => {
    expect(typeof HomeCtaButton).toBe('function');
  });
});
