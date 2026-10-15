import { describe, expect, it } from '@jest/globals';

import {
  appRoutes,
  isAppRoute,
  shouldResetToHome,
} from '../src/navigation/routes';

describe('rutas de la aplicación', () => {
  it('incluye el recorrido inicial', () => {
    expect(appRoutes).toEqual([
      'Home',
      'CreateRoom',
      'JoinRoom',
      'Lobby',
      'SecretCard',
      'Conversation',
      'Voting',
      'Results',
      'Scoreboard',
      'Catalog',
    ]);
  });

  it('rechaza un nombre desconocido', () => {
    expect(isAppRoute('Home')).toBe(true);
    expect(isAppRoute('Score')).toBe(false);
    expect(shouldResetToHome({ routes: [{ name: 'Score' }] })).toBe(true);
    expect(shouldResetToHome({ routes: [{ name: 'Lobby' }] })).toBe(false);
    expect(shouldResetToHome({ routes: [] })).toBe(true);
  });
});
