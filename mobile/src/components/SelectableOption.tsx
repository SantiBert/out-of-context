import { Pressable, StyleSheet, Text, View } from 'react-native';

import { theme } from '../theme/theme';

type SelectableOptionProps = {
  label: string;
  selected: boolean;
  onPress: () => void;
  disabled?: boolean;
  description?: string;
};

export function SelectableOption({
  label,
  selected,
  onPress,
  disabled = false,
  description,
}: SelectableOptionProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected, disabled }}
      accessibilityLabel={label}
      disabled={disabled}
      onPress={onPress}
      style={[
        styles.base,
        selected ? styles.selected : styles.idle,
        disabled ? styles.inactive : null,
      ]}
    >
      <View style={styles.textBlock}>
        <Text style={[styles.label, selected ? styles.labelSelected : null]}>
          {label}
        </Text>
        {description ? (
          <Text style={styles.description}>{description}</Text>
        ) : null}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    alignSelf: 'stretch',
    minHeight: theme.sizes.touch,
    borderRadius: theme.radii.card,
    borderWidth: 2,
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
    backgroundColor: theme.colors.surface,
    justifyContent: 'center',
  },
  idle: {
    borderColor: theme.colors.border,
  },
  selected: {
    borderColor: theme.colors.primary,
    backgroundColor: theme.colors.successSurface,
  },
  inactive: {
    opacity: 0.5,
  },
  textBlock: {
    gap: theme.spacing.xs,
  },
  label: {
    ...theme.typography.label,
    color: theme.colors.text,
  },
  labelSelected: {
    color: theme.colors.primary,
  },
  description: {
    ...theme.typography.helper,
    color: theme.colors.muted,
  },
});
