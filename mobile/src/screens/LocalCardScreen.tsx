import { useEffect, useRef, useState } from 'react';
import { AppState, StyleSheet, Text } from 'react-native';

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
  localCompleteCardInstruction,
  localCoveredCardInstruction,
  localEmptyCardInstruction,
  localHideCardLabel,
  localMissingCardInstruction,
  localTurnLabel,
  localVisibleCardInstruction,
} from '../features/local/match/copy';
import {
  closeLocalDeal,
  coverLocalCard,
  hideLocalCard,
  localCardView,
  readLocalMatch,
  resumedLocalPass,
  revealLocalCard,
  type LocalCardView,
} from '../features/local/match/viewing';
import type { LocalMatch } from '../features/local/rules/round';
import { useAppNavigation } from '../hooks/useAppNavigation';
import { theme } from '../theme/theme';

export function LocalCardScreen() {
  useExitToHomeOnBack();
  const match = readLocalMatch();
  const dealt = match?.rounds.some(
    (round) => round.status !== 'finished' && round.hands.length > 0,
  );
  if (!match || !dealt) {
    return <EmptyCard savedList={match !== null} />;
  }
  return <LocalPass match={match} />;
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

function LocalPass({ match }: { match: LocalMatch }) {
  const navigation = useAppNavigation();
  const [pass, setPass] = useState(resumedLocalPass);
  const [saveError, setSaveError] = useState<string | undefined>();
  const [saving, setSaving] = useState(false);
  const savingLock = useRef(false);
  const view = localCardView(match, pass);

  useEffect(() => {
    const sub = AppState.addEventListener('change', (next) => {
      if (next !== 'background' && next !== 'inactive') {
        return;
      }
      setPass((current) => coverLocalCard(current));
    });
    return () => {
      sub.remove();
    };
  }, []);

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

  return (
    <PrivateDealFrame>
      {view.kind === 'covered' ? (
        <>
          <Text accessibilityRole="header" style={styles.playerName}>
            {view.playerName}
          </Text>
          <Text style={styles.turnLabel}>{localTurnLabel(view.playerName)}</Text>
          <Text style={styles.helperOnNavy}>
            {localCoveredCardInstruction(view.playerName)}
          </Text>
          <Button
            label="Ver carta"
            onPress={() => setPass(revealLocalCard(pass))}
          />
        </>
      ) : null}

      {view.kind === 'visible' ? (
        <>
          <Text accessibilityRole="header" style={styles.playerName}>
            {view.playerName}
          </Text>
          <VisibleCard view={view} />
          <Text style={styles.helperOnNavy}>{localVisibleCardInstruction}</Text>
          <Button
            label={localHideCardLabel}
            variant="accent"
            accessibilityLabel={localVisibleCardInstruction}
            onPress={() => setPass(hideLocalCard(pass, match.players.length))}
          />
        </>
      ) : null}

      {view.kind === 'complete' ? (
        <>
          <Text accessibilityRole="header" style={styles.title}>
            Listo
          </Text>
          <Text style={styles.helperOnNavy}>
            {localCompleteCardInstruction}
          </Text>
          <Button
            label="Continuar"
            onPress={continueDeal}
            disabled={saving}
            loading={saving}
          />
        </>
      ) : null}

      {saveError ? <Message tone="error">{saveError}</Message> : null}
      <LocalRestartControl />
      <LocalAbandonControl />
      <HomeButton />
    </PrivateDealFrame>
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
  playerName: {
    ...theme.typography.heading,
    fontSize: 34,
    lineHeight: 40,
    color: theme.brand.cream,
    textAlign: 'center',
  },
  turnLabel: {
    ...theme.typography.label,
    color: theme.brand.mint,
    textAlign: 'center',
  },
  helperOnNavy: {
    ...theme.typography.helper,
    color: theme.brand.cream,
    opacity: 0.9,
    textAlign: 'center',
  },
});
