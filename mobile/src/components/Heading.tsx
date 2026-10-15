import { StyleSheet, Text } from 'react-native';

import { theme } from '../theme/theme';

type HeadingProps = {
  children: string;
};

export function Heading({ children }: HeadingProps) {
  return (
    <Text accessibilityRole="header" style={styles.heading}>
      {children}
    </Text>
  );
}

const styles = StyleSheet.create({
  heading: {
    ...theme.typography.heading,
    color: theme.colors.text,
    textAlign: 'center',
  },
});
