import { useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { useGuestSession } from '../app/GuestSessionProvider';
import {
  useRoomConnection,
  useRoomEvents,
} from '../app/RoomConnectionProvider';
import { Button } from '../components/Button';
import { HomeButton } from '../components/HomeButton';
import { Heading } from '../components/Heading';
import { HelperText } from '../components/HelperText';
import { Message } from '../components/Message';
import { screenStyles } from '../components/screenStyles';
import { useAppNavigation } from '../hooks/useAppNavigation';
import {
  fetchOwnCard,
  fetchRoundPhase,
  networkMessage,
  type RoundPhase,
} from '../services/api/rooms';
import { createSingleFlight } from '../services/api/singleFlight';
import {
  applyPhaseEvent,
  endVisualization,
  isMissingCard,
  mayOpenConversation,
  retainCard,
  type HeldCard,
} from '../services/realtime/secretCard';
import { theme } from '../theme/theme';

export function SecretCardScreen() {
  const navigation = useAppNavigation();
  const { session } = useGuestSession();
  const {
    connection,
    notice: connectionNotice,
    retry: retryConnection,
  } = useRoomConnection();
  const [phase, setPhase] = useState<RoundPhase | null>(null);
  const [held, setHeld] = useState<HeldCard | null>(null);
  const [loading, setLoading] = useState(false);
  const [absence, setAbsence] = useState<string | undefined>();
  const [notice, setNotice] = useState<string | undefined>();
  const [retrying, setRetrying] = useState(false);
  const submitLock = useRef(createSingleFlight());
  const phaseRef = useRef<RoundPhase | null>(null);
  const heldRef = useRef<HeldCard | null>(null);
  const loadRef = useRef<(code: string, token: string) => Promise<void>>(
    async () => undefined,
  );
  const sessionRef = useRef(session);

  useEffect(() => {
    sessionRef.current = session;
  });

  useEffect(() => {
    if (!session) {
      return;
    }
    let alive = true;
    let generation = 0;

    async function load(code: string, token: string) {
      const ticket = generation + 1;
      generation = ticket;
      if (alive) {
        setLoading(true);
        setNotice(undefined);
        setAbsence(undefined);
      }
      try {
        const nextPhase = await fetchRoundPhase(code, token);
        if (!alive || ticket !== generation) {
          return;
        }
        phaseRef.current = nextPhase;
        setPhase(nextPhase);
        try {
          const card = await fetchOwnCard(code, token);
          if (!alive || ticket !== generation) {
            return;
          }
          const active = phaseRef.current?.number ?? null;
          const nextHeld = retainCard(active, nextPhase.number, card);
          const visible =
            nextHeld !== null &&
            (nextPhase.status === 'conversation' ||
              nextPhase.status === 'voting');
          const shown = visible ? nextHeld : endVisualization();
          heldRef.current = shown;
          setHeld(shown);
        } catch (error: unknown) {
          if (!alive || ticket !== generation) {
            return;
          }
          heldRef.current = endVisualization();
          setHeld(endVisualization());
          rememberFailure(error);
        }
      } catch (error: unknown) {
        if (!alive || ticket !== generation) {
          return;
        }
        phaseRef.current = null;
        heldRef.current = endVisualization();
        setPhase(null);
        setHeld(endVisualization());
        rememberFailure(error);
      } finally {
        if (alive && ticket === generation) {
          setLoading(false);
        }
      }
    }

    function rememberFailure(error: unknown) {
      const message = error instanceof Error ? error.message : networkMessage;
      if (isMissingCard(error)) {
        setAbsence(message);
        return;
      }
      setNotice(message);
    }

    loadRef.current = load;

    return () => {
      alive = false;
      generation += 1;
      phaseRef.current = null;
      heldRef.current = endVisualization();
    };
  }, [session]);

  useRoomEvents(
    () => {
      const current = sessionRef.current;
      if (!current) {
        return;
      }
      void loadRef.current(current.roomCode, current.token);
    },
    (message) => {
      const effect = applyPhaseEvent(
        phaseRef.current,
        heldRef.current,
        message,
      );
      if (effect.kind === 'ignore') {
        return;
      }
      phaseRef.current = effect.phase;
      setPhase(effect.phase);
      if (effect.held === null) {
        heldRef.current = endVisualization();
        setHeld(endVisualization());
      }
      const current = sessionRef.current;
      if (effect.reload && current) {
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

  const card = held?.card;
  const shownNotice = notice ?? connectionNotice;

  return (
    <View style={screenStyles.container}>
      <Heading>Carta secreta</Heading>
      {session ? null : (
        <Message tone="warning">
          Todavía no hay un invitado en esta sala.
        </Message>
      )}
      {loading ? <HelperText>Cargando</HelperText> : null}
      {!loading && card ? (
        <>
          <HelperText>{`Carta ${card.number}`}</HelperText>
          <Text style={styles.card}>{card.text}</Text>
        </>
      ) : null}
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
        disabled={!mayOpenConversation(phase?.status)}
        onPress={() => navigation.navigate('Conversation')}
      />
      <HomeButton />
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    ...theme.typography.body,
    color: theme.colors.text,
  },
});
