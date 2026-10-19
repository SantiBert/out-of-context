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
      'ModeSelect',
      'OnlineEntry',
      'CreateRoom',
      'JoinRoom',
      'Lobby',
      'SecretCard',
      'Conversation',
      'Voting',
      'Results',
      'Scoreboard',
      'Catalog',
      'LocalSetup',
      'LocalMatchConfig',
      'LocalCard',
      'LocalTable',
      'LocalRecord',
      'LocalResults',
    ]);
  });

  it('acepta ModeSelect, OnlineEntry y LocalMatchConfig', () => {
    expect(isAppRoute('ModeSelect')).toBe(true);
    expect(isAppRoute('OnlineEntry')).toBe(true);
    expect(isAppRoute('LocalMatchConfig')).toBe(true);
    expect(shouldResetToHome({ routes: [{ name: 'ModeSelect' }] })).toBe(
      false,
    );
    expect(shouldResetToHome({ routes: [{ name: 'OnlineEntry' }] })).toBe(
      false,
    );
    expect(
      shouldResetToHome({ routes: [{ name: 'LocalMatchConfig' }] }),
    ).toBe(false);
  });

  it('rechaza un nombre desconocido', () => {
    expect(isAppRoute('Home')).toBe(true);
    expect(isAppRoute('Score')).toBe(false);
    expect(shouldResetToHome({ routes: [{ name: 'Score' }] })).toBe(true);
    expect(shouldResetToHome({ routes: [{ name: 'Lobby' }] })).toBe(false);
    expect(shouldResetToHome({ routes: [{ name: 'LocalSetup' }] })).toBe(false);
    expect(shouldResetToHome({ routes: [{ name: 'LocalCard' }] })).toBe(false);
    expect(shouldResetToHome({ routes: [{ name: 'LocalTable' }] })).toBe(false);
    expect(shouldResetToHome({ routes: [{ name: 'LocalRecord' }] })).toBe(
      false,
    );
    expect(shouldResetToHome({ routes: [{ name: 'LocalResults' }] })).toBe(
      false,
    );
    expect(shouldResetToHome({ routes: [] })).toBe(true);
  });
});
