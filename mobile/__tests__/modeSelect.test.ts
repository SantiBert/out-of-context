import { describe, expect, it } from '@jest/globals';

import { ModeSelectCard } from '../src/components/ModeSelectCard';
import { canStartLocal } from '../src/features/local/match/homeEntry';
import {
  modeSelectTitle,
  multiDeviceTitle,
  singleDeviceBusyHint,
  singleDeviceTitle,
} from '../src/features/local/match/modeSelectCopy';
import type { LocalMatch } from '../src/features/local/rules/round';
import { homePlayRoute } from '../src/screens/HomeScreen';

const sampleMatch: LocalMatch = {
  version: 1,
  status: 'preparing',
  phase: 'conversation',
  players: [
    { id: '1', name: 'Ana' },
    { id: '2', name: 'Luis' },
    { id: '3', name: 'Mia' },
    { id: '4', name: 'Tom' },
  ],
  piles: [],
  rounds: [],
};

describe('modeSelect OOC-020.5', () => {
  it('expone copy de selección de modo', () => {
    expect(modeSelectTitle).toBe('¿Cómo quieres jugar?');
    expect(singleDeviceTitle).toBe('Un dispositivo');
    expect(multiDeviceTitle).toBe('Multidispositivo');
    expect(singleDeviceBusyHint.length).toBeGreaterThan(10);
  });

  it('exporta ModeSelectCard', () => {
    expect(typeof ModeSelectCard).toBe('function');
  });

  it('deshabilita el modo local cuando hay partida en memoria', () => {
    expect(canStartLocal(sampleMatch, { status: 'absent' })).toBe(false);
    expect(canStartLocal(null, { status: 'absent' })).toBe(true);
  });

  it('Jugar desde Inicio abre ModeSelect', () => {
    expect(homePlayRoute).toBe('ModeSelect');
  });
});
