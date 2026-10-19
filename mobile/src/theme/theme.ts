import type { TextStyle, ViewStyle } from 'react-native';

/** Hex de marca aprobados (OOC-020.2). Usar solo vía tokens semánticos en UI. */
export const brand = {
  mint: '#2EC4A6',
  navy: '#0F4C81',
  cream: '#F7F3E9',
  yellow: '#F4B400',
  coral: '#FF6B6B',
  turquoise: '#00C2A8',
  lilac: '#7B61FF',
  pink: '#FF428D',
  navyDark: '#1A1A2E',
  white: '#FFFFFF',
} as const;

export const fontFamilies = {
  display: 'Baloo2-SemiBold',
  displayBold: 'Baloo2-Bold',
} as const;

export const colors = {
  background: brand.cream,
  surface: brand.white,
  text: brand.navy,
  muted: '#4A6B8A',
  primary: brand.mint,
  onPrimary: brand.white,
  border: '#B8C9D6',
  danger: brand.coral,
  dangerSurface: '#FFE5E5',
  warning: '#8A6500',
  warningSurface: '#FFF3CC',
  success: brand.turquoise,
  successSurface: '#D9F7F2',
  neutral: brand.navy,
  neutralSurface: '#E8EEF3',
  overlay: 'rgba(26, 26, 46, 0.45)',
  accentYellow: brand.yellow,
  accentLilac: brand.lilac,
  accentPink: brand.pink,
  accentTurquoise: brand.turquoise,
};

export const typography = {
  heading: {
    fontFamily: fontFamilies.display,
    fontSize: 28,
    fontWeight: '600',
    lineHeight: 34,
  },
  body: {
    fontSize: 16,
    fontWeight: '400',
    lineHeight: 22,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    lineHeight: 18,
  },
  helper: {
    fontSize: 14,
    fontWeight: '400',
    lineHeight: 20,
  },
} satisfies Record<string, TextStyle>;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
};

export const radii = {
  button: 10,
  card: 14,
  field: 10,
  pill: 999,
};

export const sizes = {
  touch: 48,
  field: 48,
};

export const elevation = {
  none: {
    elevation: 0,
  },
  card: {
    elevation: 2,
    shadowColor: brand.navyDark,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.12,
    shadowRadius: 3,
  },
} satisfies Record<string, ViewStyle>;

export const theme = {
  brand,
  colors,
  typography,
  spacing,
  radii,
  sizes,
  elevation,
  fontFamilies,
};
