import { useEffect, useRef, useState } from 'react';
import { AppState, ScrollView, StyleSheet, Text } from 'react-native';

import { Button } from '../components/Button';
import { ContentCard } from '../components/ContentCard';
import { Heading } from '../components/Heading';
import { HelperText } from '../components/HelperText';
import { LocalAbandonControl } from '../components/LocalAbandonControl';
import { LocalRestartControl } from '../components/LocalRestartControl';
import { Message } from '../components/Message';
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
import { homeRoute } from '../navigation/routes';
import { theme } from '../theme/theme';

export function LocalCardScreen() {
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
  const navigation = useAppNavigation();
  return (
    <ScrollView contentContainerStyle={styles.content}>
      <Heading>Carta</Heading>
      <HelperText>
        {savedList ? localEmptyCardInstruction : localMissingCardInstruction}
      </HelperText>
      <LocalRestartControl />
      <LocalAbandonControl />
      <HomeButton
        onPress={() =>
          navigation.reset({ index: 0, routes: [{ name: homeRoute }] })
        }
      />
    </ScrollView>
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
    <ScrollView contentContainerStyle={styles.content}>
      <Heading>{view.kind === 'complete' ? 'Carta' : view.playerName}</Heading>
      {view.kind === 'covered' ? (
        <>
          <HelperText>{localTurnLabel(view.playerName)}</HelperText>
          <HelperText>
            {localCoveredCardInstruction(view.playerName)}
          </HelperText>
        </>
      ) : null}
      {view.kind === 'visible' ? <VisibleCard view={view} /> : null}
      {view.kind === 'visible' ? (
        <HelperText>{localVisibleCardInstruction}</HelperText>
      ) : null}
      {view.kind === 'complete' ? (
        <HelperText>{localCompleteCardInstruction}</HelperText>
      ) : null}
      {saveError ? <Message tone="error">{saveError}</Message> : null}
      {view.kind === 'complete' ? (
        <Button
          label="Continuar"
          onPress={continueDeal}
          disabled={saving}
          loading={saving}
        />
      ) : null}
      {view.kind === 'covered' ? (
        <Button
          label="Ver carta"
          onPress={() => setPass(revealLocalCard(pass))}
        />
      ) : null}
      {view.kind === 'visible' ? (
        <Button
          label={localHideCardLabel}
          accessibilityLabel={localVisibleCardInstruction}
          onPress={() => setPass(hideLocalCard(pass, match.players.length))}
        />
      ) : null}
      <LocalRestartControl />
      <LocalAbandonControl />
      <HomeButton
        onPress={() =>
          navigation.reset({ index: 0, routes: [{ name: homeRoute }] })
        }
      />
    </ScrollView>
  );
}

function VisibleCard({
  view,
}: {
  view: Extract<LocalCardView, { kind: 'visible' }>;
}) {
  return (
    <ContentCard>
      <Text style={styles.number}>{`#${view.number}`}</Text>
      {view.text === undefined ? null : (
        <Text style={styles.text}>{view.text}</Text>
      )}
    </ContentCard>
  );
}

function HomeButton({ onPress }: { onPress: () => void }) {
  return (
    <Button
      label="Inicio"
      variant="secondary"
      accessibilityLabel="Volver al inicio"
      onPress={onPress}
    />
  );
}

const styles = StyleSheet.create({
  content: {
    gap: theme.spacing.lg,
    padding: theme.spacing.xl,
    backgroundColor: theme.colors.background,
  },
  number: {
    ...theme.typography.heading,
    color: theme.colors.text,
  },
  text: {
    ...theme.typography.body,
    color: theme.colors.text,
  },
});
