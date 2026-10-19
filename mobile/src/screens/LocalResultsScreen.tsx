import { useEffect, useRef, useState, type ReactNode } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '../components/Button';
import { ContentCard } from '../components/ContentCard';
import { Heading } from '../components/Heading';
import { HelperText } from '../components/HelperText';
import { HomeButton } from '../components/HomeButton';
import { LocalAbandonControl } from '../components/LocalAbandonControl';
import { LocalChangePlayersControl } from '../components/LocalChangePlayersControl';
import { LocalPlayAgainControl } from '../components/LocalPlayAgainControl';
import { LocalRestartControl } from '../components/LocalRestartControl';
import { Message } from '../components/Message';
import { ResultPlayerCard } from '../components/ResultPlayerCard';
import { StandingRow } from '../components/StandingRow';
import { deviceRng } from '../features/local/catalog/rng';
import {
  commitLocalMatch,
  localMatchSaveError,
} from '../features/local/match/autosave';
import {
  localNextRoundLabel,
  localResultsCopy,
  localRoundHeading,
  localStandingsLabel,
  localTeamsLabel,
} from '../features/local/match/copy';
import {
  presentLocalResults,
  type LocalResultsCelebration,
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
import { useExitToHomeOnBack } from '../hooks/useExitToHomeOnBack';
import { theme } from '../theme/theme';

export function LocalResultsScreen() {
  useExitToHomeOnBack();
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

function ResultsShell({ children }: { children: ReactNode }) {
  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <View style={styles.decorMint} pointerEvents="none" />
      <View style={styles.decorYellow} pointerEvents="none" />
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        {children}
      </ScrollView>
    </SafeAreaView>
  );
}

function AbsentResults({ message }: { message: string }) {
  return (
    <ResultsShell>
      <Heading>Resultados</Heading>
      {message === absentLocalResultMessage ? (
        <HelperText>{message}</HelperText>
      ) : (
        <Message tone="error">{message}</Message>
      )}
      <LocalRestartControl />
      <LocalAbandonControl />
      <HomeButton />
    </ResultsShell>
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
    <ResultsShell>
      <Heading>{copy.title}</Heading>
      <Text style={styles.roundLabel}>
        {localRoundHeading(presentation.roundNumber)}
      </Text>
      <HelperText>{copy.message}</HelperText>
      {presentation.winnersLine ? (
        <CelebrationBanner
          line={presentation.winnersLine}
          celebration={presentation.celebration}
        />
      ) : null}
      {presentation.teamLines.length > 0 ? (
        <>
          <Text style={styles.sectionLabel}>{localTeamsLabel}</Text>
          <ContentCard>
            {presentation.teamLines.map((line) => (
              <Text key={line} style={styles.teamLine}>
                {line}
              </Text>
            ))}
          </ContentCard>
        </>
      ) : null}
      {presentation.rows.map((row) => (
        <ResultPlayerCard key={row.playerId} row={row} />
      ))}
      <Text style={styles.sectionLabel}>{localStandingsLabel}</Text>
      {presentation.standings.map((row) => (
        <StandingRow key={row.playerId} standing={row} />
      ))}
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
      <HomeButton />
    </ResultsShell>
  );
}

function CelebrationBanner({
  line,
  celebration,
}: {
  line: string;
  celebration: LocalResultsCelebration;
}) {
  const tone =
    celebration === 'victory'
      ? styles.bannerVictory
      : celebration === 'tie'
        ? styles.bannerTie
        : styles.bannerNeutral;
  return (
    <View
      accessibilityRole="text"
      accessibilityLabel={line}
      style={[styles.banner, tone]}
    >
      <Text style={styles.bannerText}>{line}</Text>
    </View>
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
  decorYellow: {
    position: 'absolute',
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: theme.brand.yellow,
    opacity: 0.12,
    bottom: 40,
    left: -50,
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
  sectionLabel: {
    ...theme.typography.label,
    color: theme.colors.text,
    textAlign: 'center',
  },
  teamLine: {
    ...theme.typography.body,
    color: theme.colors.text,
  },
  banner: {
    alignSelf: 'stretch',
    borderRadius: theme.radii.card,
    paddingVertical: theme.spacing.lg,
    paddingHorizontal: theme.spacing.xl,
    borderWidth: 2,
  },
  bannerVictory: {
    backgroundColor: theme.colors.successSurface,
    borderColor: theme.colors.primary,
  },
  bannerTie: {
    backgroundColor: theme.colors.warningSurface,
    borderColor: theme.brand.yellow,
  },
  bannerNeutral: {
    backgroundColor: theme.colors.neutralSurface,
    borderColor: theme.colors.border,
  },
  bannerText: {
    ...theme.typography.heading,
    fontSize: 22,
    lineHeight: 28,
    color: theme.colors.text,
    textAlign: 'center',
  },
});
