import { StyleSheet, Text, View } from 'react-native';

import { ContentCard } from './ContentCard';
import { HelperText } from './HelperText';
import { StatusBadge } from './StatusBadge';
import type { LocalPresentedRow } from '../features/local/match/resultsPresentation';
import {
  localMatchTotalLabel,
  localRoundPointsLabel,
} from '../features/local/match/copy';
import { theme } from '../theme/theme';

type ResultPlayerCardProps = {
  row: LocalPresentedRow;
};

export function ResultPlayerCard({ row }: ResultPlayerCardProps) {
  return (
    <ContentCard>
      <View
        accessibilityLabel={row.accessibilityLabel}
        style={styles.playerBlock}
      >
        <View style={styles.header}>
          <Text style={styles.name}>{row.name}</Text>
          <StatusBadge
            label={row.roleLabel}
            tone={row.role === 'impostor' ? 'danger' : 'success'}
          />
        </View>
        <Text style={styles.cardLabel}>{row.cardLabel}</Text>
        {row.cardText === undefined ? null : (
          <HelperText>{row.cardText}</HelperText>
        )}
        <Text style={styles.action}>{row.action}</Text>
        <HelperText>{row.explanation}</HelperText>
        <View style={styles.pointsRow}>
          <View style={styles.pointsBlock}>
            <Text style={styles.pointsCaption}>{localRoundPointsLabel}</Text>
            <Text
              accessibilityLabel={`${localRoundPointsLabel} ${row.roundPoints}`}
              style={styles.roundPoints}
            >
              {String(row.roundPoints)}
            </Text>
          </View>
          <View style={styles.pointsBlock}>
            <Text style={styles.pointsCaption}>{localMatchTotalLabel}</Text>
            <Text
              accessibilityLabel={`${localMatchTotalLabel} ${row.totalPoints}`}
              style={styles.totalPoints}
            >
              {String(row.totalPoints)}
            </Text>
          </View>
        </View>
      </View>
    </ContentCard>
  );
}

const styles = StyleSheet.create({
  playerBlock: {
    gap: theme.spacing.sm,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: theme.spacing.md,
  },
  name: {
    ...theme.typography.heading,
    fontSize: 22,
    lineHeight: 28,
    color: theme.colors.text,
    flexShrink: 1,
  },
  cardLabel: {
    ...theme.typography.label,
    color: theme.colors.primary,
  },
  action: {
    ...theme.typography.body,
    color: theme.colors.text,
  },
  pointsRow: {
    flexDirection: 'row',
    gap: theme.spacing.xl,
    marginTop: theme.spacing.sm,
  },
  pointsBlock: {
    gap: theme.spacing.xs,
  },
  pointsCaption: {
    ...theme.typography.helper,
    color: theme.colors.muted,
  },
  roundPoints: {
    ...theme.typography.heading,
    color: theme.colors.primary,
  },
  totalPoints: {
    ...theme.typography.heading,
    fontSize: 22,
    lineHeight: 28,
    color: theme.colors.text,
  },
});
