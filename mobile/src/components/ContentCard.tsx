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
    backgroundColor: theme.colors.background,
    borderRadius: theme.radii.card,
    padding: theme.spacing.lg,
    gap: theme.spacing.md,
    ...theme.elevation.card,
  },
});
