import { StyleSheet, Text, View } from 'react-native';

import { theme } from '../theme/theme';

export type StatusTone = 'neutral' | 'success' | 'warning' | 'danger';

type StatusBadgeProps = {
  label: string;
  tone?: StatusTone;
};

const toneStyle = {
  neutral: {
    background: theme.colors.neutralSurface,
    text: theme.colors.neutral,
  },
  success: {
    background: theme.colors.successSurface,
    text: theme.colors.success,
  },
  warning: {
    background: theme.colors.warningSurface,
    text: theme.colors.warning,
  },
  danger: { background: theme.colors.dangerSurface, text: theme.colors.danger },
} as const;

export function StatusBadge({ label, tone = 'neutral' }: StatusBadgeProps) {
  const palette = toneStyle[tone];

  return (
    <View
      accessibilityLabel={label}
      style={[styles.badge, { backgroundColor: palette.background }]}
    >
      <Text style={[styles.label, { color: palette.text }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    alignSelf: 'flex-start',
    borderRadius: theme.radii.pill,
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
  },
  label: {
    ...theme.typography.label,
  },
});
