import { StyleSheet, Text, View } from 'react-native';

import { theme } from '../theme/theme';

type MessageProps = {
  children: string;
  tone: 'error' | 'warning';
};

export function Message({ children, tone }: MessageProps) {
  const palette =
    tone === 'error'
      ? { background: theme.colors.dangerSurface, text: theme.colors.danger }
      : { background: theme.colors.warningSurface, text: theme.colors.warning };

  return (
    <View
      accessibilityRole="alert"
      style={[styles.box, { backgroundColor: palette.background }]}
    >
      <Text style={[styles.text, { color: palette.text }]}>{children}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    alignSelf: 'stretch',
    borderRadius: theme.radii.card,
    padding: theme.spacing.lg,
  },
  text: {
    ...theme.typography.body,
  },
});
