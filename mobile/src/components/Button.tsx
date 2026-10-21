import { ActivityIndicator, Pressable, StyleSheet, Text } from 'react-native';

import { theme } from '../theme/theme';

type ButtonVariant =
  | 'primary'
  | 'secondary'
  | 'destructive'
  | 'accent'
  | 'mint';

type ButtonProps = {
  label: string;
  onPress: () => void;
  variant?: ButtonVariant;
  disabled?: boolean;
  loading?: boolean;
  accessibilityLabel?: string;
};

export function Button({
  label,
  onPress,
  variant = 'primary',
  disabled = false,
  loading = false,
  accessibilityLabel,
}: ButtonProps) {
  const inactive = disabled || loading;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={{ disabled: inactive, busy: loading }}
      disabled={inactive}
      onPress={onPress}
      style={[
        styles.base,
        surfaceStyle(variant),
        inactive ? styles.inactive : null,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={indicatorColor(variant)} />
      ) : (
        <Text style={[styles.label, labelStyle(variant)]}>{label}</Text>
      )}
    </Pressable>
  );
}

function surfaceStyle(variant: ButtonVariant) {
  if (variant === 'destructive') {
    return styles.destructive;
  }
  if (variant === 'secondary') {
    return styles.secondary;
  }
  if (variant === 'accent') {
    return styles.accent;
  }
  if (variant === 'mint') {
    return styles.mint;
  }
  return styles.primary;
}

function labelStyle(variant: ButtonVariant) {
  if (variant === 'secondary') {
    return styles.secondaryLabel;
  }
  if (variant === 'destructive') {
    return styles.destructiveLabel;
  }
  if (variant === 'accent') {
    return styles.accentLabel;
  }
  if (variant === 'mint') {
    return styles.mintLabel;
  }
  return styles.primaryLabel;
}

function indicatorColor(variant: ButtonVariant) {
  if (variant === 'secondary') {
    return theme.brand.navyDark;
  }
  if (variant === 'destructive' || variant === 'mint') {
    return theme.colors.onPrimary;
  }
  return theme.brand.navyDark;
}

const styles = StyleSheet.create({
  base: {
    minHeight: theme.sizes.touch,
    minWidth: 180,
    alignSelf: 'stretch',
    borderRadius: theme.radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
    borderWidth: 2,
    ...theme.elevation.card,
  },
  primary: {
    backgroundColor: theme.brand.yellow,
    borderColor: theme.brand.navyDark,
  },
  secondary: {
    backgroundColor: theme.colors.surface,
    borderColor: theme.brand.navyDark,
  },
  destructive: {
    backgroundColor: theme.colors.danger,
    borderColor: theme.colors.danger,
  },
  accent: {
    backgroundColor: theme.brand.yellow,
    borderColor: theme.brand.navyDark,
  },
  mint: {
    backgroundColor: theme.brand.mint,
    borderColor: theme.brand.mint,
  },
  inactive: {
    opacity: 0.5,
  },
  label: {
    fontFamily: theme.fontFamilies.displayBold,
    fontSize: 20,
    lineHeight: 26,
    textAlign: 'center',
  },
  primaryLabel: {
    color: theme.brand.navyDark,
  },
  secondaryLabel: {
    color: theme.brand.navyDark,
  },
  destructiveLabel: {
    color: theme.colors.onPrimary,
  },
  accentLabel: {
    color: theme.brand.navyDark,
  },
  mintLabel: {
    color: theme.colors.onPrimary,
  },
});
