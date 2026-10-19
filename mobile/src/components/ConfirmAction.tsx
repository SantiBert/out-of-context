import { Modal, StyleSheet, Text, View } from 'react-native';

import { useReducedMotion } from '../hooks/useReducedMotion';
import { theme } from '../theme/theme';
import { Button } from './Button';

type ConfirmActionProps = {
  visible: boolean;
  title: string;
  message: string;
  confirmLabel: string;
  cancelLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
  confirmVariant?: 'primary' | 'destructive';
};

export function ConfirmAction({
  visible,
  title,
  message,
  confirmLabel,
  cancelLabel,
  onConfirm,
  onCancel,
  confirmVariant = 'primary',
}: ConfirmActionProps) {
  const reduceMotion = useReducedMotion();

  return (
    <Modal
      visible={visible}
      transparent
      animationType={reduceMotion ? 'none' : 'fade'}
      onRequestClose={onCancel}
    >
      <View style={styles.backdrop}>
        <View accessibilityViewIsModal style={styles.dialog}>
          <Text accessibilityRole="header" style={styles.title}>
            {title}
          </Text>
          <Text style={styles.message}>{message}</Text>
          <Button
            label={confirmLabel}
            variant={confirmVariant}
            onPress={onConfirm}
          />
          <Button label={cancelLabel} variant="secondary" onPress={onCancel} />
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: theme.colors.overlay,
    alignItems: 'center',
    justifyContent: 'center',
    padding: theme.spacing.xl,
  },
  dialog: {
    alignSelf: 'stretch',
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radii.card,
    padding: theme.spacing.xl,
    gap: theme.spacing.md,
    ...theme.elevation.card,
  },
  title: {
    ...theme.typography.heading,
    fontSize: 22,
    lineHeight: 28,
    color: theme.colors.text,
  },
  message: {
    ...theme.typography.body,
    color: theme.colors.text,
  },
});
