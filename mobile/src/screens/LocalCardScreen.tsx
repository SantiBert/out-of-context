import { useEffect, useRef, useState } from 'react';
import {
  AppState,
  Modal,
  PanResponder,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { Button } from '../components/Button';
import { HomeButton } from '../components/HomeButton';
import { LocalAbandonControl } from '../components/LocalAbandonControl';
import { LocalRestartControl } from '../components/LocalRestartControl';
import { Message } from '../components/Message';
import { PrivateDealFrame } from '../components/PrivateDealFrame';
import { SituationCard } from '../components/SituationCard';
import { useExitToHomeOnBack } from '../hooks/useExitToHomeOnBack';
import {
  commitLocalMatch,
  localMatchSaveError,
} from '../features/local/match/autosave';
import {
  localCardContinueLabel,
  localCardInfoTitle,
  localCompleteCardInstruction,
  localEmptyCardInstruction,
  localMissingCardInstruction,
  localPassPhonePrefix,
  localSheetHintLabel,
} from '../features/local/match/copy';
import {
  closeLocalDeal,
  coverLocalCard,
  hideLocalCard,
  localCardView,
  readLocalMatch,
  resumedLocalPass,
  retreatLocalPass,
  revealLocalCard,
  type LocalCardView,
  type LocalPass,
} from '../features/local/match/viewing';
import type { LocalMatch } from '../features/local/rules/round';
import { useAppNavigation } from '../hooks/useAppNavigation';
import { theme } from '../theme/theme';

const SHEET_COLLAPSED = 56;
const SHEET_EXPANDED = 280;
const OPEN_THRESHOLD = 72;

export function LocalCardScreen() {
  useExitToHomeOnBack();
  const match = readLocalMatch();
  const dealt = match?.rounds.some(
    (round) => round.status !== 'finished' && round.hands.length > 0,
  );
  if (!match || !dealt) {
    return <EmptyCard savedList={match !== null} />;
  }
  return <LocalPassFlow match={match} />;
}

function EmptyCard({ savedList }: { savedList: boolean }) {
  return (
    <PrivateDealFrame>
      <Text style={styles.title}>Carta</Text>
      <Text style={styles.helperOnNavy}>
        {savedList ? localEmptyCardInstruction : localMissingCardInstruction}
      </Text>
      <LocalRestartControl />
      <LocalAbandonControl />
      <HomeButton />
    </PrivateDealFrame>
  );
}

function LocalPassFlow({ match }: { match: LocalMatch }) {
  const navigation = useAppNavigation();
  const [pass, setPass] = useState(resumedLocalPass);
  const [saveError, setSaveError] = useState<string | undefined>();
  const [saving, setSaving] = useState(false);
  const [infoOpen, setInfoOpen] = useState(false);
  const [sheetHeight, setSheetHeight] = useState(SHEET_COLLAPSED);
  const savingLock = useRef(false);
  const gestureMeta = useRef({
    kind: 'covered' as 'covered' | 'visible' | 'complete',
    height: SHEET_COLLAPSED,
  });
  const [sheetHandlers, setSheetHandlers] = useState<
    ReturnType<typeof PanResponder.create>['panHandlers'] | null
  >(null);

  const view = localCardView(match, pass);

  useEffect(() => {
    gestureMeta.current.kind = view.kind;
  }, [view.kind]);

  useEffect(() => {
    gestureMeta.current.height = sheetHeight;
  }, [sheetHeight]);

  useEffect(() => {
    const sub = AppState.addEventListener('change', (next) => {
      if (next !== 'background' && next !== 'inactive') {
        return;
      }
      setPass((current) => coverLocalCard(current));
      setSheetHeight(SHEET_COLLAPSED);
    });
    return () => {
      sub.remove();
    };
  }, []);

  useEffect(() => {
    let dragStart = SHEET_COLLAPSED;
    const responder = PanResponder.create({
      onStartShouldSetPanResponder: () =>
        gestureMeta.current.kind !== 'complete',
      onMoveShouldSetPanResponder: (_, gesture) =>
        gestureMeta.current.kind !== 'complete' && Math.abs(gesture.dy) > 6,
      onPanResponderGrant: () => {
        dragStart = gestureMeta.current.height;
      },
      onPanResponderMove: (_, gesture) => {
        const next = Math.min(
          SHEET_EXPANDED,
          Math.max(SHEET_COLLAPSED, dragStart - gesture.dy),
        );
        gestureMeta.current.height = next;
        setSheetHeight(next);
      },
      onPanResponderRelease: (_, gesture) => {
        const projected = dragStart - gesture.dy - gesture.vy * 40;
        const open = projected > SHEET_COLLAPSED + OPEN_THRESHOLD;
        if (open) {
          setPass((current) => revealLocalCard(current));
          gestureMeta.current.height = SHEET_EXPANDED;
          setSheetHeight(SHEET_EXPANDED);
          return;
        }
        setPass((current) => coverLocalCard(current));
        gestureMeta.current.height = SHEET_COLLAPSED;
        setSheetHeight(SHEET_COLLAPSED);
      },
    });
    setSheetHandlers(responder.panHandlers);
  }, []);

  function syncSheetToPass(next: LocalPass) {
    setPass(next);
    setSheetHeight(next.visible ? SHEET_EXPANDED : SHEET_COLLAPSED);
  }

  function continueDeal() {
    if (savingLock.current) {
      return;
    }
    const closed = closeLocalDeal(match, pass);
    if (!closed.ok) {
      return;
    }
    savingLock.current = true;
    setSaving(true);
    void commitLocalMatch(closed.match).then((saved) => {
      if (!saved.ok) {
        savingLock.current = false;
        setSaving(false);
        setSaveError(localMatchSaveError);
        return;
      }
      navigation.reset({ index: 0, routes: [{ name: 'LocalTable' }] });
    });
  }

  function onContinueTurn() {
    const next = hideLocalCard(pass, match.players.length);
    if (next === pass) {
      return;
    }
    syncSheetToPass(next);
  }

  function onGoBack() {
    const next = retreatLocalPass(pass);
    if (next === pass) {
      return;
    }
    syncSheetToPass(next);
  }

  if (view.kind === 'complete') {
    return (
      <PrivateDealFrame layout="fill">
        <View style={styles.completeBody}>
          <Text accessibilityRole="header" style={styles.title}>
            Listo
          </Text>
          <Text style={styles.helperOnNavy}>{localCompleteCardInstruction}</Text>
          <Button
            label={localCardContinueLabel}
            onPress={continueDeal}
            disabled={saving}
            loading={saving}
          />
          {saveError ? <Message tone="error">{saveError}</Message> : null}
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={localCardInfoTitle}
            onPress={() => setInfoOpen(true)}
            style={styles.infoLink}
          >
            <Text style={styles.infoLinkLabel}>{localCardInfoTitle}</Text>
          </Pressable>
        </View>
        <InfoModal visible={infoOpen} onClose={() => setInfoOpen(false)} />
      </PrivateDealFrame>
    );
  }

  const playerName = view.playerName;
  const nextPlayerName = view.nextPlayerName;
  const canContinue = view.canContinue;
  const canGoBack = view.canGoBack;

  return (
    <PrivateDealFrame layout="fill">
      <View style={styles.header}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Jugador anterior"
          disabled={!canGoBack}
          onPress={onGoBack}
          style={[styles.headerHit, !canGoBack ? styles.headerDisabled : null]}
        >
          <Text style={styles.headerChevron}>‹</Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={localCardInfoTitle}
          onPress={() => setInfoOpen(true)}
          style={styles.headerHit}
        >
          <Text style={styles.headerInfo}>ⓘ</Text>
        </Pressable>
      </View>

      <View style={styles.hero}>
        <View style={styles.splash} accessibilityElementsHidden>
          <View style={styles.splashInner} />
        </View>
      </View>

      <View style={styles.mid}>
        <View style={styles.namePill}>
          <Text accessibilityRole="header" style={styles.playerName}>
            {playerName}
          </Text>
        </View>
        {nextPlayerName !== null ? (
          <Text style={styles.passInstruction}>
            {localPassPhonePrefix}
            <Text style={styles.passName}>{nextPlayerName}</Text>
          </Text>
        ) : null}
        <Button
          label={localCardContinueLabel}
          disabled={!canContinue}
          onPress={onContinueTurn}
        />
      </View>

      <View
        style={[styles.sheet, { height: sheetHeight }]}
        {...(sheetHandlers ?? {})}
      >
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={localSheetHintLabel}
          onPress={() => {
            if (pass.visible) {
              syncSheetToPass(coverLocalCard(pass));
              return;
            }
            syncSheetToPass(revealLocalCard(pass));
          }}
          style={styles.sheetHandle}
        >
          <Text style={styles.sheetChevron}>⌃</Text>
        </Pressable>
        {view.kind === 'visible' ? (
          <View style={styles.sheetBody}>
            <VisibleCard view={view} />
          </View>
        ) : (
          <Text style={styles.sheetHint}>{localSheetHintLabel}</Text>
        )}
      </View>

      {saveError ? <Message tone="error">{saveError}</Message> : null}
      <InfoModal visible={infoOpen} onClose={() => setInfoOpen(false)} />
    </PrivateDealFrame>
  );
}

function InfoModal({
  visible,
  onClose,
}: {
  visible: boolean;
  onClose: () => void;
}) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.modalBackdrop}>
        <View accessibilityViewIsModal style={styles.modalCard}>
          <Text accessibilityRole="header" style={styles.modalTitle}>
            {localCardInfoTitle}
          </Text>
          <LocalRestartControl />
          <LocalAbandonControl />
          <HomeButton />
          <Button label="Cerrar" variant="secondary" onPress={onClose} />
        </View>
      </View>
    </Modal>
  );
}

