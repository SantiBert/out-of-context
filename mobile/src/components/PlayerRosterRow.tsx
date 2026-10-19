import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { theme } from '../theme/theme';
import {
  editPlayerLabel,
  removePlayerLabel,
} from '../features/local/match/setupPresentation';

type PlayerRosterRowProps = {
  index: number;
  name: string;
  editable?: boolean;
  onEdit?: () => void;
  onRemove?: () => void;
  removing?: boolean;
  disabled?: boolean;
};

export function PlayerRosterRow({
  index,
  name,
  editable = false,
  onEdit,
  onRemove,
  removing = false,
  disabled = false,
}: PlayerRosterRowProps) {
  return (
    <View style={styles.row}>
      <View style={styles.badge}>
        <Text style={styles.badgeText}>{String(index)}</Text>
      </View>
      <Text style={styles.name} numberOfLines={1} ellipsizeMode="tail">
        {name}
      </Text>
      {editable ? (
        <View style={styles.actions}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`${editPlayerLabel} ${name}`}
            disabled={disabled || removing}
            onPress={onEdit}
            style={[styles.chip, styles.chipEdit, disabled ? styles.dim : null]}
          >
            <Text style={styles.chipEditLabel}>{editPlayerLabel}</Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`${removePlayerLabel} ${name}`}
            disabled={disabled || removing}
            onPress={onRemove}
            style={[
              styles.chip,
              styles.chipRemove,
              disabled || removing ? styles.dim : null,
            ]}
          >
            {removing ? (
              <ActivityIndicator color={theme.colors.danger} />
            ) : (
              <Text style={styles.chipRemoveLabel}>{removePlayerLabel}</Text>
            )}
          </Pressable>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    alignSelf: 'stretch',
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
    minHeight: theme.sizes.touch,
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radii.card,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  badge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: theme.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: {
    ...theme.typography.label,
    color: theme.colors.onPrimary,
  },
  name: {
    ...theme.typography.body,
    color: theme.colors.text,
    flex: 1,
    minWidth: 0,
  },
  actions: {
    flexDirection: 'row',
    gap: theme.spacing.xs,
    flexShrink: 0,
  },
  chip: {
    minHeight: 36,
    paddingHorizontal: theme.spacing.sm,
    borderRadius: theme.radii.button,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipEdit: {
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.primary,
  },
  chipRemove: {
    backgroundColor: theme.colors.dangerSurface,
    borderColor: theme.colors.danger,
    minWidth: 56,
  },
  chipEditLabel: {
    ...theme.typography.label,
    color: theme.colors.primary,
  },
  chipRemoveLabel: {
    ...theme.typography.label,
    color: theme.colors.danger,
  },
  dim: {
    opacity: 0.5,
  },
});
