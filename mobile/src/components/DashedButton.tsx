import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

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
        <ActivityIndicator color={theme.brand.navyDark} />
      ) : (
        <View style={styles.content}>
          <View style={styles.plusCircle}>
            <Text style={styles.plus}>+</Text>
          </View>
          <Text style={styles.label}>{label}</Text>
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    alignSelf: 'stretch',
    minHeight: theme.sizes.touch,
    borderRadius: theme.radii.card,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: theme.brand.navyDark,
    backgroundColor: theme.colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.sm,
  },
  inactive: {
    opacity: 0.5,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
  },
  plusCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: theme.brand.navyDark,
    alignItems: 'center',
    justifyContent: 'center',
  },
  plus: {
    color: theme.brand.white,
    fontSize: 20,
    lineHeight: 22,
    fontWeight: '700',
  },
  label: {
    fontFamily: theme.fontFamilies.displayBold,
    fontSize: 18,
    lineHeight: 24,
    color: theme.brand.navyDark,
  },
});
