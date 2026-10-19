import { useEffect, useState } from 'react';
import { View } from 'react-native';

import { Button } from '../components/Button';
import { Heading } from '../components/Heading';
import { HelperText } from '../components/HelperText';
import { Message } from '../components/Message';
import { screenStyles } from '../components/screenStyles';
import {
  localEntryRoute,
  localMatchResumeError,
  recoverActiveMatch,
  type LocalRecovery,
} from '../features/local/match/resume';
import { readLocalMatch } from '../features/local/match/viewing';
import { useAppNavigation } from '../hooks/useAppNavigation';

export const appTitle = 'Out Of Context';

export function HomeScreen() {
  const navigation = useAppNavigation();
  const [recovery, setRecovery] = useState<LocalRecovery | null>(null);

  useEffect(() => {
    let active = true;
    void recoverActiveMatch().then((next) => {
      if (active) {
        setRecovery(next);
      }
    });
    return () => {
      active = false;
    };
  }, []);

  return (
    <View style={screenStyles.container}>
      <Heading>Inicio</Heading>
      <HelperText>{appTitle}</HelperText>
      <Button
        label="Crear sala"
        onPress={() => navigation.navigate('CreateRoom')}
      />
      <Button
        label="Unirse"
        variant="secondary"
        onPress={() => navigation.navigate('JoinRoom')}
      />
      <Button
        label="Partida presencial"
        variant="secondary"
        disabled={localEntryRoute(readLocalMatch(), recovery) === null}
        onPress={() => {
          const held = readLocalMatch();
          const route = localEntryRoute(held, recovery);
          if (route === null) {
            return;
          }
          if (held === null) {
            navigation.navigate('LocalSetup');
            return;
          }
          navigation.reset({ index: 0, routes: [{ name: route }] });
        }}
      />
      {recovery?.status === 'unavailable' ? (
        <Message tone="error">{localMatchResumeError}</Message>
      ) : null}
      <Button
        label="Componentes"
        variant="secondary"
        onPress={() => navigation.navigate('Catalog')}
      />
    </View>
  );
}
