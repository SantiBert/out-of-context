import { StyleSheet, Text, View } from 'react-native';

import { theme } from '../theme/theme';

type EmptyStateProps = {
  title: string;
  message: string;
};

export function EmptyState({ title, message }: EmptyStateProps) {
  return (
    <View style={styles.box}>
      <Text accessibilityRole="header" style={styles.title}>
        {title}
      </Text>
      <Text style={styles.message}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    alignSelf: 'stretch',
    alignItems: 'center',
    gap: theme.spacing.sm,
    padding: theme.spacing.xl,
    borderRadius: theme.radii.card,
    backgroundColor: theme.colors.surface,
  },
  title: {
    ...theme.typography.label,
    color: theme.colors.text,
    textAlign: 'center',
  },
  message: {
    ...theme.typography.helper,
    color: theme.colors.muted,
    textAlign: 'center',
  },
});