function VisibleCard({
  view,
}: {
  view: Extract<LocalCardView, { kind: 'visible' }>;
}) {
  return <SituationCard number={view.number} text={view.text} />;
}

const styles = StyleSheet.create({
  title: {
    ...theme.typography.heading,
    color: theme.brand.cream,
    textAlign: 'center',
  },
  helperOnNavy: {
    ...theme.typography.helper,
    color: theme.brand.cream,
    opacity: 0.9,
    textAlign: 'center',
  },
  completeBody: {
    flex: 1,
    justifyContent: 'center',
    gap: theme.spacing.lg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: theme.spacing.sm,
  },
  headerHit: {
    minWidth: theme.sizes.touch,
    minHeight: theme.sizes.touch,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerDisabled: {
    opacity: 0.35,
  },
  headerChevron: {
    fontSize: 36,
    lineHeight: 40,
    color: theme.brand.cream,
    fontWeight: '600',
  },
  headerInfo: {
    fontSize: 28,
    lineHeight: 32,
    color: theme.brand.cream,
  },
  hero: {
    flex: 1,
    minHeight: 120,
    alignItems: 'center',
    justifyContent: 'center',
  },
  splash: {
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: theme.brand.mint,
    opacity: 0.35,
    alignItems: 'center',
    justifyContent: 'center',
  },
  splashInner: {
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: theme.brand.turquoise,
    opacity: 0.55,
  },
  mid: {
    gap: theme.spacing.md,
    paddingBottom: theme.spacing.md,
  },
  namePill: {
    alignSelf: 'center',
    minWidth: '70%',
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.xl,
    borderRadius: theme.radii.pill,
    borderWidth: 2,
    borderColor: theme.brand.mint,
    backgroundColor: theme.brand.navy,
  },
  playerName: {
    fontFamily: theme.fontFamilies.displayBold,
    fontSize: 28,
    lineHeight: 34,
    color: theme.brand.cream,
    textAlign: 'center',
  },
  passInstruction: {
    ...theme.typography.body,
    fontSize: 18,
    lineHeight: 24,
    color: theme.brand.cream,
    textAlign: 'center',
  },
  passName: {
    fontFamily: theme.fontFamilies.displayBold,
    color: theme.brand.yellow,
  },
  sheet: {
    borderTopLeftRadius: theme.radii.card,
    borderTopRightRadius: theme.radii.card,
    backgroundColor: theme.brand.navy,
    overflow: 'hidden',
    marginHorizontal: -theme.spacing.xl,
    paddingHorizontal: theme.spacing.xl,
  },
  sheetHandle: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
  },
  sheetChevron: {
    fontSize: 22,
    lineHeight: 24,
    color: theme.brand.cream,
  },
  sheetHint: {
    ...theme.typography.helper,
    color: theme.brand.cream,
    opacity: 0.75,
    textAlign: 'center',
    paddingBottom: theme.spacing.sm,
  },
  sheetBody: {
    flex: 1,
    paddingBottom: theme.spacing.md,
  },
  infoLink: {
    alignSelf: 'center',
    padding: theme.spacing.sm,
  },
  infoLinkLabel: {
    ...theme.typography.label,
    color: theme.brand.mint,
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
});
