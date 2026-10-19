import { describe, expect, it } from '@jest/globals';

import {
  canContinueLocal,
  canStartLocal,
  continueLocalRoute,
} from '../src/features/local/match/homeEntry';
import type { LocalRecovery } from '../src/features/local/match/resume';
import type { LocalMatch } from '../src/features/local/rules/round';

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

describe('homeEntry OOC-020.4', () => {
  it('permite empezar cuando no hay match y recovery está ausente', () => {
    const recovery: LocalRecovery = { status: 'absent' };
    expect(canStartLocal(null, recovery)).toBe(true);
    expect(canContinueLocal(null, recovery)).toBe(false);
    expect(continueLocalRoute(null, recovery)).toBeNull();
  });

  it('permite continuar cuando hay match recuperable', () => {
    const recovery: LocalRecovery = { status: 'ready', route: 'LocalTable' };
    expect(canStartLocal(sampleMatch, recovery)).toBe(false);
    expect(canContinueLocal(sampleMatch, recovery)).toBe(true);
    expect(continueLocalRoute(sampleMatch, recovery)).toBe('LocalTable');
  });

  it('bloquea empezar y continuar si recovery es unavailable', () => {
    const recovery: LocalRecovery = { status: 'unavailable' };
    expect(canStartLocal(null, recovery)).toBe(false);
    expect(canContinueLocal(sampleMatch, recovery)).toBe(false);
    expect(continueLocalRoute(sampleMatch, recovery)).toBeNull();
  });

  it('no ofrece empezar si aún hay documento en memoria', () => {
    expect(canStartLocal(sampleMatch, { status: 'absent' })).toBe(false);
    expect(canContinueLocal(sampleMatch, { status: 'absent' })).toBe(true);
    expect(continueLocalRoute(sampleMatch, { status: 'absent' })).toBe(
      'LocalTable',
    );
  });

  it('espera recovery null como no disponible para empezar', () => {
    expect(canStartLocal(null, null)).toBe(false);
    expect(canContinueLocal(null, null)).toBe(false);
  });
});
