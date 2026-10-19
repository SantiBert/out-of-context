import { useEffect, useState } from 'react';
import {
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BrandLogo } from '../components/BrandLogo';
import { BrandMark } from '../components/BrandMark';
import { Button } from '../components/Button';
import { HelperText } from '../components/HelperText';
import { Message } from '../components/Message';
import {
  homeCatalogLabel,
  homeContinueLabel,
  homeCreateRoomLabel,
  homeHowToPlayLabel,
  homeJoinRoomLabel,
  homePlayLabel,
  howToPlayBullets,
  howToPlayCloseLabel,
  howToPlayTitle,
} from '../features/local/match/homeCopy';
import {
  canContinueLocal,
  continueLocalRoute,
} from '../features/local/match/homeEntry';
import {
  localMatchResumeError,
  recoverActiveMatch,
  type LocalRecovery,
} from '../features/local/match/resume';
import { readLocalMatch } from '../features/local/match/viewing';
import { useAppNavigation } from '../hooks/useAppNavigation';
import { theme } from '../theme/theme';

export const appTitle = 'Out Of Context';

/** Destino de Jugar tras OOC-020.5. */
export const homePlayRoute = 'ModeSelect' as const;

export {
  homeCatalogLabel,
  homeContinueLabel,
  homeCreateRoomLabel,
  homeHowToPlayLabel,
  homeJoinRoomLabel,
  homePlayLabel,
};

export function HomeScreen() {
  const navigation = useAppNavigation();
  const [recovery, setRecovery] = useState<LocalRecovery | null>(null);
  const [howToPlayOpen, setHowToPlayOpen] = useState(false);

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

  const match = readLocalMatch();
  const continueEnabled = canContinueLocal(match, recovery);
  const showContinue = match !== null && recovery?.status !== 'unavailable';

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <View style={styles.decorMintLarge} pointerEvents="none" />
      <View style={styles.decorMintSmall} pointerEvents="none" />
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        <BrandLogo size="lg" variant="light" />
        <BrandMark size="md" variant="light" />
        <HelperText>{appTitle}</HelperText>

        <Button
          label={homePlayLabel}
          variant="accent"
          onPress={() => navigation.navigate(homePlayRoute)}
        />

        {showContinue ? (
          <Button
            label={homeContinueLabel}
            variant="primary"
            disabled={!continueEnabled}
            onPress={() => {
              const route = continueLocalRoute(readLocalMatch(), recovery);
              if (route === null) {
                return;
              }
              navigation.reset({ index: 0, routes: [{ name: route }] });
            }}
          />
        ) : null}

        <Button
          label={homeHowToPlayLabel}
          variant="secondary"
          onPress={() => setHowToPlayOpen(true)}
        />

        {recovery?.status === 'unavailable' ? (
          <Message tone="error">{localMatchResumeError}</Message>
        ) : null}

        <Button
          label={homeCatalogLabel}
          variant="secondary"
          onPress={() => navigation.navigate('Catalog')}
        />
      </ScrollView>

      <Modal
        visible={howToPlayOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setHowToPlayOpen(false)}
      >
        <View style={styles.modalBackdrop}>
          <View accessibilityViewIsModal style={styles.modalCard}>
            <Text accessibilityRole="header" style={styles.modalTitle}>
              {howToPlayTitle}
            </Text>
            {howToPlayBullets.map((bullet) => (
              <Text key={bullet} style={styles.modalBullet}>
                {`• ${bullet}`}
              </Text>
            ))}
            <Button
              label={howToPlayCloseLabel}
              onPress={() => setHowToPlayOpen(false)}
            />
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  decorMintLarge: {
    position: 'absolute',
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: theme.brand.mint,
    opacity: 0.12,
    top: -40,
    right: -60,
  },
  decorMintSmall: {
    position: 'absolute',
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: theme.brand.mint,
    opacity: 0.1,
    bottom: 80,
    left: -40,
  },
  content: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing.lg,
    paddingHorizontal: theme.spacing.xl,
    paddingVertical: theme.spacing.xxl,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: theme.colors.overlay,
    alignItems: 'center',
    justifyContent: 'center',
    padding: theme.spacing.xl,
  },
  modalCard: {
    alignSelf: 'stretch',
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radii.card,
    padding: theme.spacing.xl,
    gap: theme.spacing.md,
    ...theme.elevation.card,
  },
  modalTitle: {
    ...theme.typography.heading,
    fontSize: 22,
    lineHeight: 28,
    color: theme.colors.text,
  },
  modalBullet: {
    ...theme.typography.body,
    color: theme.colors.text,
  },
});
