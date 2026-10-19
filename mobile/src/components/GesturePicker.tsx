import { StyleSheet, View } from 'react-native';

import { SelectableOption } from './SelectableOption';
import { theme } from '../theme/theme';

export type GesturePickerValue = 'point' | 'fist' | 'v';

const options: { value: GesturePickerValue; label: string }[] = [
  { value: 'point', label: 'Señalar' },
  { value: 'fist', label: 'Puño' },
  { value: 'v', label: 'V' },
];

type GesturePickerProps = {
  value: GesturePickerValue | null;
  onChange: (gesture: GesturePickerValue) => void;
  disabled?: boolean;
};

export function GesturePicker({
  value,
  onChange,
  disabled = false,
}: GesturePickerProps) {
  return (
    <View style={styles.list}>
      {options.map((option) => (
        <SelectableOption
          key={option.value}
          label={option.label}
          selected={value === option.value}
          onPress={() => onChange(option.value)}
          disabled={disabled}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  list: {
    gap: theme.spacing.md,
    alignSelf: 'stretch',
  },
});
