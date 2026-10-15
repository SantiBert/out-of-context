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
  cleanRoomCode,
  emptyCodeMessage,
  joinRoom,
  networkMessage,
} from '../services/api/rooms';
import { createSingleFlight } from '../services/api/singleFlight';

export function JoinRoomScreen() {
  const navigation = useAppNavigation();
  const { saveSession } = useGuestSession();
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [nameError, setNameError] = useState<string | undefined>();
  const [codeError, setCodeError] = useState<string | undefined>();
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
    let cleanedName: string;
    let cleanedCode: string;
    try {
      cleanedName = cleanPlayerName(name);
      setNameError(undefined);
    } catch (error) {
      setNameError(
        error instanceof NameValidationError ? error.message : undefined,
      );
      cleanedName = '';
    }
    try {
      cleanedCode = cleanRoomCode(code);
      setCodeError(undefined);
    } catch (error) {
      setCodeError(
        error instanceof NameValidationError ? error.message : emptyCodeMessage,
      );
      cleanedCode = '';
    }
    if (!cleanedName || !cleanedCode) {
      return;
    }
    setLoading(true);
    try {
      const access = await joinRoom(cleanedCode, cleanedName);
      await saveSession({
        name: cleanedName,
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
      <Heading>Unirse</Heading>
      <TextField
        label="Nombre"
        value={name}
        onChangeText={setName}
        error={nameError}
        disabled={loading}
      />
      <TextField
        label="Código"
        value={code}
        onChangeText={setCode}
        error={codeError}
        disabled={loading}
        placeholder="ABC234"
      />
      {message ? <Message tone="error">{message}</Message> : null}
      <Button
        label="Unirse"
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
