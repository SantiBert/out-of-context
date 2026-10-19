import { StyleSheet, Text, View } from 'react-native';

import { theme } from '../theme/theme';

type ProgressIndicatorProps = {
  current: number;
  total: number;
  label?: string;
};

export function ProgressIndicator({
  current,
  total,
  label,
}: ProgressIndicatorProps) {
  const safeTotal = Math.max(total, 1);
  const clamped = Math.min(Math.max(current, 0), safeTotal);
  const ratio = clamped / safeTotal;
  const accessibilityLabel =
    label ?? `Progreso ${clamped} de ${safeTotal}`;

  return (
    <View
      accessibilityRole="progressbar"
      accessibilityLabel={accessibilityLabel}
      accessibilityValue={{ min: 0, max: safeTotal, now: clamped }}
      style={styles.wrap}
    >
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <Text style={styles.meta}>
        {clamped} / {safeTotal}
      </Text>
      <View style={styles.track}>
        <View style={[styles.fill, { width: `${Math.round(ratio * 100)}%` }]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignSelf: 'stretch',
    gap: theme.spacing.sm,
  },
  label: {
    ...theme.typography.label,
    color: theme.colors.text,
  },
  meta: {
    ...theme.typography.helper,
    color: theme.colors.muted,
  },
  track: {
    height: 10,
    borderRadius: theme.radii.pill,
    backgroundColor: theme.colors.neutralSurface,
    flexDirection: 'row',
    overflow: 'hidden',
  },
  fill: {
    backgroundColor: theme.colors.primary,
    borderRadius: theme.radii.pill,
  },
});
