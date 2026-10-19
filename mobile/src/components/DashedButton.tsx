import { ActivityIndicator, Pressable, StyleSheet, Text } from 'react-native';

import { theme } from '../theme/theme';

type DashedButtonProps = {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
  accessibilityLabel?: string;
};

/** CTA secundario con borde discontinuo (Añadir jugador). */
export function DashedButton({
  label,
  onPress,
  disabled = false,
  loading = false,
  accessibilityLabel,
}: DashedButtonProps) {
  const inactive = disabled || loading;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={{ disabled: inactive, busy: loading }}
      disabled={inactive}
      onPress={onPress}
      style={[styles.base, inactive ? styles.inactive : null]}
    >
      {loading ? (
        <ActivityIndicator color={theme.colors.primary} />
      ) : (
        <Text style={styles.label}>{label}</Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    alignSelf: 'stretch',
    minHeight: theme.sizes.touch,
    borderRadius: theme.radii.button,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: theme.colors.primary,
    backgroundColor: theme.colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: theme.spacing.lg,
  },
  inactive: {
    opacity: 0.5,
  },
  label: {
    ...theme.typography.body,
    fontWeight: '600',
    color: theme.colors.primary,
  },
});
