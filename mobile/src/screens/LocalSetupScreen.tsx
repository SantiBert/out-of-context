import { useRef, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { Button } from '../components/Button';
import { ContentCard } from '../components/ContentCard';
import { EmptyState } from '../components/EmptyState';
import { Heading } from '../components/Heading';
import { HelperText } from '../components/HelperText';
import { LocalAbandonControl } from '../components/LocalAbandonControl';
import { Message } from '../components/Message';
import { TextField } from '../components/TextField';
import { dealLocalMatch } from '../features/local/catalog/deal';
import { deviceRng } from '../features/local/catalog/rng';
import { localCatalogSituations } from '../features/local/catalog/situations';
import {
  commitLocalMatch,
  localMatchSaveError,
} from '../features/local/match/autosave';
import { localSetupInstruction } from '../features/local/match/copy';
import { readLocalMatch } from '../features/local/match/viewing';
import {
  addPlayer,
  cancelSetupReview,
  confirmPendingSetup,
  createSetupMatch,
  localPlayerCountText,
  localRosterMutable,
  maxLocalPlayers,
  minLocalPlayers,
  openSetupReview,
  removePlayer,
  renamePlayer,
  returnToEdit,
  startedLocalRosterMessage,
  tooFewLocalPlayersMessage,
  type LocalPlayer,
  type LocalSetupMatch,
} from '../features/local/match/setup';
import { useAppNavigation } from '../hooks/useAppNavigation';
import { homeRoute } from '../navigation/routes';
import { createSingleFlight } from '../services/api/singleFlight';
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
  const [reviewing, setReviewing] = useState(false);
  const editing = editingId !== null;
  const continueLock = useRef(createSingleFlight());
  const accepted = useRef(false);
  const saving = useRef(false);
  const [pending, setPending] = useState<'add' | 'confirm' | null>(null);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const busy = pending !== null || removingId !== null;

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
    setPending('add');
    void commitLocalMatch(result.match).then((saved) => {
      saving.current = false;
      setPending(null);
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

  function reviewList() {
    const result = openSetupReview(match);
    if (!result.reviewing) {
      setContinueError(result.message);
      return;
    }
    setContinueError(undefined);
    setReviewing(true);
  }

  function leaveReview() {
    accepted.current = false;
    setMatch(returnToEdit(match));
    setReviewing(false);
    setContinueError(undefined);
  }

  function cancelReview() {
    accepted.current = false;
    setMatch(cancelSetupReview(match));
    setReviewing(false);
    setContinueError(undefined);
  }

  function confirmReview() {
    if (rosterHeldIsLocked()) {
      setContinueError(startedLocalRosterMessage);
      return;
    }
    const result = confirmPendingSetup(match, accepted.current);
    if (!result.entered) {
      return;
    }
    accepted.current = true;
    if (!result.ok) {
      accepted.current = false;
      setContinueError(result.message);
      return;
    }
    if (saving.current) {
      return;
    }
    saving.current = true;
    setPending('confirm');
    void continueLock.current(async () => {
      const dealt = dealLocalMatch(
        result.match,
        localCatalogSituations(),
        deviceRng(),
      );
      if (!dealt.ok) {
        saving.current = false;
        accepted.current = false;
        setPending(null);
        setContinueError(dealt.message);
        return;
      }
      const saved = await commitLocalMatch(dealt.match);
      saving.current = false;
      setPending(null);
      if (!saved.ok) {
        accepted.current = false;
        setContinueError(localMatchSaveError);
        return;
      }
      setContinueError(undefined);
      navigation.reset({ index: 0, routes: [{ name: 'LocalCard' }] });
    });
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
    <ScrollView
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
    >
      <Heading>Nombres</Heading>
      <HelperText>{localSetupInstruction}</HelperText>
      <HelperText>{localPlayerCountText(match.players.length)}</HelperText>
      {reviewing ? (
        <>
          {match.players.map((player) => (
            <ContentCard key={player.id}>
              <Text style={styles.name}>{player.name}</Text>
            </ContentCard>
          ))}
          {continueError ? (
            <Message tone="error">{continueError}</Message>
          ) : null}
          <Button
            label="Confirmar"
            onPress={confirmReview}
            disabled={busy}
            loading={pending === 'confirm'}
          />
          <Button
            label="Volver"
            variant="secondary"
            onPress={leaveReview}
            disabled={busy}
          />
          <Button
            label="Cancelar"
            variant="secondary"
            onPress={cancelReview}
            disabled={busy}
          />
        </>
      ) : (
        <>
          {match.players.length === 0 ? (
            <EmptyState
              title="Sin jugadores"
              message="Todavía no hay nombres."
            />
          ) : null}
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
          <Button
            label={editing ? 'Guardar' : 'Agregar'}
            onPress={submit}
            disabled={
              busy || (!editing && match.players.length >= maxLocalPlayers)
            }
            loading={pending === 'add'}
          />
          {editing ? (
            <Button
              label="Cancelar"
              variant="secondary"
              onPress={cancelEdit}
              disabled={busy}
            />
          ) : null}
          {match.players.map((player) => (
            <ContentCard key={player.id}>
              <Text style={styles.name}>{player.name}</Text>
              <View style={styles.actions}>
                <Button
                  label="Editar"
                  variant="secondary"
                  onPress={() => startEdit(player)}
                  disabled={busy}
                />
                <Button
                  label="Quitar"
                  variant="destructive"
                  onPress={() => remove(player.id)}
                  disabled={busy}
                  loading={removingId === player.id}
                />
              </View>
            </ContentCard>
          ))}
          {continueError ? (
            <Message tone="error">{continueError}</Message>
          ) : null}
          <Button label="Revisar" onPress={reviewList} disabled={busy} />
        </>
      )}
      <LocalAbandonControl />
      <Button
        label="Inicio"
        variant="secondary"
        accessibilityLabel="Volver al inicio"
        onPress={() =>
          navigation.reset({ index: 0, routes: [{ name: homeRoute }] })
        }
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: theme.spacing.lg,
    padding: theme.spacing.xl,
    backgroundColor: theme.colors.background,
  },
  name: {
    ...theme.typography.body,
    color: theme.colors.text,
  },
  actions: {
    alignSelf: 'stretch',
    gap: theme.spacing.sm,
  },
});
