import { useEffect, useRef, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { Button } from '../components/Button';
import { ContentCard } from '../components/ContentCard';
import { Heading } from '../components/Heading';
import { HelperText } from '../components/HelperText';
import { LocalAbandonControl } from '../components/LocalAbandonControl';
import { LocalChangePlayersControl } from '../components/LocalChangePlayersControl';
import { LocalPlayAgainControl } from '../components/LocalPlayAgainControl';
import { LocalRestartControl } from '../components/LocalRestartControl';
import { Message } from '../components/Message';
import { StatusBadge } from '../components/StatusBadge';
import { screenStyles } from '../components/screenStyles';
import { deviceRng } from '../features/local/catalog/rng';
import {
  commitLocalMatch,
  localMatchSaveError,
} from '../features/local/match/autosave';
import {
  localMatchTotalLabel,
  localNextRoundLabel,
  localResultsCopy,
  localRoundHeading,
  localRoundPointsLabel,
  localStandingsLabel,
} from '../features/local/match/copy';
import {
  presentLocalResults,
  type LocalPresentedRow,
  type LocalResultsPresentation,
} from '../features/local/match/resultsPresentation';
import { readLocalMatch } from '../features/local/match/viewing';
import {
  localScoreboard,
  settleLocalRound,
} from '../features/local/rules/board';
import {
  absentLocalResultMessage,
  localResultView,
} from '../features/local/rules/reveal';
import {
  prepareLocalRound,
  type LocalMatch,
  type LocalRound,
} from '../features/local/rules/round';
import { useAppNavigation } from '../hooks/useAppNavigation';
import { homeRoute } from '../navigation/routes';
import { theme } from '../theme/theme';

export function LocalResultsScreen() {
  const [initial] = useState(readLocalMatch);
  const [match, setMatch] = useState(initial);
  const [saveError, setSaveError] = useState<string | undefined>();
  const advancingRef = useRef(false);

  useEffect(() => {
    if (initial === null) {
      return;
    }
    const round = latestAwardedRound(initial);
    if (round === undefined) {
      return;
    }
    const settled = settleLocalRound(initial, round.number);
    if (!settled.ok || settled.match === initial) {
      return;
    }
    let active = true;
    void commitLocalMatch(settled.match).then((saved) => {
      if (!active || advancingRef.current) {
        return;
      }
      if (!saved.ok) {
        setSaveError(localMatchSaveError);
        return;
      }
      setMatch(settled.match);
    });
    return () => {
      active = false;
    };
  }, [initial]);

  const round = match === null ? undefined : latestAwardedRound(match);
  if (!match || round === undefined) {
    return <AbsentResults message={absentLocalResultMessage} />;
  }
  const view = localResultView(match, round.number);
  if (!view.ok) {
    return <AbsentResults message={view.message} />;
  }
  const finished = match.status === 'finished' || match.phase === 'finished';
  const presentation = presentLocalResults(
    match,
    view,
    localScoreboard(match),
    round.number,
    finished,
  );
  return (
    <Revealed
      match={match}
      roundNumber={round.number}
      presentation={presentation}
      finished={finished}
      saveError={saveError}
      onAdvance={() => {
        advancingRef.current = true;
      }}
    />
  );
}

function latestAwardedRound(match: LocalMatch): LocalRound | undefined {
  let awarded: LocalRound | undefined;
  for (const round of match.rounds) {
    if (round.awards !== undefined) {
      awarded = round;
    }
  }
  return awarded;
}

function AbsentResults({ message }: { message: string }) {
  const navigation = useAppNavigation();
  return (
    <View style={screenStyles.container}>
      <Heading>Resultados</Heading>
      {message === absentLocalResultMessage ? (
        <HelperText>{message}</HelperText>
      ) : (
        <Message tone="error">{message}</Message>
      )}
      <LocalRestartControl />
      <LocalAbandonControl />
      <HomeButton
        onPress={() =>
          navigation.reset({ index: 0, routes: [{ name: homeRoute }] })
        }
      />
    </View>
  );
}

function Revealed({
  match,
  roundNumber,
  presentation,
  finished,
  saveError,
  onAdvance,
}: {
  match: LocalMatch;
  roundNumber: number;
  presentation: LocalResultsPresentation;
  finished: boolean;
  saveError?: string;
  onAdvance: () => void;
}) {
  const navigation = useAppNavigation();
  const copy = localResultsCopy(finished);
  const [nextError, setNextError] = useState<string | undefined>();
  const [pending, setPending] = useState(false);
  const busy = useRef(false);

  function openNextRound() {
    if (busy.current) {
      return;
    }
    onAdvance();
    const settled = settleLocalRound(match, roundNumber);
    const source = settled.ok ? settled.match : match;
    const next = prepareLocalRound(source, deviceRng());
    if (!next.ok) {
      setNextError(next.message);
      return;
    }
    busy.current = true;
    setPending(true);
    setNextError(undefined);
    void commitLocalMatch(next.match).then((saved) => {
      busy.current = false;
      setPending(false);
      if (!saved.ok) {
        setNextError(localMatchSaveError);
        return;
      }
      navigation.reset({ index: 0, routes: [{ name: 'LocalCard' }] });
    });
  }

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <Heading>{copy.title}</Heading>
      <HelperText>{copy.message}</HelperText>
      <HelperText>{localRoundHeading(presentation.roundNumber)}</HelperText>
      {presentation.rows.map((row) => (
        <PlayerResultCard key={row.playerId} row={row} />
      ))}
      <HelperText>{localStandingsLabel}</HelperText>
      {presentation.standings.map((row) => (
        <ContentCard key={row.playerId}>
          <View
            accessibilityLabel={row.accessibilityLabel}
            style={styles.standingRow}
          >
            <Text style={styles.name}>{row.name}</Text>
            <Text style={styles.totalPoints}>{String(row.points)}</Text>
          </View>
        </ContentCard>
      ))}
      {presentation.winnersLine ? (
        <Text
          accessibilityRole="text"
          accessibilityLabel={presentation.winnersLine}
          style={styles.winners}
        >
          {presentation.winnersLine}
        </Text>
      ) : null}
      {saveError ? <Message tone="error">{saveError}</Message> : null}
      {nextError ? <Message tone="error">{nextError}</Message> : null}
      {finished ? null : (
        <Button
          label={localNextRoundLabel}
          onPress={openNextRound}
          disabled={pending}
          loading={pending}
        />
      )}
      {finished ? <LocalPlayAgainControl /> : <LocalRestartControl />}
      {finished ? <LocalChangePlayersControl /> : null}
      <LocalAbandonControl />
      <HomeButton
        onPress={() =>
          navigation.reset({ index: 0, routes: [{ name: homeRoute }] })
        }
      />
    </ScrollView>
  );
}

