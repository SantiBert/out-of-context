import { StyleSheet, Text } from 'react-native';

import { theme } from '../theme/theme';

type HelperTextProps = {
  children: string;
};

export function HelperText({ children }: HelperTextProps) {
  return <Text style={styles.helper}>{children}</Text>;
}

const styles = StyleSheet.create({
  helper: {
    ...theme.typography.helper,
    color: theme.colors.muted,
    textAlign: 'center',
  },
});
