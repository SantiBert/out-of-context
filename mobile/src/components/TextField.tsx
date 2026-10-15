import { StyleSheet, Text, TextInput, View } from 'react-native';

import { theme } from '../theme/theme';

type TextFieldProps = {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  error?: string;
  disabled?: boolean;
  placeholder?: string;
};

export function TextField({
  label,
  value,
  onChangeText,
  error,
  disabled = false,
  placeholder,
}: TextFieldProps) {
  return (
    <View style={styles.wrap}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        accessibilityLabel={label}
        accessibilityState={{ disabled }}
        editable={!disabled}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={theme.colors.muted}
        style={[
          styles.input,
          error ? styles.inputError : null,
          disabled ? styles.inactive : null,
        ]}
      />
      {error ? (
        <Text accessibilityRole="alert" style={styles.error}>
          {error}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignSelf: 'stretch',
    gap: theme.spacing.xs,
  },
  label: {
    ...theme.typography.label,
    color: theme.colors.text,
  },
  input: {
    minHeight: theme.sizes.field,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radii.field,
    paddingHorizontal: theme.spacing.md,
    color: theme.colors.text,
    backgroundColor: theme.colors.background,
    ...theme.typography.body,
  },
  inputError: {
    borderColor: theme.colors.danger,
  },
  inactive: {
    opacity: 0.5,
  },
  error: {
    ...theme.typography.helper,
    color: theme.colors.danger,
    textAlign: 'left',
  },
});
