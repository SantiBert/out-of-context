import { useRef, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BrandMark } from '../components/BrandMark';
import { Button } from '../components/Button';
import { ContentCard } from '../components/ContentCard';
import { Heading } from '../components/Heading';
import { HelperText } from '../components/HelperText';
import { Message } from '../components/Message';
import { PlayerRosterRow } from '../components/PlayerRosterRow';
import { dealLocalMatch } from '../features/local/catalog/deal';
import { deviceRng } from '../features/local/catalog/rng';
import { localCatalogSituations } from '../features/local/catalog/situations';
import {
  commitLocalMatch,
  localMatchSaveError,
} from '../features/local/match/autosave';
import {
  matchConfigBackLabel,
  matchConfigDealHeading,
  matchConfigPlayersHeading,
  matchConfigRulesBullets,
  matchConfigRulesHeading,
  matchConfigSummary,
  matchConfigTitle,
  matchConfigUnavailable,
  startMatchLabel,
} from '../features/local/match/matchConfigPresentation';
import { playerDisplayIndex } from '../features/local/match/setupPresentation';
import { readLocalMatch } from '../features/local/match/viewing';
import {
  confirmPendingSetup,
  localRosterMutable,
  startedLocalRosterMessage,
  validateSetup,
  type LocalSetupMatch,
} from '../features/local/match/setup';
import { useAppNavigation } from '../hooks/useAppNavigation';
import { createSingleFlight } from '../services/api/singleFlight';
import { theme } from '../theme/theme';

function asSetupMatch(): LocalSetupMatch | null {
  const held = readLocalMatch();
  if (held === null || held.phase !== 'setup') {
    return null;
  }
  if (!localRosterMutable(held)) {
    return null;
  }
  const setup: LocalSetupMatch = {
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
  const check = validateSetup(setup);
  if (!check.ok) {
    return null;
  }
  return setup;
}

export function LocalMatchConfigScreen() {
  const navigation = useAppNavigation();
  const match = asSetupMatch();
  const summary = match ? matchConfigSummary(match.players.length) : null;
  const [error, setError] = useState<string | undefined>();
  const [loading, setLoading] = useState(false);
  const continueLock = useRef(createSingleFlight());
  const accepted = useRef(false);
  const saving = useRef(false);

  function goBackToPlayers() {
    navigation.navigate('LocalSetup');
  }

  function startMatch() {
    const current = asSetupMatch();
    if (current === null) {
      setError(matchConfigUnavailable);
      return;
    }
    const held = readLocalMatch();
    if (held !== null && !localRosterMutable(held)) {
      setError(startedLocalRosterMessage);
      return;
    }
    const result = confirmPendingSetup(current, accepted.current);
    if (!result.entered) {
      return;
    }
    accepted.current = true;
    if (!result.ok) {
      accepted.current = false;
      setError(result.message);
      return;
    }
    if (saving.current) {
      return;
    }
    saving.current = true;
    setLoading(true);
    void continueLock.current(async () => {
      const dealt = dealLocalMatch(
        result.match,
        localCatalogSituations(),
        deviceRng(),
      );
      if (!dealt.ok) {
        saving.current = false;
        accepted.current = false;
        setLoading(false);
        setError(dealt.message);
        return;
      }
      const saved = await commitLocalMatch(dealt.match);
      saving.current = false;
      setLoading(false);
      if (!saved.ok) {
        accepted.current = false;
        setError(localMatchSaveError);
        return;
      }
      setError(undefined);
      navigation.reset({ index: 0, routes: [{ name: 'LocalCard' }] });
    });
  }

  if (match === null || summary === null) {
    return (
      <SafeAreaView style={styles.safe} edges={['bottom']}>
        <View style={styles.content}>
          <Heading>{matchConfigTitle}</Heading>
          <Message tone="error">{matchConfigUnavailable}</Message>
          <Button
            label={matchConfigBackLabel}
            variant="secondary"
            onPress={goBackToPlayers}
          />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.content}>
        <BrandMark size="sm" variant="light" />
        <Heading>{matchConfigTitle}</Heading>
        <HelperText>{summary.playerCountLabel}</HelperText>

        <ContentCard>
          <Text style={styles.cardTitle}>{matchConfigPlayersHeading}</Text>
          {match.players.map((player) => (
            <PlayerRosterRow
              key={player.id}
              index={playerDisplayIndex(match.players, player.id)}
              name={player.name}
            />
          ))}
        </ContentCard>

        <ContentCard>
          <Text style={styles.cardTitle}>{matchConfigDealHeading}</Text>
          <Text style={styles.cardLine}>{summary.pileCountLabel}</Text>
          <Text style={styles.cardLine}>{summary.pilesPerRoundLabel}</Text>
          <Text style={styles.cardLine}>{summary.maxRoundsLabel}</Text>
        </ContentCard>

        <ContentCard>
          <Text style={styles.cardTitle}>{matchConfigRulesHeading}</Text>
          {matchConfigRulesBullets.map((bullet) => (
            <Text key={bullet} style={styles.cardLine}>
              {`• ${bullet}`}
            </Text>
          ))}
        </ContentCard>

        {error ? <Message tone="error">{error}</Message> : null}

        <Button
          label={startMatchLabel}
          onPress={startMatch}
          disabled={loading}
          loading={loading}
        />
        <Button
          label={matchConfigBackLabel}
          variant="secondary"
          onPress={goBackToPlayers}
          disabled={loading}
        />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  content: {
    flexGrow: 1,
    gap: theme.spacing.lg,
    padding: theme.spacing.xl,
    paddingBottom: theme.spacing.xxl,
    backgroundColor: theme.colors.background,
  },
  cardTitle: {
    ...theme.typography.label,
    color: theme.colors.text,
  },
  cardLine: {
    ...theme.typography.body,
    color: theme.colors.text,
  },
});
