import { StyleSheet, Text, View } from 'react-native';

import { theme } from '../theme/theme';

type SituationCardProps = {
  number: number;
  text?: string;
};

/** Carta de situación legible; sin rol ni datos ajenos. */
export function SituationCard({ number, text }: SituationCardProps) {
  return (
    <View
      accessibilityRole="text"
      accessibilityLabel={
        text === undefined
          ? `Situación ${number}`
          : `Situación ${number}: ${text}`
      }
      style={styles.card}
    >
      <Text style={styles.number}>{`#${number}`}</Text>
      {text === undefined ? null : <Text style={styles.text}>{text}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    alignSelf: 'stretch',
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radii.card,
    padding: theme.spacing.xl,
    gap: theme.spacing.md,
    borderWidth: 2,
    borderColor: theme.brand.mint,
    ...theme.elevation.card,
  },
  number: {
    ...theme.typography.heading,
    fontSize: 36,
    lineHeight: 42,
    color: theme.colors.text,
    textAlign: 'center',
  },
  text: {
    ...theme.typography.body,
    fontSize: 20,
    lineHeight: 28,
    color: theme.colors.text,
    textAlign: 'center',
  },
});
