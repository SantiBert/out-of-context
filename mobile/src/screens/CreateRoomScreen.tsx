import { useRef, useState } from 'react';
import { View } from 'react-native';

import { useGuestSession } from '../app/GuestSessionProvider';
import { Button } from '../components/Button';
import { Heading } from '../components/Heading';
import { Message } from '../components/Message';
import { screenStyles } from '../components/screenStyles';
import { TextField } from '../components/TextField';
import { useAppNavigation } from '../hooks/useAppNavigation';
import { homeRoute } from '../navigation/routes';
import {
  NameValidationError,
  cleanPlayerName,
  createRoom,
  networkMessage,
} from '../services/api/rooms';
import { createSingleFlight } from '../services/api/singleFlight';

export function CreateRoomScreen() {
  const navigation = useAppNavigation();
  const { saveSession } = useGuestSession();
  const [name, setName] = useState('');
  const [nameError, setNameError] = useState<string | undefined>();
  const [message, setMessage] = useState<string | undefined>();
  const [loading, setLoading] = useState(false);
  const submitLock = useRef(createSingleFlight());

  async function submit() {
    await submitLock.current(async () => {
      await send();
    });
  }

  async function send() {
    setMessage(undefined);
    let cleaned: string;
    try {
      cleaned = cleanPlayerName(name);
    } catch (error) {
      setNameError(
        error instanceof NameValidationError ? error.message : undefined,
      );
      return;
    }
    setNameError(undefined);
    setLoading(true);
    try {
      const access = await createRoom(cleaned);
      await saveSession({
        name: cleaned,
        roomCode: access.code,
        token: access.token,
      });
      navigation.navigate('Lobby');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : networkMessage);
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={screenStyles.container}>
      <Heading>Crear sala</Heading>
      <TextField
        label="Nombre"
        value={name}
        onChangeText={setName}
        error={nameError}
        disabled={loading}
      />
      {message ? <Message tone="error">{message}</Message> : null}
      <Button
        label="Crear sala"
        loading={loading}
        onPress={() => {
          void submit();
        }}
      />
      <Button
        label="Inicio"
        variant="secondary"
        accessibilityLabel="Volver al inicio"
        disabled={loading}
        onPress={() =>
          navigation.reset({ index: 0, routes: [{ name: homeRoute }] })
        }
      />
    </View>
  );
}
