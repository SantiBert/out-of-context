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
  fetchScoreboard,
  networkMessage,
  type Scoreboard,
} from '../services/api/rooms';
import { createSingleFlight } from '../services/api/singleFlight';
import { connectionLabel } from '../services/realtime/lobby';
import {
  applyScoreEvent,
  readScoreboard,
  visibleWinners,
} from '../services/realtime/scoreboard';
import { theme } from '../theme/theme';

const statusLabel: Record<string, string> = {
  preparing: 'Partida en curso',
  in_progress: 'Partida en curso',
  finished: 'Partida finalizada',
};

export function ScoreboardScreen() {
  const navigation = useAppNavigation();
  const { session } = useGuestSession();
  const {
    connection,
    notice: connectionNotice,
    retry: retryConnection,
  } = useRoomConnection();
  const [board, setBoard] = useState<Scoreboard | null>(null);
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState<string | undefined>();
  const [retrying, setRetrying] = useState(false);
  const submitLock = useRef(createSingleFlight());
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
      }
      try {
        const loaded = readScoreboard(await fetchScoreboard(code, token));
        if (!alive || currentTicket !== ticket) {
          return;
        }
        setBoard(loaded);
      } catch (error: unknown) {
        if (alive && currentTicket === ticket) {
          setNotice(error instanceof Error ? error.message : networkMessage);
        }
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
      if (!session) {
        return;
      }
      void loadRef.current(session.roomCode, session.token);
    },
    (message) => {
      if (!session) {
        return;
      }
      if (applyScoreEvent(message).reload) {
        void loadRef.current(session.roomCode, session.token);
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

  const winners = board ? visibleWinners(board) : [];
  const shownNotice = notice ?? connectionNotice;

  return (
    <View style={screenStyles.container}>
      <Heading>Marcador</Heading>
      <HelperText>{connectionLabel[connection]}</HelperText>
      {session ? null : (
        <Message tone="warning">
          Todavía no hay un invitado en esta sala.
        </Message>
      )}
      {loading ? <HelperText>Cargando</HelperText> : null}
      {loading || notice || !board ? null : (
        <HelperText>{statusLabel[board.status] ?? board.status}</HelperText>
      )}
      {loading || notice
        ? null
        : board?.standings.map((row) => (
            <Text key={row.name} style={styles.line}>
              {`${row.name} · ${row.points}`}
            </Text>
          ))}
      {loading || notice || board?.status !== 'finished' ? null : (
        <HelperText>
          {winners.length > 0
            ? `Ganadores: ${winners.join(', ')}`
            : 'Ganadores: nadie'}
        </HelperText>
      )}
      {shownNotice ? <Message tone="error">{shownNotice}</Message> : null}
      {connection === 'error' ? (
        <Button label="Reintentar" onPress={retryConnection} />
      ) : null}
      {connection !== 'error' && !loading && notice ? (
        <Button
          label="Reintentar"
          loading={retrying}
          onPress={() => {
            void retry();
          }}
        />
      ) : null}
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
  line: {
    ...theme.typography.body,
    color: theme.colors.text,
  },
});