function PlayerResultCard({ row }: { row: LocalPresentedRow }) {
  return (
    <ContentCard>
      <View
        accessibilityLabel={row.accessibilityLabel}
        style={styles.playerBlock}
      >
        <Text style={styles.name}>{row.name}</Text>
        <StatusBadge
          label={row.roleLabel}
          tone={row.role === 'impostor' ? 'danger' : 'success'}
        />
        <HelperText>{row.cardLabel}</HelperText>
        {row.cardText === undefined ? null : (
          <HelperText>{row.cardText}</HelperText>
        )}
        <HelperText>{row.action}</HelperText>
        <HelperText>{row.explanation}</HelperText>
        <HelperText>{localRoundPointsLabel}</HelperText>
        <Text
          accessibilityLabel={`${localRoundPointsLabel} ${row.roundPoints}`}
          style={styles.roundPoints}
        >
          {String(row.roundPoints)}
        </Text>
        <HelperText>{localMatchTotalLabel}</HelperText>
        <Text
          accessibilityLabel={`${localMatchTotalLabel} ${row.totalPoints}`}
          style={styles.totalPoints}
        >
          {String(row.totalPoints)}
        </Text>
      </View>
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
  playerBlock: {
    gap: theme.spacing.sm,
  },
  standingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: theme.spacing.md,
  },
  name: {
    ...theme.typography.label,
    color: theme.colors.text,
  },
  roundPoints: {
    ...theme.typography.heading,
    color: theme.colors.primary,
  },
  totalPoints: {
    ...theme.typography.body,
    fontWeight: '600',
    color: theme.colors.muted,
  },
  winners: {
    ...theme.typography.label,
    color: theme.colors.success,
  },
});
