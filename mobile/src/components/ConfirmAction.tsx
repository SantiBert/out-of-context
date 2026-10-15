import { Modal, StyleSheet, Text, View } from 'react-native';

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
};

export function ConfirmAction({
  visible,
  title,
  message,
  confirmLabel,
  cancelLabel,
  onConfirm,
  onCancel,
}: ConfirmActionProps) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onCancel}
    >
      <View style={styles.backdrop}>
        <View accessibilityViewIsModal style={styles.dialog}>
          <Text accessibilityRole="header" style={styles.title}>
            {title}
          </Text>
          <Text style={styles.message}>{message}</Text>
          <Button label={confirmLabel} onPress={onConfirm} />
          <Button label={cancelLabel} variant="secondary" onPress={onCancel} />
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(26, 26, 26, 0.4)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: theme.spacing.xl,
  },
  dialog: {
    alignSelf: 'stretch',
    backgroundColor: theme.colors.background,
    borderRadius: theme.radii.card,
    padding: theme.spacing.xl,
    gap: theme.spacing.md,
    ...theme.elevation.card,
  },
  title: {
    ...theme.typography.label,
    fontSize: 18,
    lineHeight: 24,
    color: theme.colors.text,
  },
  message: {
    ...theme.typography.body,
    color: theme.colors.text,
  },
});
