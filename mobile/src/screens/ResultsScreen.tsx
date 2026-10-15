import { useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { useGuestSession } from '../app/GuestSessionProvider';
import {
  useRoomConnection,
  useRoomEvents,
} from '../app/RoomConnectionProvider';
import { Button } from '../components/Button';
import { Heading } from '../components/Heading';
import { HelperText } from '../components/HelperText';
import { Message } from '../components/Message';
import { screenStyles } from '../components/screenStyles';
import { useAppNavigation } from '../hooks/useAppNavigation';
import { homeRoute } from '../navigation/routes';
import {
  RoomRequestError,
  fetchRoundResults,
  fetchVoteWindow,
  networkMessage,
  type RoundResult,
  type VoteWindow,
} from '../services/api/rooms';
import { createSingleFlight } from '../services/api/singleFlight';
import { connectionLabel } from '../services/realtime/lobby';
import {
  applyReveal,
  explanation,
  gestureText,
  mayContinue,
  roundFinished,
} from '../services/realtime/results';
import { theme } from '../theme/theme';

export function ResultsScreen() {
  const navigation = useAppNavigation();
  const { session } = useGuestSession();
  const {
    connection,
    notice: connectionNotice,
    retry: retryConnection,
  } = useRoomConnection();
  const [windowState, setWindowState] = useState<VoteWindow | null>(null);
  const [results, setResults] = useState<readonly RoundResult[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [absence, setAbsence] = useState<string | undefined>();
  const [notice, setNotice] = useState<string | undefined>();
  const [retrying, setRetrying] = useState(false);
  const submitLock = useRef(createSingleFlight());
  const resultsRef = useRef<readonly RoundResult[] | null>(null);
  const left = useRef(false);
  const loadRef = useRef<(code: string, token: string) => Promise<void>>(
    async () => undefined,
  );

  useEffect(() => {
    if (!session) {
      return;
    }
    let alive = true;
    let ticket = 0;

    async function load(code: string, token: string) {
      const currentTicket = ticket + 1;
      ticket = currentTicket;
      if (alive) {
        setLoading(true);
        setNotice(undefined);
        setAbsence(undefined);
      }
      try {
        const round = await fetchVoteWindow(code, token);
        if (alive && currentTicket === ticket) {
          setWindowState(round);
        }
      } catch (error: unknown) {
        if (alive && currentTicket === ticket) {
          setNotice(error instanceof Error ? error.message : networkMessage);
        }
      }
      try {
        const revealed = await fetchRoundResults(code, token);
        if (!alive || currentTicket !== ticket) {
          return;
        }
        resultsRef.current = revealed;
        setResults(revealed);
        setAbsence(undefined);
      } catch (error: unknown) {
        if (!alive || currentTicket !== ticket || resultsRef.current !== null) {
          return;
        }
        if (
          error instanceof RoomRequestError &&
          error.code === 'results_unavailable'
        ) {
          setAbsence(error.message);
          return;
        }
        setNotice(error instanceof Error ? error.message : networkMessage);
      } finally {
        if (alive && currentTicket === ticket) {
          setLoading(false);
        }
      }
    }

    loadRef.current = load;

    return () => {
      alive = false;
      ticket += 1;
    };
  }, [session]);

  useRoomEvents(
    () => {
      const current = session;
      if (!current) {
        return;
      }
      void loadRef.current(current.roomCode, current.token);
    },
    (message) => {
      const update = applyReveal(resultsRef.current, message);
      if (update.results !== resultsRef.current) {
        resultsRef.current = update.results;
        setResults(update.results);
        setAbsence(undefined);
      }
      const current = session;
      if (update.reload && current) {
        void loadRef.current(current.roomCode, current.token);
      }
    },
  );

  async function retry() {
    if (!session) {
      return;
    }
    await submitLock.current(async () => {
      setRetrying(true);
      try {
        await loadRef.current(session.roomCode, session.token);
      } finally {
        setRetrying(false);
      }
    });
  }

  const ready = mayContinue(results);
  const shownNotice = notice ?? connectionNotice;

  return (
    <View style={screenStyles.container}>
      <Heading>Resultados</Heading>
      <HelperText>{connectionLabel[connection]}</HelperText>
      {session ? null : (
        <Message tone="warning">
          Todavía no hay un invitado en esta sala.
        </Message>
      )}
      {loading ? <HelperText>Cargando</HelperText> : null}
      {roundFinished(windowState?.status) ? (
        <HelperText>{`Ronda ${windowState?.number ?? ''} terminada`}</HelperText>
      ) : null}
      {results?.map((row) => {
        const note = explanation(row);
        return (
          <View key={row.name} style={styles.row}>
            <Text style={styles.name}>{row.name}</Text>
            <Text style={styles.line}>{`Carta ${row.card.number}`}</Text>
            <Text style={styles.line}>{row.card.text}</Text>
            <Text style={styles.line}>{gestureText(row.gesture)}</Text>
            <Text style={styles.line}>
              {row.targets.length > 0
                ? `Señala a ${row.targets.join(', ')}`
                : 'No señala a nadie'}
            </Text>
            <Text style={styles.line}>{`Puntos ${row.points}`}</Text>
            {note ? (
              <Text style={styles.line}>
                {note.names.length > 0
                  ? `${note.label}: ${note.names.join(', ')}`
                  : `${note.label}: nadie`}
              </Text>
            ) : null}
          </View>
        );
      })}
      {!loading && absence ? <Message tone="warning">{absence}</Message> : null}
      {shownNotice ? <Message tone="error">{shownNotice}</Message> : null}
      {connection === 'error' ? (
        <Button label="Reintentar" onPress={retryConnection} />
      ) : null}
      {connection !== 'error' && !loading && (absence || notice) ? (
        <Button
          label="Reintentar"
          loading={retrying}
          onPress={() => {
            void retry();
          }}
        />
      ) : null}
      <Button
        label="Continuar"
        disabled={!ready}
        onPress={() => {
          if (!ready || left.current) {
            return;
          }
          left.current = true;
          navigation.navigate('Scoreboard');
        }}
      />
      <Button
        label="Inicio"
        variant="secondary"
        accessibilityLabel="Volver al inicio"
        onPress={() =>
          navigation.reset({ index: 0, routes: [{ name: homeRoute }] })
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    alignSelf: 'stretch',
    gap: theme.spacing.xs,
  },
  name: {
    ...theme.typography.label,
    color: theme.colors.text,
  },
  line: {
    ...theme.typography.body,
    color: theme.colors.text,
  },
});
