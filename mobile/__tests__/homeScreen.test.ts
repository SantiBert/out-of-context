import { describe, expect, it } from '@jest/globals';

import {
  appTitle,
  homeCatalogLabel,
  homeContinueLabel,
  homeCreateRoomLabel,
  homeHowToPlayLabel,
  homeJoinRoomLabel,
  homePlayLabel,
  homePlayRoute,
} from '../src/screens/HomeScreen';
import {
  howToPlayBullets,
  howToPlayTitle,
} from '../src/features/local/match/homeCopy';

describe('HomeScreen copy OOC-020.4', () => {
  it('expone el título de la aplicación', () => {
    expect(appTitle).toBe('Out Of Context');
  });

  it('declara CTAs de presencial, online y catálogo', () => {
    expect(homePlayLabel).toBe('Jugar');
    expect(homePlayRoute).toBe('ModeSelect');
    expect(homeContinueLabel).toBe('Continuar partida');
    expect(homeHowToPlayLabel).toBe('Cómo se juega');
    expect(homeCreateRoomLabel).toBe('Crear sala');
    expect(homeJoinRoomLabel).toBe('Unirse');
    expect(homeCatalogLabel).toBe('Componentes');
  });

  it('incluye resumen de reglas para el modal', () => {
    expect(howToPlayTitle).toBe('Cómo se juega');
    expect(howToPlayBullets.length).toBeGreaterThanOrEqual(4);
    expect(howToPlayBullets.some((line) => line.includes('impostor'))).toBe(
      true,
    );
  });
});
