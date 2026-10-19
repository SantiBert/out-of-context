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
  fetchConversationRound,
  networkMessage,
  type ConversationRound,
} from '../services/api/rooms';
import { createSingleFlight } from '../services/api/singleFlight';
import { markBastaUncertain } from '../services/realtime/connection';
import {
  applyConversationEvent,
  bastaCommand,
  mayCallBasta,
  mayRaiseHand,
  raiseHandCommand,
} from '../services/realtime/conversation';
import { connectionLabel } from '../services/realtime/lobby';
import { theme } from '../theme/theme';

const statusLabel: Record<string, string> = {
  prepared: 'Preparada',
  conversation: 'Conversación',
  voting: 'Votación',
  finished: 'Terminada',
};

const bastaUncertainMessage = 'No se pudo confirmar ¡Basta!.';

export function ConversationScreen() {
  const navigation = useAppNavigation();
  const { session } = useGuestSession();
  const {
    connection,
    notice: connectionNotice,
    room,
    retry,
    send: socketSend,
  } = useRoomConnection();
  const [round, setRound] = useState<ConversationRound | null>(null);
  const [notice, setNotice] = useState<string | undefined>();
  const [bastaUncertain, setBastaUncertain] = useState(false);
  const [raising, setRaising] = useState(false);
  const [calling, setCalling] = useState(false);
  const raiseLock = useRef(createSingleFlight());
  const bastaLock = useRef(createSingleFlight());
  const roundRef = useRef<ConversationRound | null>(null);
  const pendingBasta = useRef(false);
  const wasLive = useRef(false);
  const loadRef = useRef<() => void>(() => undefined);
  const left = useRef(false);
  const openVoteRef = useRef(() => undefined);

  useEffect(() => {
    openVoteRef.current = () => {
      if (left.current) {
        return;
      }
      left.current = true;
      navigation.navigate('Voting');
    };
  });

  useEffect(() => {
    if (
      markBastaUncertain(pendingBasta.current, connection === 'live') &&
      wasLive.current
    ) {
      pendingBasta.current = false;
      setBastaUncertain(true);
      setNotice(bastaUncertainMessage);
    }
    wasLive.current = connection === 'live';
  }, [connection]);

  useEffect(() => {
    if (!session) {
      return;
    }
    const current = session;
    let alive = true;
    let roundTicket = 0;

    function rememberRound(next: ConversationRound) {
      roundRef.current = next;
      setRound(next);
      if (next.status === 'voting') {
        pendingBasta.current = false;
        setBastaUncertain(false);
        openVoteRef.current();
      }
    }

    function loadRound() {
      const ticket = roundTicket + 1;
      roundTicket = ticket;
      fetchConversationRound(current.roomCode, current.token)
        .then((loaded) => {
          if (!alive || ticket !== roundTicket) {
            return;
          }
          rememberRound(loaded);
        })
        .catch((error: unknown) => {
          if (alive && ticket === roundTicket) {
            setNotice(error instanceof Error ? error.message : networkMessage);
          }
        });
    }

    loadRef.current = loadRound;

    return () => {
      alive = false;
      roundTicket += 1;
    };
  }, [session]);

  useRoomEvents(
    () => {
      loadRef.current();
    },
    (message) => {
      const update = applyConversationEvent(roundRef.current, message);
      if (update.round !== roundRef.current) {
        roundRef.current = update.round;
        setRound(update.round);
      }
      if (update.notice) {
        pendingBasta.current = false;
        setBastaUncertain(false);
        setNotice(update.notice);
      }
      if (update.vote) {
        pendingBasta.current = false;
        setBastaUncertain(false);
        openVoteRef.current();
      }
      if (update.reload) {
        loadRef.current();
      }
    },
  );

  async function send(
    lock: ReturnType<typeof createSingleFlight>,
    command: { type: string; payload: Record<string, never> },
    setBusy: (busy: boolean) => void,
  ) {
    if (connection !== 'live') {
      return;
    }
    await lock(async () => {
      setBusy(true);
      setNotice(undefined);
      const result = socketSend(command);
      if (result === 'sent' && command.type === bastaCommand.type) {
        pendingBasta.current = true;
        setBastaUncertain(false);
      }
      if (result === 'unavailable' && command.type === bastaCommand.type) {
        pendingBasta.current = false;
        setBastaUncertain(true);
        setNotice(bastaUncertainMessage);
      }
      if (result === 'unavailable' && command.type === raiseHandCommand.type) {
        setNotice(networkMessage);
      }
      setBusy(false);
    });
  }

  const ready = round?.ready ?? [];
  const canRaise =
    session !== null && mayRaiseHand(round?.status, ready, session.name);
  const canBasta = mayCallBasta(round?.status);
  const shownNotice = notice ?? connectionNotice;

  return (
    <View style={screenStyles.container}>
      <Heading>Conversación</Heading>
      <HelperText>{connectionLabel[connection]}</HelperText>
      {session ? null : (
        <Message tone="warning">
          Todavía no hay un invitado en esta sala.
        </Message>
      )}
      {round ? (
        <>
          <HelperText>{`Ronda ${round.number}`}</HelperText>
          <HelperText>
            {`Estado ${statusLabel[round.status] ?? round.status}`}
          </HelperText>
        </>
      ) : null}
      {room?.participants.map((name) => (
        <Text key={name} style={styles.participant}>
          {ready.includes(name) ? `${name} · Mano levantada` : name}
        </Text>
      ))}
      {shownNotice ? <Message tone="error">{shownNotice}</Message> : null}
      {connection === 'error' ? (
        <Button label="Reintentar" onPress={retry} />
      ) : null}
      {bastaUncertain && connection === 'live' ? (
        <Button
          label="Reintentar"
          loading={calling}
          onPress={() => {
            void send(bastaLock.current, bastaCommand, setCalling);
          }}
        />
      ) : null}
      <Button
        label="Levantar la mano"
        disabled={connection !== 'live' || !canRaise}
        loading={raising}
        onPress={() => {
          void send(raiseLock.current, raiseHandCommand, setRaising);
        }}
      />
      <Button
        label="¡Basta!"
        disabled={connection !== 'live' || !canBasta}
        loading={calling}
        onPress={() => {
          void send(bastaLock.current, bastaCommand, setCalling);
        }}
      />
      <HomeButton />
    </View>
  );
}

const styles = StyleSheet.create({
  participant: {
    ...theme.typography.body,
    color: theme.colors.text,
  },
});
