import { View } from 'react-native';

import { Button } from '../components/Button';
import { Heading } from '../components/Heading';
import { HelperText } from '../components/HelperText';
import { screenStyles } from '../components/screenStyles';
import { useAppNavigation } from '../hooks/useAppNavigation';

export const appTitle = 'Out Of Context';

export function HomeScreen() {
  const navigation = useAppNavigation();

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
        label="Componentes"
        variant="secondary"
        onPress={() => navigation.navigate('Catalog')}
      />
    </View>
  );
}
