import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ModeSelectCard } from '../components/ModeSelectCard';
import { canStartLocal } from '../features/local/match/homeEntry';
import {
  modeSelectTitle,
  multiDeviceDescription,
  multiDeviceTitle,
  singleDeviceBusyHint,
  singleDeviceDescription,
  singleDeviceTitle,
} from '../features/local/match/modeSelectCopy';
import {
  recoverActiveMatch,
  type LocalRecovery,
} from '../features/local/match/resume';
import { readLocalMatch } from '../features/local/match/viewing';
import { useAppNavigation } from '../hooks/useAppNavigation';
import { theme } from '../theme/theme';

export function ModeSelectScreen() {
  const navigation = useAppNavigation();
  const [recovery, setRecovery] = useState<LocalRecovery | null>(null);

  useEffect(() => {
    let active = true;
    void recoverActiveMatch().then((next) => {
      if (active) {
        setRecovery(next);
      }
    });
    return () => {
      active = false;
    };
  }, []);

  const localAvailable = canStartLocal(readLocalMatch(), recovery);

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <View style={styles.decorTurquoise} pointerEvents="none" />
      <View style={styles.decorLilac} pointerEvents="none" />
      <ScrollView contentContainerStyle={styles.content}>
        <Text accessibilityRole="header" style={styles.title}>
          {modeSelectTitle}
        </Text>
        <ModeSelectCard
          title={singleDeviceTitle}
          description={singleDeviceDescription}
          tone="light"
          icon="device"
          disabled={!localAvailable}
          accessibilityHint={
            localAvailable ? 'Abre la partida presencial' : singleDeviceBusyHint
          }
          onPress={() => navigation.navigate('LocalSetup')}
        />
        {!localAvailable ? (
          <Text style={styles.busyHint}>{singleDeviceBusyHint}</Text>
        ) : null}
        <ModeSelectCard
          title={multiDeviceTitle}
          description={multiDeviceDescription}
          tone="darkAccent"
          icon="multi"
          accessibilityHint="Abre crear o unirse a una sala"
          onPress={() => navigation.navigate('OnlineEntry')}
        />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: theme.brand.navyDark,
  },
  decorTurquoise: {
    position: 'absolute',
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: theme.brand.turquoise,
    opacity: 0.1,
    top: -30,
    right: -50,
  },
  decorLilac: {
    position: 'absolute',
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: theme.brand.lilac,
    opacity: 0.12,
    bottom: 40,
    left: -30,
  },
  content: {
    flexGrow: 1,
    justifyContent: 'center',
    gap: theme.spacing.lg,
    padding: theme.spacing.xl,
  },
  title: {
    ...theme.typography.heading,
    fontSize: 30,
    lineHeight: 36,
    color: theme.brand.cream,
    textAlign: 'center',
    marginBottom: theme.spacing.sm,
  },
  busyHint: {
    ...theme.typography.helper,
    color: theme.brand.cream,
    opacity: 0.85,
    textAlign: 'center',
  },
});
