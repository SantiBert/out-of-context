import { describe, expect, it } from '@jest/globals';

import {
  brand,
  colors,
  fontFamilies,
  theme,
  typography,
} from '../src/theme/theme';

describe('theme OOC-020.2', () => {
  it('expone la paleta de marca aprobada', () => {
    expect(brand.mint).toBe('#2EC4A6');
    expect(brand.navy).toBe('#0F4C81');
    expect(brand.cream).toBe('#F7F3E9');
    expect(brand.yellow).toBe('#F4B400');
    expect(brand.coral).toBe('#FF6B6B');
    expect(brand.turquoise).toBe('#00C2A8');
    expect(brand.lilac).toBe('#7B61FF');
    expect(brand.pink).toBe('#FF428D');
    expect(brand.navyDark).toBe('#1A1A2E');
    expect(brand.white).toBe('#FFFFFF');
  });

  it('mapea tokens semánticos a la marca', () => {
    expect(colors.background).toBe(brand.cream);
    expect(colors.surface).toBe(brand.white);
    expect(colors.primary).toBe(brand.mint);
    expect(colors.onPrimary).toBe(brand.white);
    expect(colors.text).toBe(brand.navy);
    expect(colors.danger).toBe(brand.coral);
    expect(colors.success).toBe(brand.turquoise);
    expect(colors.accentYellow).toBe(brand.yellow);
    expect(colors.overlay).toContain('rgba');
  });

  it('usa Baloo 2 en tipografía de títulos', () => {
    expect(fontFamilies.display).toBe('Baloo2-SemiBold');
    expect(fontFamilies.displayBold).toBe('Baloo2-Bold');
    expect(typography.heading.fontFamily).toBe(fontFamilies.display);
    expect('fontFamily' in typography.body).toBe(false);
  });

  it('agrupa el theme exportado', () => {
    expect(theme.brand).toBe(brand);
    expect(theme.colors).toBe(colors);
    expect(theme.sizes.touch).toBe(48);
    expect(theme.radii.pill).toBe(999);
  });
});
