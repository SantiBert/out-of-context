import { useRef, useState } from 'react';
import { ScrollView, StyleSheet, Text } from 'react-native';

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
import { readLocalMatch } from '../features/local/match/viewing';
import {
  localRecordContinueLabel,
  localRecordCoverInstruction,
  localRecordListInstruction,
  localVoteCloseInstruction,
  localVoteMissingLabel,
  localVoteRegisteredLabel,
} from '../features/local/match/copy';
import { localRecordEntry } from '../features/local/match/recordGate';
import type {
  LocalMatch,
  LocalVoteGesture,
} from '../features/local/rules/round';
import { openLocalResults } from '../features/local/rules/reveal';
import {
  closeLocalVote,
  confirmLocalVotes,
  localVoteForm,
  localVoteSummary,
  saveLocalVote,
} from '../features/local/rules/vote';
import { useAppNavigation } from '../hooks/useAppNavigation';
import { homeRoute } from '../navigation/routes';
import { theme } from '../theme/theme';

export function LocalRecordScreen() {
  const match = readLocalMatch();
  const round = match?.rounds.find((item) => item.status !== 'finished');
  if (!match || match.phase !== 'recording' || round === undefined) {
    return <EmptyRecord />;
  }
  return <Recorded match={match} roundNumber={round.number} />;
}

function Recorded({
  match: initial,
  roundNumber,
}: {
  match: LocalMatch;
  roundNumber: number;
}) {
  const [match, setMatch] = useState(initial);
  const [unlocked, setUnlocked] = useState(false);
  if (localRecordEntry(unlocked) === 'cover') {
    return <RecordCover onContinue={() => setUnlocked(true)} />;
  }
  return (
    <RecordList match={match} roundNumber={roundNumber} onSaved={setMatch} />
  );
}

