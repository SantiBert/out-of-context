import { useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { useGuestSession } from '../app/GuestSessionProvider';
import { useRoomConnection } from '../app/RoomConnectionProvider';
import { Button } from '../components/Button';
import { HomeButton } from '../components/HomeButton';
import { Heading } from '../components/Heading';
import { HelperText } from '../components/HelperText';
import { Message } from '../components/Message';
import { screenStyles } from '../components/screenStyles';
import { useAppNavigation } from '../hooks/useAppNavigation';
import { networkMessage, startRoom } from '../services/api/rooms';
import { createSingleFlight } from '../services/api/singleFlight';
import { connectionLabel, mayStart } from '../services/realtime/lobby';
import { theme } from '../theme/theme';

export function LobbyScreen() {
  const navigation = useAppNavigation();
  const { session } = useGuestSession();
  const {
    connection,
    notice: connectionNotice,
    room,
    retry,
  } = useRoomConnection();
  const [notice, setNotice] = useState<string | undefined>();
  const [starting, setStarting] = useState(false);
  const submitLock = useRef(createSingleFlight());
  const left = useRef(false);
  const openCardRef = useRef(() => undefined);

  useEffect(() => {
    openCardRef.current = () => {
      if (left.current) {
        return;
      }
      left.current = true;
      navigation.navigate('SecretCard');
    };
  });

  useEffect(() => {
    if (room?.status === 'started') {
      openCardRef.current();
    }
  }, [room]);

  async function start() {
    if (!session || !room || !mayStart(session.name, room)) {
      return;
    }
    await submitLock.current(async () => {
      setNotice(undefined);
      setStarting(true);
      try {
        const started = await startRoom(session.roomCode, session.token);
        if (started.status === 'started') {
          openCardRef.current();
        }
      } catch (error) {
        setNotice(error instanceof Error ? error.message : networkMessage);
      } finally {
        setStarting(false);
      }
    });
  }

  const shownNotice = notice ?? connectionNotice;

  return (
    <View style={screenStyles.container}>
      <Heading>Lobby</Heading>
      <HelperText>{connectionLabel[connection]}</HelperText>
      {session ? (
        <HelperText>{`Código ${session.roomCode}`}</HelperText>
      ) : (
        <Message tone="warning">
          Todavía no hay un invitado en esta sala.
        </Message>
      )}
      {room ? (
        <>
          <HelperText>{`Anfitrión ${room.host}`}</HelperText>
          {room.participants.map((name) => (
            <Text key={name} style={styles.participant}>
              {name}
            </Text>
          ))}
        </>
      ) : null}
      {shownNotice ? <Message tone="error">{shownNotice}</Message> : null}
      {connection === 'error' || (connectionNotice && !notice) ? (
        <Button label="Reintentar" onPress={retry} />
      ) : null}
      {session && room && session.name === room.host ? (
        <Button
          label="Iniciar"
          disabled={!mayStart(session.name, room)}
          loading={starting}
          onPress={() => {
            void start();
          }}
        />
      ) : null}
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
