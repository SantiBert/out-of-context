import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import { theme } from '../theme/theme';

type LoadingIndicatorProps = {
  label?: string;
};

export function LoadingIndicator({
  label = 'Cargando',
}: LoadingIndicatorProps) {
  return (
    <View
      accessibilityRole="progressbar"
      accessibilityLabel={label}
      style={styles.row}
    >
      <ActivityIndicator color={theme.colors.primary} />
      <Text style={styles.label}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    minHeight: theme.sizes.touch,
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  label: {
    ...theme.typography.body,
    color: theme.colors.text,
  },
});
