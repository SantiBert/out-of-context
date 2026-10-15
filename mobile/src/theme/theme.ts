import type { TextStyle, ViewStyle } from 'react-native';

export const colors = {
  background: '#ffffff',
  surface: '#f4f6f8',
  text: '#1a1a1a',
  muted: '#5c6570',
  primary: '#1f4b99',
  onPrimary: '#ffffff',
  border: '#c5ced6',
  danger: '#8f1d1d',
  dangerSurface: '#fde8e8',
  warning: '#7a4e00',
  warningSurface: '#fff4d6',
  success: '#0f6b3c',
  successSurface: '#e5f6ec',
  neutral: '#3d4650',
  neutralSurface: '#eef1f4',
};

export const typography = {
  heading: {
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
  button: 8,
  card: 12,
  field: 8,
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
    shadowColor: colors.text,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.12,
    shadowRadius: 3,
  },
} satisfies Record<string, ViewStyle>;

export const theme = {
  colors,
  typography,
  spacing,
  radii,
  sizes,
  elevation,
};
