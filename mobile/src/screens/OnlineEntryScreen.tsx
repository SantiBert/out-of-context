import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '../components/Button';
import { HelperText } from '../components/HelperText';
import {
  homeCreateRoomLabel,
  homeJoinRoomLabel,
} from '../features/local/match/homeCopy';
import {
  onlineEntryHelper,
  onlineEntryTitle,
} from '../features/local/match/modeSelectCopy';
import { useAppNavigation } from '../hooks/useAppNavigation';
import { theme } from '../theme/theme';

export function OnlineEntryScreen() {
  const navigation = useAppNavigation();

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <View style={styles.content}>
        <Text accessibilityRole="header" style={styles.title}>
          {onlineEntryTitle}
        </Text>
        <HelperText>{onlineEntryHelper}</HelperText>
        <Button
          label={homeCreateRoomLabel}
          onPress={() => navigation.navigate('CreateRoom')}
        />
        <Button
          label={homeJoinRoomLabel}
          variant="secondary"
          onPress={() => navigation.navigate('JoinRoom')}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing.lg,
    padding: theme.spacing.xl,
  },
  title: {
    ...theme.typography.heading,
    color: theme.colors.text,
    textAlign: 'center',
  },
});
