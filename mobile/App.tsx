import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { AppNavigator } from './src/navigation/AppNavigator';
import { GuestSessionProvider } from './src/app/GuestSessionProvider';
import { RoomConnectionProvider } from './src/app/RoomConnectionProvider';

export default function App() {
  return (
    <SafeAreaProvider>
      <GuestSessionProvider>
        <RoomConnectionProvider>
          <AppNavigator />
        </RoomConnectionProvider>
      </GuestSessionProvider>
      <StatusBar style="auto" />
    </SafeAreaProvider>
  );
}
