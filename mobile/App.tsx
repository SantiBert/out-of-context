import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { AppNavigator } from './src/navigation/AppNavigator';
import { GuestSessionProvider } from './src/app/GuestSessionProvider';
import { RoomConnectionProvider } from './src/app/RoomConnectionProvider';
import { useAppFonts } from './src/theme/fonts';

export default function App() {
  const fontsLoaded = useAppFonts();

  if (!fontsLoaded) {
    return null;
  }

  return (
    <SafeAreaProvider>
      <GuestSessionProvider>
        <RoomConnectionProvider>
          <AppNavigator />
        </RoomConnectionProvider>
      </GuestSessionProvider>
      <StatusBar style="dark" />
    </SafeAreaProvider>
  );
}
