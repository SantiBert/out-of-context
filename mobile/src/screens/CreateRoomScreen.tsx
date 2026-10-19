import { useRef, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useGuestSession } from '../app/GuestSessionProvider';
import { Button } from '../components/Button';
import { Heading } from '../components/Heading';
import { HomeButton } from '../components/HomeButton';
import { Message } from '../components/Message';
import { TextField } from '../components/TextField';
import { useAppNavigation } from '../hooks/useAppNavigation';
import {
  NameValidationError,
  cleanPlayerName,
  createRoom,
  networkMessage,
} from '../services/api/rooms';
import { createSingleFlight } from '../services/api/singleFlight';
import { theme } from '../theme/theme';

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
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
        >
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
          <HomeButton disabled={loading} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  flex: {
    flex: 1,
  },
  content: {
    flexGrow: 1,
    justifyContent: 'center',
    gap: theme.spacing.lg,
    padding: theme.spacing.xl,
  },
});
