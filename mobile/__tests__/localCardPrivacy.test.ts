import { describe, expect, it } from '@jest/globals';

import { localRecordEntry } from '../src/features/local/match/recordGate';
import {
  coverLocalCard,
  hideLocalCard,
  localCardView,
  revealLocalCard,
  resumedLocalPass,
  startLocalPass,
} from '../src/features/local/match/viewing';
import type { LocalMatch } from '../src/features/local/rules/round';

function match(): LocalMatch {
  return {
    version: 1,
    status: 'preparing',
    phase: 'viewing',
    players: [
      { id: '1', name: 'Ana' },
      { id: '2', name: 'Luis' },
    ],
    piles: [
      { number: 1, copies: [1, 2, 3], text: 'Lenguaje' },
      { number: 2, copies: [1, 2, 3], text: 'Dieta' },
    ],
    rounds: [
      {
        number: 1,
        status: 'conversation',
        piles: [1, 2],
        hands: [
          { playerId: '1', number: 1, copy: 1 },
          { playerId: '2', number: 2, copy: 2 },
        ],
        discard: [],
      },
    ],
  };
}

describe('privacidad del reparto y cubierta de la carga', () => {
  it('cubrir oculta la carta sin pasar al siguiente jugador', () => {
    const visible = revealLocalCard(startLocalPass());
    expect(localCardView(match(), visible).kind).toBe('visible');
    const covered = coverLocalCard(visible);
    expect(covered).toEqual({ index: 0, visible: false, done: false });
    expect(localCardView(match(), covered)).toEqual({
      kind: 'covered',
      playerName: 'Ana',
    });
    expect(JSON.stringify(localCardView(match(), covered))).not.toContain(
      'Lenguaje',
    );
  });

  it('cubrir una carta ya oculta no cambia el pase', () => {
    const pass = startLocalPass();
    expect(coverLocalCard(pass)).toBe(pass);
  });

  it('ocultar sigue avanzando al siguiente tras cubrir', () => {
    const covered = coverLocalCard(revealLocalCard(startLocalPass()));
    const revealedAgain = revealLocalCard(covered);
    const next = hideLocalCard(revealedAgain, 2);
    expect(localCardView(match(), next)).toEqual({
      kind: 'covered',
      playerName: 'Luis',
    });
    expect(JSON.stringify(localCardView(match(), next))).not.toContain(
      'Lenguaje',
    );
  });

  it('reanudar la pasada vuelve a empezar cubierta', () => {
    const mid = hideLocalCard(revealLocalCard(startLocalPass()), 2);
    const resumed = resumedLocalPass(revealLocalCard(mid));
    expect(resumed).toEqual({ index: 0, visible: false, done: false });
    expect(localCardView(match(), resumed)).toEqual({
      kind: 'covered',
      playerName: 'Ana',
    });
  });

  it('la carga empieza cubierta y Continuar abre la lista', () => {
    expect(localRecordEntry(false)).toBe('cover');
    expect(localRecordEntry(true)).toBe('list');
  });
});
