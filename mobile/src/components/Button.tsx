import { ActivityIndicator, Pressable, StyleSheet, Text } from 'react-native';

import { theme } from '../theme/theme';

type ButtonVariant = 'primary' | 'secondary' | 'destructive';

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
  return styles.primary;
}

function labelStyle(variant: ButtonVariant) {
  if (variant === 'secondary') {
    return styles.secondaryLabel;
  }
  return styles.primaryLabel;
}

function indicatorColor(variant: ButtonVariant) {
  if (variant === 'secondary') {
    return theme.colors.primary;
  }
  return theme.colors.onPrimary;
}

const styles = StyleSheet.create({
  base: {
    minHeight: theme.sizes.touch,
    minWidth: 180,
    borderRadius: theme.radii.button,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: theme.spacing.lg,
    borderWidth: 1,
  },
  primary: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  secondary: {
    backgroundColor: theme.colors.background,
    borderColor: theme.colors.primary,
  },
  destructive: {
    backgroundColor: theme.colors.danger,
    borderColor: theme.colors.danger,
  },
  inactive: {
    opacity: 0.5,
  },
  label: {
    ...theme.typography.body,
    fontWeight: '600',
  },
  primaryLabel: {
    color: theme.colors.onPrimary,
  },
  secondaryLabel: {
    color: theme.colors.primary,
  },
});
