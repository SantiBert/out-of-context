import { useRef, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '../components/Button';
import { HomeButton } from '../components/HomeButton';
import { DashedButton } from '../components/DashedButton';
import { EmptyState } from '../components/EmptyState';
import { Heading } from '../components/Heading';
import { HelperText } from '../components/HelperText';
import { LocalAbandonControl } from '../components/LocalAbandonControl';
import { Message } from '../components/Message';
import { PlayerRosterRow } from '../components/PlayerRosterRow';
import { TextField } from '../components/TextField';
import {
  commitLocalMatch,
  localMatchSaveError,
} from '../features/local/match/autosave';
import { localSetupInstruction } from '../features/local/match/copy';
import {
  addPlayerLabel,
  continueSetupLabel,
  playerDisplayIndex,
  playersLimitsHelper,
  playersScreenTitle,
  savePlayerLabel,
} from '../features/local/match/setupPresentation';
import { readLocalMatch } from '../features/local/match/viewing';
import {
  addPlayer,
  createSetupMatch,
  localPlayerCountText,
  localRosterMutable,
  maxLocalPlayers,
  minLocalPlayers,
  openSetupReview,
  removePlayer,
  renamePlayer,
  startedLocalRosterMessage,
  tooFewLocalPlayersMessage,
  type LocalPlayer,
  type LocalSetupMatch,
} from '../features/local/match/setup';
import { useAppNavigation } from '../hooks/useAppNavigation';
import { theme } from '../theme/theme';

function rosterHeldIsLocked(): boolean {
  const held = readLocalMatch();
  return held !== null && !localRosterMutable(held);
}

function initialSetupMatch(): LocalSetupMatch {
  const held = readLocalMatch();
  if (held?.phase !== 'setup') {
    return createSetupMatch();
  }
  return {
    version: 1,
    status: 'preparing',
    phase: 'setup',
    players: held.players.map((player) => ({
      id: player.id,
      name: player.name,
    })),
    piles: [],
    rounds: [],
  };
}

export function LocalSetupScreen() {
  const navigation = useAppNavigation();
  const [match, setMatch] = useState(initialSetupMatch);
  const [draft, setDraft] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState<string | undefined>();
  const [continueError, setContinueError] = useState<string | undefined>();
  const editing = editingId !== null;
  const saving = useRef(false);
  const [pending, setPending] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const busy = pending || removingId !== null;
  const locked = rosterHeldIsLocked();
  const canEditRoster = !locked;

  function submit() {
    if (saving.current) {
      return;
    }
    if (rosterHeldIsLocked()) {
      setError(startedLocalRosterMessage);
      return;
    }
    const result = editingId
      ? renamePlayer(match, editingId, draft)
      : addPlayer(match, draft);
    if (!result.ok) {
      setError(result.message);
      return;
    }
    saving.current = true;
    setPending(true);
    void commitLocalMatch(result.match).then((saved) => {
      saving.current = false;
      setPending(false);
      if (!saved.ok) {
        setError(localMatchSaveError);
        return;
      }
      setMatch(result.match);
      setDraft('');
      setEditingId(null);
      setError(undefined);
      setContinueError(undefined);
    });
  }

  function goToMatchConfig() {
    const result = openSetupReview(match);
    if (!result.reviewing) {
      setContinueError(result.message);
      return;
    }
    setContinueError(undefined);
    navigation.navigate('LocalMatchConfig');
  }

  function startEdit(player: LocalPlayer) {
    setEditingId(player.id);
    setDraft(player.name);
    setError(undefined);
  }

  function cancelEdit() {
    setEditingId(null);
    setDraft('');
    setError(undefined);
  }

  function remove(id: string) {
    if (saving.current) {
      return;
    }
    if (rosterHeldIsLocked()) {
      setContinueError(startedLocalRosterMessage);
      return;
    }
    const next = removePlayer(match, id);
    if (!next.ok) {
      setContinueError(next.message);
      return;
    }
    if (next.match.players === match.players) {
      return;
    }
    saving.current = true;
    setRemovingId(id);
    void commitLocalMatch(next.match).then((saved) => {
      saving.current = false;
      setRemovingId(null);
      if (!saved.ok) {
        setContinueError(localMatchSaveError);
        return;
      }
      setMatch(next.match);
      setContinueError(undefined);
      if (editingId === id) {
        cancelEdit();
      }
    });
  }

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
        >
          <Heading>{playersScreenTitle}</Heading>
          <HelperText>{playersLimitsHelper}</HelperText>
          <HelperText>{localSetupInstruction}</HelperText>
          <HelperText>{localPlayerCountText(match.players.length)}</HelperText>

          {locked ? (
            <Message tone="warning">{startedLocalRosterMessage}</Message>
          ) : null}

          {match.players.length === 0 ? (
            <EmptyState
              title="Sin jugadores"
              message="Todavía no hay nombres."
            />
          ) : null}

          {match.players.map((player) => (
            <PlayerRosterRow
              key={player.id}
              index={playerDisplayIndex(match.players, player.id)}
              name={player.name}
              editable={canEditRoster}
              disabled={busy}
              removing={removingId === player.id}
              onEdit={() => startEdit(player)}
              onRemove={() => remove(player.id)}
            />
          ))}

          {canEditRoster ? (
            <>
              {match.players.length < minLocalPlayers ? (
                <Message tone="warning">{tooFewLocalPlayersMessage}</Message>
              ) : null}
              <TextField
                label="Nombre"
                value={draft}
                onChangeText={setDraft}
                error={error}
                autoCapitalize="words"
                autoCorrect={false}
                returnKeyType="done"
                blurOnSubmit
                onSubmitEditing={submit}
                disabled={busy}
              />
              {editing ? (
                <>
                  <Button
                    label={savePlayerLabel}
                    onPress={submit}
                    disabled={busy}
                    loading={pending}
                  />
                  <Button
                    label="Cancelar"
                    variant="secondary"
                    onPress={cancelEdit}
                    disabled={busy}
                  />
                </>
              ) : (
                <DashedButton
                  label={addPlayerLabel}
                  onPress={submit}
                  disabled={busy || match.players.length >= maxLocalPlayers}
                  loading={pending}
                />
              )}
              {continueError ? (
                <Message tone="error">{continueError}</Message>
              ) : null}
              <View style={styles.footer}>
                <Button
                  label={continueSetupLabel}
                  onPress={goToMatchConfig}
                  disabled={busy || match.players.length < minLocalPlayers}
                />
              </View>
            </>
          ) : null}

          <LocalAbandonControl />
          <HomeButton />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  flex: {
    flex: 1,
  },
  content: {
    flexGrow: 1,
    gap: theme.spacing.lg,
    padding: theme.spacing.xl,
    paddingBottom: theme.spacing.xxl,
    backgroundColor: theme.colors.background,
  },
  footer: {
    alignSelf: 'stretch',
    marginTop: theme.spacing.sm,
    gap: theme.spacing.md,
  },
});
