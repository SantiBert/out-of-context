import { useEffect, useState } from 'react';
import {
  Image,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '../components/Button';
import { HomeCtaButton } from '../components/HomeCtaButton';
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
import { getHomeAsset } from '../theme/homeAssets';
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

const homeLogo = getHomeAsset('homeLogo');
const homePeople = getHomeAsset('homePeople');
const homeBackground = getHomeAsset('homeBackground');
const homePlayIcon = getHomeAsset('homePlayIcon');
const homeBookIcon = getHomeAsset('homeBookIcon');

/** Dimensiones nativas de `assets/brand/inicio/*.png`. */
const LOGO_ASPECT = 628 / 428;
const BACKGROUND_ASPECT = 668 / 512;

const CONTENT_MAX_WIDTH = 360;
const COMPACT_WINDOW_HEIGHT = 640;

export function HomeScreen() {
  const navigation = useAppNavigation();
  const { height: windowHeight } = useWindowDimensions();
  const [recovery, setRecovery] = useState<LocalRecovery | null>(null);
  const [howToPlayOpen, setHowToPlayOpen] = useState(false);
  const [layoutHeight, setLayoutHeight] = useState(0);

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
  const usefulHeight = layoutHeight > 0 ? layoutHeight : windowHeight;
  const logoMaxHeight = usefulHeight * 0.24;
  const useScrollFallback = windowHeight < COMPACT_WINDOW_HEIGHT;

  const body = (
    <View
      style={styles.body}
      onLayout={(event) => {
        setLayoutHeight(event.nativeEvent.layout.height);
      }}
    >
      <View style={styles.header}>
        {homeLogo.source !== null ? (
          <Image
            source={homeLogo.source}
            accessibilityRole="image"
            accessibilityLabel={appTitle}
            resizeMode="contain"
            style={[styles.logo, { maxHeight: logoMaxHeight }]}
          />
        ) : null}
      </View>

      <View style={styles.hero}>
        {homeBackground.source !== null ? (
          <Image
            source={homeBackground.source}
            accessibilityElementsHidden
            importantForAccessibility="no"
            resizeMode="contain"
            style={styles.backgroundArt}
          />
        ) : null}
        {homePeople.source !== null ? (
          <Image
            source={homePeople.source}
            accessibilityRole="image"
            accessibilityLabel="Jugadores de Out Of Context"
            resizeMode="contain"
            style={styles.people}
          />
        ) : null}
      </View>

      <View style={styles.actions}>
        {homePlayIcon.source !== null ? (
          <HomeCtaButton
            label={homePlayLabel}
            variant="accent"
            iconSource={homePlayIcon.source}
            onPress={() => navigation.navigate(homePlayRoute)}
          />
        ) : null}

        {homeBookIcon.source !== null ? (
          <HomeCtaButton
            label={homeHowToPlayLabel}
            variant="secondary"
            iconSource={homeBookIcon.source}
            onPress={() => setHowToPlayOpen(true)}
          />
        ) : null}

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

        {recovery?.status === 'unavailable' ? (
          <Message tone="error">{localMatchResumeError}</Message>
        ) : null}

        {__DEV__ ? (
          <Button
            label={homeCatalogLabel}
            variant="secondary"
            onPress={() => navigation.navigate('Catalog')}
          />
        ) : null}
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      {useScrollFallback ? (
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          bounces={false}
        >
          {body}
        </ScrollView>
      ) : (
        body
      )}

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
  scrollContent: {
    flexGrow: 1,
  },
  body: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: theme.spacing.xl,
    paddingTop: theme.spacing.sm,
    paddingBottom: theme.spacing.md,
  },
  header: {
    width: '100%',
    maxWidth: CONTENT_MAX_WIDTH,
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  logo: {
    width: '100%',
    aspectRatio: LOGO_ASPECT,
  },
  hero: {
    flex: 1,
    minHeight: 0,
    width: '100%',
    maxWidth: CONTENT_MAX_WIDTH,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: -theme.spacing.md,
  },
  backgroundArt: {
    position: 'absolute',
    width: '108%',
    aspectRatio: BACKGROUND_ASPECT,
    opacity: 0.95,
  },
  people: {
    width: '100%',
    height: '100%',
    zIndex: 1,
  },
  actions: {
    width: '100%',
    maxWidth: CONTENT_MAX_WIDTH,
    gap: theme.spacing.md,
    paddingTop: theme.spacing.sm,
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
