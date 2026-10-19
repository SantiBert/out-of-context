import { StyleSheet, Text, View } from 'react-native';

import { ContentCard } from './ContentCard';
import type { LocalPresentedStanding } from '../features/local/match/resultsPresentation';
import { theme } from '../theme/theme';

type StandingRowProps = {
  standing: LocalPresentedStanding;
};

export function StandingRow({ standing }: StandingRowProps) {
  return (
    <ContentCard>
      <View
        accessibilityLabel={standing.accessibilityLabel}
        style={styles.row}
      >
        <View style={styles.rankBadge}>
          <Text style={styles.rankText}>{String(standing.rank)}</Text>
        </View>
        <Text style={styles.name} numberOfLines={1} ellipsizeMode="tail">
          {standing.name}
        </Text>
        <Text style={styles.points}>{String(standing.points)}</Text>
      </View>
    </ContentCard>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
  },
  rankBadge: {
    width: theme.sizes.touch * 0.55,
    height: theme.sizes.touch * 0.55,
    borderRadius: theme.radii.pill,
    backgroundColor: theme.colors.successSurface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rankText: {
    ...theme.typography.label,
    color: theme.colors.primary,
  },
  name: {
    ...theme.typography.label,
    color: theme.colors.text,
    flex: 1,
  },
  points: {
    ...theme.typography.heading,
    fontSize: 22,
    lineHeight: 28,
    color: theme.colors.text,
  },
});
