import {
  NavigationContainer,
  createNavigationContainerRef,
} from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import { recoverActiveMatch } from '../features/local/match/resume';
import { CatalogScreen } from '../screens/CatalogScreen';
import { ConversationScreen } from '../screens/ConversationScreen';
import { CreateRoomScreen } from '../screens/CreateRoomScreen';
import { HomeScreen } from '../screens/HomeScreen';
import { JoinRoomScreen } from '../screens/JoinRoomScreen';
import { LocalCardScreen } from '../screens/LocalCardScreen';
import { LocalRecordScreen } from '../screens/LocalRecordScreen';
import { LocalResultsScreen } from '../screens/LocalResultsScreen';
import { LocalSetupScreen } from '../screens/LocalSetupScreen';
import { LocalTableScreen } from '../screens/LocalTableScreen';
import { LobbyScreen } from '../screens/LobbyScreen';
import { ResultsScreen } from '../screens/ResultsScreen';
import { ScoreboardScreen } from '../screens/ScoreboardScreen';
import { SecretCardScreen } from '../screens/SecretCardScreen';
import { VotingScreen } from '../screens/VotingScreen';
import {
  homeRoute,
  shouldResetToHome,
  type RootStackParamList,
} from './routes';

const Stack = createNativeStackNavigator<RootStackParamList>();

export const navigationRef = createNavigationContainerRef<RootStackParamList>();

function showHome() {
  if (!navigationRef.isReady()) {
    return;
  }
  navigationRef.reset({ index: 0, routes: [{ name: homeRoute }] });
}

export function AppNavigator() {
  return (
    <NavigationContainer
      ref={navigationRef}
      onReady={() => {
        void recoverActiveMatch().then((recovery) => {
          if (recovery.status !== 'ready' || !navigationRef.isReady()) {
            return;
          }
          navigationRef.reset({
            index: 0,
            routes: [{ name: recovery.route }],
          });
        });
      }}
      onUnhandledAction={(action) => {
        if (action.type.length > 0) {
          showHome();
        }
      }}
      onStateChange={(state) => {
        if (state && shouldResetToHome(state)) {
          showHome();
        }
      }}
    >
      <Stack.Navigator initialRouteName={homeRoute}>
        <Stack.Screen
          name="Home"
          component={HomeScreen}
          options={{ title: 'Inicio' }}
        />
        <Stack.Screen
          name="CreateRoom"
          component={CreateRoomScreen}
          options={{ title: 'Crear sala' }}
        />
        <Stack.Screen
          name="JoinRoom"
          component={JoinRoomScreen}
          options={{ title: 'Unirse' }}
        />
        <Stack.Screen
          name="Lobby"
          component={LobbyScreen}
          options={{ title: 'Lobby' }}
        />
        <Stack.Screen
          name="SecretCard"
          component={SecretCardScreen}
          options={{ title: 'Carta secreta' }}
        />
        <Stack.Screen
          name="Conversation"
          component={ConversationScreen}
          options={{ title: 'Conversación' }}
        />
        <Stack.Screen
          name="Voting"
          component={VotingScreen}
          options={{ title: 'Votación' }}
        />
        <Stack.Screen
          name="Results"
          component={ResultsScreen}
          options={{ title: 'Resultados' }}
        />
        <Stack.Screen
          name="Scoreboard"
          component={ScoreboardScreen}
          options={{ title: 'Marcador' }}
        />
        <Stack.Screen
          name="Catalog"
          component={CatalogScreen}
          options={{ title: 'Componentes' }}
        />
        <Stack.Screen
          name="LocalSetup"
          component={LocalSetupScreen}
          options={{ title: 'Nombres' }}
        />
        <Stack.Screen
          name="LocalCard"
          component={LocalCardScreen}
          options={{ title: 'Carta' }}
        />
        <Stack.Screen
          name="LocalTable"
          component={LocalTableScreen}
          options={{ title: 'Mesa' }}
        />
        <Stack.Screen
          name="LocalRecord"
          component={LocalRecordScreen}
          options={{ title: 'Carga' }}
        />
        <Stack.Screen
          name="LocalResults"
          component={LocalResultsScreen}
          options={{ title: 'Resultados' }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
