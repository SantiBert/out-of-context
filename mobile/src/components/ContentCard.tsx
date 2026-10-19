import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { theme } from '../theme/theme';

type ContentCardProps = {
  children: ReactNode;
};

export function ContentCard({ children }: ContentCardProps) {
  return <View style={styles.card}>{children}</View>;
}

const styles = StyleSheet.create({
  card: {
    alignSelf: 'stretch',
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radii.card,
    padding: theme.spacing.lg,
    gap: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    ...theme.elevation.card,
  },
});
