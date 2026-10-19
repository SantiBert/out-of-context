import { Pressable, StyleSheet, Text, View } from 'react-native';

import { theme } from '../theme/theme';

type ModeSelectIcon = 'device' | 'multi';
type ModeSelectTone = 'light' | 'darkAccent';

type ModeSelectCardProps = {
  title: string;
  description: string;
  tone: ModeSelectTone;
  icon: ModeSelectIcon;
  onPress: () => void;
  disabled?: boolean;
  accessibilityHint?: string;
};

export function ModeSelectCard({
  title,
  description,
  tone,
  icon,
  onPress,
  disabled = false,
  accessibilityHint,
}: ModeSelectCardProps) {
  const dark = tone === 'darkAccent';

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={title}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.card,
        dark ? styles.cardDark : styles.cardLight,
        disabled ? styles.disabled : null,
        pressed && !disabled ? styles.pressed : null,
      ]}
    >
      <ModeIcon kind={icon} dark={dark} />
      <View style={styles.textBlock}>
        <Text style={[styles.title, dark ? styles.titleDark : styles.titleLight]}>
          {title}
        </Text>
        <Text
          style={[
            styles.description,
            dark ? styles.descriptionDark : styles.descriptionLight,
          ]}
        >
          {description}
        </Text>
      </View>
    </Pressable>
  );
}

function ModeIcon({ kind, dark }: { kind: ModeSelectIcon; dark: boolean }) {
  if (kind === 'multi') {
    return (
      <View style={styles.iconWrap} accessibilityElementsHidden>
        <View
          style={[
            styles.node,
            { backgroundColor: theme.brand.turquoise, left: 4 },
          ]}
        />
        <View
          style={[
            styles.node,
            { backgroundColor: theme.brand.lilac, right: 4 },
          ]}
        />
      </View>
    );
  }

  return (
    <View style={styles.iconWrap} accessibilityElementsHidden>
      <View
        style={[
          styles.phone,
          {
            borderColor: dark ? theme.brand.turquoise : theme.brand.navy,
            backgroundColor: dark ? theme.brand.navyDark : theme.brand.cream,
          },
        ]}
      >
        <View
          style={[
            styles.phoneScreen,
            {
              backgroundColor: dark ? theme.brand.turquoise : theme.brand.mint,
            },
          ]}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    alignSelf: 'stretch',
    minHeight: 120,
    borderRadius: theme.radii.card,
    borderWidth: 2,
    padding: theme.spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.lg,
  },
  cardLight: {
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.border,
  },
  cardDark: {
    backgroundColor: theme.brand.navyDark,
    borderColor: theme.brand.turquoise,
  },
  pressed: {
    opacity: 0.88,
    transform: [{ scale: 0.99 }],
  },
  disabled: {
    opacity: 0.45,
  },
  textBlock: {
    flex: 1,
    gap: theme.spacing.xs,
  },
  title: {
    ...theme.typography.heading,
    fontSize: 22,
    lineHeight: 28,
  },
  titleLight: {
    color: theme.colors.text,
  },
  titleDark: {
    color: theme.brand.cream,
  },
  description: {
    ...theme.typography.helper,
  },
  descriptionLight: {
    color: theme.colors.muted,
  },
  descriptionDark: {
    color: theme.brand.turquoise,
  },
  iconWrap: {
    width: 56,
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
  },
  phone: {
    width: 28,
    height: 48,
    borderRadius: 6,
    borderWidth: 2,
    padding: 4,
    justifyContent: 'center',
  },
  phoneScreen: {
    flex: 1,
    borderRadius: 3,
    opacity: 0.85,
  },
  node: {
    position: 'absolute',
    width: 22,
    height: 22,
    borderRadius: 11,
    top: 17,
  },
});
