import { useRef, useState, type ReactNode } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '../components/Button';
import { ContentCard } from '../components/ContentCard';
import { GesturePicker } from '../components/GesturePicker';
import { Heading } from '../components/Heading';
import { HelperText } from '../components/HelperText';
import { HomeButton } from '../components/HomeButton';
import { LocalAbandonControl } from '../components/LocalAbandonControl';
import { LocalRestartControl } from '../components/LocalRestartControl';
import { Message } from '../components/Message';
import { SelectableOption } from '../components/SelectableOption';
import { StatusBadge } from '../components/StatusBadge';
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
import {
  recordBackLabel,
  recordCloseLabel,
  recordConfirmLabel,
  recordOpenPlayerLabel,
  recordPhaseLabel,
  recordResultsLabel,
  recordRoundHeading,
  recordSaveVoteLabel,
  recordScreenTitle,
  recordTargetsHeading,
} from '../features/local/match/recordPresentation';
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
import { useExitToHomeOnBack } from '../hooks/useExitToHomeOnBack';
import { theme } from '../theme/theme';

export function LocalRecordScreen() {
  useExitToHomeOnBack();
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
    return (
      <RecordCover
        roundNumber={roundNumber}
        onContinue={() => setUnlocked(true)}
      />
    );
  }
  return (
    <RecordList match={match} roundNumber={roundNumber} onSaved={setMatch} />
  );
}

function RecordShell({ children }: { children: ReactNode }) {
  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <View style={styles.decorMint} pointerEvents="none" />
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        {children}
      </ScrollView>
    </SafeAreaView>
  );
}

function RecordCover({
  roundNumber,
  onContinue,
}: {
  roundNumber: number;
  onContinue: () => void;
}) {
  return (
    <RecordShell>
      <Heading>{recordScreenTitle}</Heading>
      <Text style={styles.roundLabel}>{recordRoundHeading(roundNumber)}</Text>
      <Text style={styles.phaseLabel}>{recordPhaseLabel}</Text>
      <HelperText>{localRecordCoverInstruction}</HelperText>
      <Button label={localRecordContinueLabel} onPress={onContinue} />
      <LocalRestartControl />
      <LocalAbandonControl />
      <HomeButton />
    </RecordShell>
  );
}

function EmptyRecord() {
  return (
    <RecordShell>
      <Heading>{recordScreenTitle}</Heading>
      <HelperText>Todavía no hay una ronda para anotar.</HelperText>
      <LocalRestartControl />
      <LocalAbandonControl />
      <HomeButton />
    </RecordShell>
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
  const allRegistered = rows.every((row) => row.registered);

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
      <RecordShell>
        <Heading>{recordCloseLabel}</Heading>
        <Text style={styles.roundLabel}>{recordRoundHeading(roundNumber)}</Text>
        <HelperText>{localVoteCloseInstruction}</HelperText>
        {rows.map((row) => (
          <ContentCard key={row.playerId}>
            <Text style={styles.name}>{row.name}</Text>
            {row.action ? <HelperText>{row.action}</HelperText> : null}
          </ContentCard>
        ))}
        {confirmError ? <Message tone="error">{confirmError}</Message> : null}
        <Button
          label={recordCloseLabel}
          onPress={closeVote}
          disabled={busy}
          loading={busy}
        />
        <Button
          label={recordBackLabel}
          variant="secondary"
          onPress={() => setAskingClose(false)}
          disabled={busy}
        />
      </RecordShell>
    );
  }

  return (
    <RecordShell>
      <Heading>{recordScreenTitle}</Heading>
      <Text style={styles.roundLabel}>{recordRoundHeading(roundNumber)}</Text>
      <Text style={styles.phaseLabel}>{recordPhaseLabel}</Text>
      <HelperText>{localRecordListInstruction}</HelperText>
      {rows.map((row) => (
        <ContentCard key={row.playerId}>
          <View style={styles.rowHeader}>
            <Text style={styles.name}>{row.name}</Text>
            <StatusBadge
              label={
                row.registered
                  ? localVoteRegisteredLabel
                  : localVoteMissingLabel
              }
              tone={row.registered ? 'success' : 'warning'}
            />
          </View>
          {row.action ? <HelperText>{row.action}</HelperText> : null}
          {closed ? null : (
            <Button
              label={recordOpenPlayerLabel}
              variant="secondary"
              onPress={() => setPlayerId(row.playerId)}
            />
          )}
        </ContentCard>
      ))}
      {confirmError ? <Message tone="error">{confirmError}</Message> : null}
      {closed ? (
        <Button
          label={recordResultsLabel}
          onPress={showResults}
          disabled={busy}
          loading={busy}
        />
      ) : (
        <Button
          label={recordConfirmLabel}
          onPress={confirm}
          disabled={busy || !allRegistered}
        />
      )}
      <LocalRestartControl />
      <LocalAbandonControl />
      <HomeButton />
    </RecordShell>
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
    <RecordShell>
      <Heading>{form.playerName}</Heading>
      <HelperText>{localRecordListInstruction}</HelperText>
      <GesturePicker
        value={gesture}
        onChange={(next) => {
          setGesture(next);
          if (next !== 'point') {
            setTargets([]);
          }
        }}
        disabled={saving}
      />
      {gesture === 'point' ? (
        <>
          <Text style={styles.targetsHeading}>{recordTargetsHeading}</Text>
          {form.others.map((other) => (
            <SelectableOption
              key={other.id}
              label={other.name}
              selected={targets.includes(other.id)}
              onPress={() => toggle(other.id)}
              disabled={saving}
            />
          ))}
        </>
      ) : null}
      {error ? <Message tone="error">{error}</Message> : null}
      <Button
        label={recordSaveVoteLabel}
        onPress={save}
        disabled={saving || gesture === null}
        loading={saving}
      />
      <Button
        label={recordBackLabel}
        variant="secondary"
        onPress={onClose}
        disabled={saving}
      />
    </RecordShell>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  decorMint: {
    position: 'absolute',
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: theme.brand.mint,
    opacity: 0.1,
    top: -70,
    right: -60,
  },
  content: {
    flexGrow: 1,
    gap: theme.spacing.lg,
    padding: theme.spacing.xl,
    paddingBottom: theme.spacing.xxl,
  },
  roundLabel: {
    ...theme.typography.label,
    color: theme.colors.primary,
    textAlign: 'center',
  },
  phaseLabel: {
    ...theme.typography.heading,
    fontSize: 22,
    lineHeight: 28,
    color: theme.colors.text,
    textAlign: 'center',
  },
  name: {
    ...theme.typography.body,
    fontWeight: '600',
    color: theme.colors.text,
    flexShrink: 1,
  },
  rowHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: theme.spacing.md,
  },
  targetsHeading: {
    ...theme.typography.label,
    color: theme.colors.text,
    textAlign: 'center',
  },
});
