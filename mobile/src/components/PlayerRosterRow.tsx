import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { theme } from '../theme/theme';
import {
  editPlayerLabel,
  playerNamePlaceholder,
  removePlayerLabel,
} from '../features/local/match/setupPresentation';

const BADGE_COLORS = [
  theme.brand.mint,
  theme.brand.yellow,
  theme.brand.lilac,
  theme.brand.coral,
  theme.brand.turquoise,
  theme.brand.pink,
  theme.brand.navy,
  theme.brand.navyDark,
] as const;

type PlayerRosterRowProps = {
  index: number;
  name: string;
  /** Fila editable con input inline (pantalla Jugadores). */
  editable?: boolean;
  onChangeName?: (name: string) => void;
  onEdit?: () => void;
  onRemove?: () => void;
  removable?: boolean;
  removing?: boolean;
  disabled?: boolean;
};

export function PlayerRosterRow({
  index,
  name,
  editable = false,
  onChangeName,
  onEdit,
  onRemove,
  removable = false,
  removing = false,
  disabled = false,
}: PlayerRosterRowProps) {
  const badgeColor = BADGE_COLORS[(Math.max(index, 1) - 1) % BADGE_COLORS.length];
  const initial = name.trim().charAt(0).toUpperCase() || '?';

  return (
    <View style={styles.row}>
      <View style={[styles.badge, { backgroundColor: badgeColor }]}>
        <Text style={styles.badgeText}>{String(index)}</Text>
      </View>
      <View style={styles.avatar} accessibilityElementsHidden>
        <Text style={styles.avatarText}>{initial}</Text>
      </View>
      {editable && onChangeName ? (
        <TextInput
          style={styles.input}
          value={name}
          onChangeText={onChangeName}
          placeholder={playerNamePlaceholder}
          placeholderTextColor={theme.colors.muted}
          editable={!disabled && !removing}
          autoCapitalize="words"
          autoCorrect={false}
          returnKeyType="done"
        />
      ) : (
        <Text style={styles.name} numberOfLines={1} ellipsizeMode="tail">
          {name}
        </Text>
      )}
      {editable ? (
        <View style={styles.actions}>
          {onEdit ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`${editPlayerLabel} ${name || playerNamePlaceholder}`}
              disabled={disabled || removing}
              onPress={onEdit}
              style={[styles.iconHit, disabled ? styles.dim : null]}
            >
              <Text style={styles.editIcon}>✎</Text>
            </Pressable>
          ) : null}
          {removable && onRemove ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`${removePlayerLabel} ${name || playerNamePlaceholder}`}
              disabled={disabled || removing}
              onPress={onRemove}
              style={[
                styles.iconHit,
                disabled || removing ? styles.dim : null,
              ]}
            >
              {removing ? (
                <ActivityIndicator color={theme.colors.danger} />
              ) : (
                <Text style={styles.removeIcon}>✕</Text>
              )}
            </Pressable>
          ) : null}
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
    gap: theme.spacing.sm,
    minHeight: 56,
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radii.card,
    ...theme.elevation.card,
  },
  badge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: {
    fontFamily: theme.fontFamilies.displayBold,
    fontSize: 14,
    lineHeight: 18,
    color: theme.brand.white,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: theme.colors.neutralSurface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontFamily: theme.fontFamilies.displayBold,
    fontSize: 16,
    lineHeight: 20,
    color: theme.brand.navyDark,
  },
  input: {
    flex: 1,
    minWidth: 0,
    fontFamily: theme.fontFamilies.displayBold,
    fontSize: 18,
    lineHeight: 24,
    color: theme.colors.text,
    paddingVertical: theme.spacing.xs,
  },
  name: {
    fontFamily: theme.fontFamilies.displayBold,
    fontSize: 18,
    lineHeight: 24,
    color: theme.colors.text,
    flex: 1,
    minWidth: 0,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
    flexShrink: 0,
  },
  iconHit: {
    minWidth: theme.sizes.touch,
    minHeight: theme.sizes.touch,
    alignItems: 'center',
    justifyContent: 'center',
  },
  editIcon: {
    fontSize: 20,
    color: theme.brand.navyDark,
  },
  removeIcon: {
    fontSize: 20,
    lineHeight: 22,
    fontWeight: '700',
    color: theme.colors.danger,
  },
  dim: {
    opacity: 0.5,
  },
});
