import * as SecureStore from 'expo-secure-store';

import type { SessionStorage } from './guestSession';

export const secureSessionStorage: SessionStorage = {
  getItem: (key) => SecureStore.getItemAsync(key),
  setItem: (key, value) => SecureStore.setItemAsync(key, value),
};
