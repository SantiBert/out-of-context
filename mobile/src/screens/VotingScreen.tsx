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
  castVote,
  fetchVoteWindow,
  networkMessage,
  type VoteChoice,
  type VoteGesture,
  type VoteWindow,
} from '../services/api/rooms';
import { createSingleFlight } from '../services/api/singleFlight';
import { connectionLabel } from '../services/realtime/lobby';
import {
  applyVoteEvent,
  canEdit,
  confirmBallot,
  controlsLocked,
  doubtBallot,
  pointTargets,
} from '../services/realtime/voting';
import { theme } from '../theme/theme';

const gestureLabel: Record<VoteGesture, string> = {
  point: 'Señalar',
  fist: 'Puño',
  v: 'Arriesgar',
};

export function VotingScreen() {
  const navigation = useAppNavigation();
  const { session } = useGuestSession();
  const {
    connection,
    notice: connectionNotice,
    room,
    retry,
  } = useRoomConnection();
  const [windowState, setWindowState] = useState<VoteWindow | null>(null);
  const [gesture, setGesture] = useState<VoteGesture | null>(null);
  const [selected, setSelected] = useState<readonly string[]>([]);
  const [confirmed, setConfirmed] = useState<VoteChoice | null>(null);
  const [unknown, setUnknown] = useState<VoteChoice | null>(null);
  const [roundRejected, setRoundRejected] = useState(false);
  const [notice, setNotice] = useState<string | undefined>();
  const [sending, setSending] = useState(false);
  const submitLock = useRef(createSingleFlight());
  const windowRef = useRef<VoteWindow | null>(null);
  const confirmedRef = useRef<VoteChoice | null>(null);
  const loadRef = useRef<() => void>(() => undefined);
  const left = useRef(false);
  const openResultsRef = useRef(() => undefined);

  useEffect(() => {
    openResultsRef.current = () => {
      if (left.current) {
        return;
      }
      left.current = true;
      navigation.navigate('Results');
    };
  });

  useEffect(() => {
    confirmedRef.current = confirmed;
  }, [confirmed]);

  useEffect(() => {
    if (!session) {
      return;
    }
    const current = session;
    let alive = true;
    let windowTicket = 0;

    function rememberWindow(next: VoteWindow) {
      windowRef.current = next;
      setWindowState(next);
      if (next.status === 'finished') {
        openResultsRef.current();
      }
    }

    function loadWindow() {
      const ticket = windowTicket + 1;
      windowTicket = ticket;
      fetchVoteWindow(current.roomCode, current.token)
        .then((loaded) => {
          if (!alive || ticket !== windowTicket) {
            return;
          }
          rememberWindow(loaded);
        })
        .catch((error: unknown) => {
          if (alive && ticket === windowTicket) {
            setNotice(error instanceof Error ? error.message : networkMessage);
          }
        });
    }

    loadRef.current = loadWindow;

    return () => {
      alive = false;
      windowTicket += 1;
    };
  }, [session]);

  useRoomEvents(
    () => {
      loadRef.current();
    },
    (message) => {
      const update = applyVoteEvent(windowRef.current, message);
      if (update.window !== windowRef.current) {
        windowRef.current = update.window;
        setWindowState(update.window);
      }
      if (update.reveal || update.window?.status === 'finished') {
        openResultsRef.current();
      }
      if (update.reload) {
        loadRef.current();
      }
    },
  );

  async function submit() {
    if (!session) {
      return;
    }
    const sent = unknown ?? draftChoice();
    if (
      sent === null ||
      confirmedRef.current !== null ||
      windowRef.current?.status !== 'voting' ||
      windowRef.current.voteMark === 0 ||
      roundRejected
    ) {
      return;
    }
    await submitLock.current(async () => {
      setSending(true);
      setNotice(undefined);
      try {
        const saved = await castVote(session.roomCode, session.token, sent);
        const next = confirmBallot(confirmedRef.current, saved);
        confirmedRef.current = next;
        setConfirmed(next);
        setUnknown(null);
      } catch (error: unknown) {
        if (error instanceof RoomRequestError) {
          setNotice(error.message);
          if (error.code === 'invalid_round') {
            setRoundRejected(true);
          }
          return;
        }
        const doubted = doubtBallot(confirmedRef.current, sent);
        setUnknown(doubted);
        setNotice(error instanceof Error ? error.message : networkMessage);
      } finally {
        setSending(false);
      }
    });
  }

  function draftChoice(): VoteChoice | null {
    if (!session || gesture === null) {
      return null;
    }
    if (gesture === 'point') {
      const targets = pointTargets(
        room?.participants ?? [],
        session.name,
        selected,
      );
      if (targets.length === 0) {
        return null;
      }
      return { gesture, targets };
    }
    return { gesture, targets: [] };
  }

  const editable = canEdit(windowState, confirmed, unknown, roundRejected);
  const locked = controlsLocked(windowState, confirmed !== null, roundRejected);
  const others = pointTargets(
    room?.participants ?? [],
    session?.name ?? '',
    room?.participants ?? [],
  );
  const shown = confirmed ?? unknown;
  const shownNotice = notice ?? connectionNotice;

  return (
    <View style={screenStyles.container}>
      <Heading>Votación</Heading>
      <HelperText>{connectionLabel[connection]}</HelperText>
      {session ? null : (
        <Message tone="warning">
          Todavía no hay un invitado en esta sala.
        </Message>
      )}
      <HelperText>
        {windowState?.voteMark === null || windowState === null
          ? 'Sin marca'
          : `Marca ${windowState.voteMark}`}
      </HelperText>
      {shown ? (
        <HelperText>
          {confirmed
            ? `Confirmada: ${gestureLabel[shown.gesture]}`
            : `En duda: ${gestureLabel[shown.gesture]}`}
        </HelperText>
      ) : null}
      {shown && shown.targets.length > 0 ? (
        <HelperText>{shown.targets.join(', ')}</HelperText>
      ) : null}
      {others.map((name) => (
        <Text key={name} style={styles.participant}>
          {name}
        </Text>
      ))}
      {gesture === 'point'
        ? others.map((name) => (
            <Button
              key={`target-${name}`}
              label={
                selected.includes(name)
                  ? `Señalado ${name}`
                  : `Señalar a ${name}`
              }
              variant={selected.includes(name) ? 'primary' : 'secondary'}
              disabled={!editable}
              onPress={() => {
                setSelected((current) =>
                  current.includes(name)
                    ? current.filter((item) => item !== name)
                    : [...current, name],
                );
              }}
            />
          ))
        : null}
      <Button
        label="Señalar"
        variant={gesture === 'point' ? 'primary' : 'secondary'}
        disabled={!editable}
        onPress={() => setGesture('point')}
      />
      <Button
        label="Puño"
        variant={gesture === 'fist' ? 'primary' : 'secondary'}
        disabled={!editable}
        onPress={() => {
          setGesture('fist');
          setSelected([]);
        }}
      />
      <Button
        label="Arriesgar"
        variant={gesture === 'v' ? 'primary' : 'secondary'}
        disabled={!editable}
        onPress={() => {
          setGesture('v');
          setSelected([]);
        }}
      />
      <Button
        label={unknown ? 'Reintentar' : 'Enviar'}
        disabled={
          locked ||
          windowState?.status !== 'voting' ||
          sending ||
          (unknown === null && draftChoice() === null) ||
          confirmed !== null
        }
        loading={sending}
        onPress={() => {
          void submit();
        }}
      />
      {shownNotice ? <Message tone="error">{shownNotice}</Message> : null}
      {connection === 'error' ? (
        <Button label="Reintentar" onPress={retry} />
      ) : null}
      {locked && confirmed === null ? (
        <HelperText>La votación ya no admite cambios.</HelperText>
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
  participant: {
    ...theme.typography.body,
    color: theme.colors.text,
  },
});