function RecordCover({ onContinue }: { onContinue: () => void }) {
  const navigation = useAppNavigation();
  return (
    <ScrollView contentContainerStyle={styles.content}>
      <Heading>Carga</Heading>
      <HelperText>{localRecordCoverInstruction}</HelperText>
      <Button label={localRecordContinueLabel} onPress={onContinue} />
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

function EmptyRecord() {
  const navigation = useAppNavigation();
  return (
    <ScrollView contentContainerStyle={styles.content}>
      <Heading>Carga</Heading>
      <HelperText>Todavía no hay una ronda para anotar.</HelperText>
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

function RecordList({
  match,
  roundNumber,
  onSaved,
}: {
  match: LocalMatch;
  roundNumber: number;
  onSaved: (match: LocalMatch) => void;
}) {
  const navigation = useAppNavigation();
  const closing = useRef(false);
  const [busy, setBusy] = useState(false);
  const [playerId, setPlayerId] = useState<string | null>(null);
  const [askingClose, setAskingClose] = useState(false);
  const [confirmError, setConfirmError] = useState<string | undefined>();
  const rows = localVoteSummary(match, roundNumber);
  const closed =
    match.rounds.find((round) => round.number === roundNumber)?.status ===
    'voting';

  if (!closed && playerId !== null) {
    return (
      <VoteForm
        match={match}
        roundNumber={roundNumber}
        playerId={playerId}
        onClose={() => setPlayerId(null)}
        onSaved={onSaved}
      />
    );
  }

  function confirm() {
    const confirmed = confirmLocalVotes(match, roundNumber);
    if (!confirmed.ok) {
      setConfirmError(confirmed.message);
      return;
    }
    setConfirmError(undefined);
    setAskingClose(true);
  }

  function closeVote() {
    if (closing.current) {
      return;
    }
    closing.current = true;
    setBusy(true);
    const closedVote = closeLocalVote(match, roundNumber);
    if (!closedVote.ok) {
      closing.current = false;
      setBusy(false);
      setConfirmError(closedVote.message);
      setAskingClose(false);
      return;
    }
    const opened = openLocalResults(closedVote.match, roundNumber);
    const next = opened.ok ? opened.match : closedVote.match;
    void commitLocalMatch(next).then((saved) => {
      if (!saved.ok) {
        closing.current = false;
        setBusy(false);
        setConfirmError(localMatchSaveError);
        setAskingClose(false);
        return;
      }
      if (!opened.ok) {
        closing.current = false;
        setBusy(false);
        onSaved(closedVote.match);
        setConfirmError(opened.message);
        setAskingClose(false);
        return;
      }
      onSaved(opened.match);
      navigation.reset({ index: 0, routes: [{ name: 'LocalResults' }] });
    });
  }

  function showResults() {
    if (closing.current) {
      return;
    }
    closing.current = true;
    setBusy(true);
    const opened = openLocalResults(match, roundNumber);
    if (!opened.ok) {
      closing.current = false;
      setBusy(false);
      setConfirmError(opened.message);
      return;
    }
    void commitLocalMatch(opened.match).then((saved) => {
      if (!saved.ok) {
        closing.current = false;
        setBusy(false);
        setConfirmError(localMatchSaveError);
        return;
      }
      onSaved(opened.match);
      navigation.reset({ index: 0, routes: [{ name: 'LocalResults' }] });
    });
  }

  if (!closed && askingClose) {
    return (
      <ScrollView contentContainerStyle={styles.content}>
        <Heading>Cerrar</Heading>
        <HelperText>{localVoteCloseInstruction}</HelperText>
        {rows.map((row) => (
          <ContentCard key={row.playerId}>
            <Text style={styles.name}>{row.name}</Text>
            {row.action ? <HelperText>{row.action}</HelperText> : null}
          </ContentCard>
        ))}
        {confirmError ? <Message tone="error">{confirmError}</Message> : null}
        <Button
          label="Cerrar"
          onPress={closeVote}
          disabled={busy}
          loading={busy}
        />
        <Button
          label="Volver"
          variant="secondary"
          onPress={() => setAskingClose(false)}
          disabled={busy}
        />
      </ScrollView>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <Heading>Carga</Heading>
      <HelperText>{localRecordListInstruction}</HelperText>
      {rows.map((row) => (
        <ContentCard key={row.playerId}>
          <Text style={styles.name}>{row.name}</Text>
          <HelperText>
            {row.registered ? localVoteRegisteredLabel : localVoteMissingLabel}
          </HelperText>
          {row.action ? <HelperText>{row.action}</HelperText> : null}
          {closed ? null : (
            <Button
              label="Abrir"
              variant="secondary"
              onPress={() => setPlayerId(row.playerId)}
            />
          )}
        </ContentCard>
      ))}
      {confirmError ? <Message tone="error">{confirmError}</Message> : null}
      {closed ? (
        <Button
          label="Resultados"
          onPress={showResults}
          disabled={busy}
          loading={busy}
        />
      ) : (
        <Button label="Confirmar" onPress={confirm} disabled={busy} />
      )}
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

function VoteForm({
  match,
  roundNumber,
  playerId,
  onClose,
  onSaved,
}: {
  match: LocalMatch;
  roundNumber: number;
  playerId: string;
  onClose: () => void;
  onSaved: (match: LocalMatch) => void;
}) {
  const form = localVoteForm(match, roundNumber, playerId);
  const [gesture, setGesture] = useState<LocalVoteGesture | null>(
    form?.draft?.gesture ?? null,
  );
  const [targets, setTargets] = useState<string[]>(
    form?.draft ? [...form.draft.targets] : [],
  );
  const [error, setError] = useState<string | undefined>();
  const [saving, setSaving] = useState(false);
  const savingLock = useRef(false);
  if (form === undefined) {
    return null;
  }

  function toggle(id: string) {
    setTargets((current) =>
      current.includes(id)
        ? current.filter((item) => item !== id)
        : [...current, id],
    );
  }

  function save() {
    if (savingLock.current || gesture === null) {
      return;
    }
    const saved = saveLocalVote(match, roundNumber, {
      playerId,
      gesture,
      targets: gesture === 'point' ? targets : [],
    });
    if (!saved.ok) {
      setError(saved.message);
      return;
    }
    savingLock.current = true;
    setSaving(true);
    void commitLocalMatch(saved.match).then((stored) => {
      if (!stored.ok) {
        savingLock.current = false;
        setSaving(false);
        setError(localMatchSaveError);
        return;
      }
      onSaved(saved.match);
      onClose();
    });
  }

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <Heading>{form.playerName}</Heading>
      <Button
        label="Señalar"
        variant={gesture === 'point' ? 'primary' : 'secondary'}
        onPress={() => setGesture('point')}
        disabled={saving}
      />
      <Button
        label="Puño"
        variant={gesture === 'fist' ? 'primary' : 'secondary'}
        onPress={() => setGesture('fist')}
        disabled={saving}
      />
      <Button
        label="V"
        variant={gesture === 'v' ? 'primary' : 'secondary'}
        onPress={() => setGesture('v')}
        disabled={saving}
      />
      {gesture === 'point'
        ? form.others.map((other) => (
            <Button
              key={other.id}
              label={other.name}
              variant={targets.includes(other.id) ? 'primary' : 'secondary'}
              onPress={() => toggle(other.id)}
              disabled={saving}
            />
          ))
        : null}
      {error ? <Message tone="error">{error}</Message> : null}
      <Button
        label="Guardar"
        onPress={save}
        disabled={saving || gesture === null}
        loading={saving}
      />
      <Button
        label="Volver"
        variant="secondary"
        onPress={onClose}
        disabled={saving}
      />
    </ScrollView>
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
  name: {
    ...theme.typography.body,
    color: theme.colors.text,
  },
});
