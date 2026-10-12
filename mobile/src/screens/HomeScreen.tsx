import { StatusBar } from 'expo-status-bar';
import { StyleSheet, Text, View } from 'react-native';

export const appTitle = 'Out Of Context';

export function HomeScreen() {
  return (
    <View style={styles.container}>
      <Text>{appTitle}</Text>
      <StatusBar style="auto" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
