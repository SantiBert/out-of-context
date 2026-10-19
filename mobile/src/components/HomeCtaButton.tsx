import { Image, Pressable, StyleSheet, Text, View } from 'react-native';

import { theme } from '../theme/theme';

type HomeCtaVariant = 'accent' | 'secondary';

type HomeCtaButtonProps = {
  label: string;
  onPress: () => void;
  variant?: HomeCtaVariant;
  iconSource: number;
  disabled?: boolean;
  accessibilityLabel?: string;
};

/**
 * CTA de Home con icono leading y chevron nativo.
 * No usa PNG de botón completo (playbutton / howtoplay).
 */
export function HomeCtaButton({
  label,
  onPress,
  variant = 'accent',
  iconSource,
  disabled = false,
  accessibilityLabel,
}: HomeCtaButtonProps) {
  const isAccent = variant === 'accent';

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={[
        styles.base,
        isAccent ? styles.accent : styles.secondary,
        disabled ? styles.inactive : null,
      ]}
    >
      <View style={styles.sideSlot} accessibilityElementsHidden>
        <Image
          source={iconSource}
          importantForAccessibility="no"
          resizeMode="contain"
          style={styles.icon}
        />
      </View>
      <Text
        style={[
          styles.label,
          isAccent ? styles.accentLabel : styles.secondaryLabel,
        ]}
        numberOfLines={1}
      >
        {label}
      </Text>
      <View style={styles.sideSlot} accessibilityElementsHidden>
        <Text
          style={[
            styles.chevron,
            isAccent ? styles.accentLabel : styles.secondaryLabel,
          ]}
        >
          ›
        </Text>
      </View>
    </Pressable>
  );
}

const SIDE_SLOT = 40;

const styles = StyleSheet.create({
  base: {
    minHeight: theme.sizes.touch,
    alignSelf: 'stretch',
    borderRadius: theme.radii.pill,
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
    borderWidth: 2,
    ...theme.elevation.card,
  },
  accent: {
    backgroundColor: theme.brand.yellow,
    borderColor: theme.brand.navyDark,
  },
  secondary: {
    backgroundColor: theme.colors.surface,
    borderColor: theme.brand.navyDark,
  },
  inactive: {
    opacity: 0.5,
  },
  sideSlot: {
    width: SIDE_SLOT,
    height: SIDE_SLOT,
    alignItems: 'center',
    justifyContent: 'center',
  },
  icon: {
    width: 32,
    height: 32,
  },
  label: {
    flex: 1,
    fontFamily: theme.fontFamilies.displayBold,
    fontSize: 20,
    lineHeight: 26,
    textAlign: 'center',
  },
  accentLabel: {
    color: theme.brand.navyDark,
  },
  secondaryLabel: {
    color: theme.brand.navyDark,
  },
  chevron: {
    fontSize: 28,
    lineHeight: 30,
    fontWeight: '700',
  },
});
