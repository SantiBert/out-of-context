import { describe, expect, it } from '@jest/globals';

import {
  advanceLocalPass,
  closeLocalDeal,
  coverLocalCard,
  hideLocalCard,
  localCardView,
  pendingLocalViewersMessage,
  revealLocalCard,
  startLocalPass,
} from '../src/features/local/match/viewing';
import {
  createLocalPiles,
  type LocalMatch,
} from '../src/features/local/rules/round';

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
      { number: 9, copies: [1], text: 'Sobra' },
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
        discard: [{ number: 9, copy: 1 }],
      },
    ],
  };
}

describe('pasada de la carta presencial', () => {
  it('empieza oculta, con el nombre y sin carta', () => {
    const pass = startLocalPass();
    expect(pass.visible).toBe(false);
    expect(localCardView(match(), pass)).toEqual({
      kind: 'covered',
      playerName: 'Ana',
    });
  });

  it('revela solo el número y el texto de quien mira', () => {
    const view = localCardView(match(), revealLocalCard(startLocalPass()));
    expect(view).toEqual({
      kind: 'visible',
      playerName: 'Ana',
      number: 1,
      text: 'Lenguaje',
    });
    expect(JSON.stringify(view)).not.toContain('Dieta');
    expect(JSON.stringify(view)).not.toContain('Sobra');
  });

  it('no avanza mientras la carta sigue visible', () => {
    const visible = revealLocalCard(startLocalPass());
    expect(advanceLocalPass(visible)).toBe(visible);
    expect(localCardView(match(), advanceLocalPass(visible))).toEqual({
      kind: 'visible',
      playerName: 'Ana',
      number: 1,
      text: 'Lenguaje',
    });
  });

  it('al ocultar pasa al siguiente sin la carta anterior', () => {
    const hidden = hideLocalCard(revealLocalCard(startLocalPass()), 2);
    const view = localCardView(match(), hidden);
    expect(view).toEqual({ kind: 'covered', playerName: 'Luis' });
    expect(JSON.stringify(view)).not.toContain('Lenguaje');
    expect(JSON.stringify(view)).not.toContain('1');
  });

  it('al ir a segundo plano se cubre sin avanzar el turno', () => {
    const visible = revealLocalCard(startLocalPass());
    const covered = coverLocalCard(visible);
    expect(covered.index).toBe(0);
    expect(covered.visible).toBe(false);
    expect(localCardView(match(), covered)).toEqual({
      kind: 'covered',
      playerName: 'Ana',
    });
  });

  it('el último jugador no deja una carta en la vista', () => {
    const second = hideLocalCard(revealLocalCard(startLocalPass()), 2);
    const done = hideLocalCard(revealLocalCard(second), 2);
    expect(localCardView(match(), done)).toEqual({ kind: 'complete' });
  });

  it('una pasada nueva no nace visible', () => {
    const visible = revealLocalCard(startLocalPass());
    expect(visible.visible).toBe(true);
    expect(startLocalPass().visible).toBe(false);
    expect(localCardView(match(), startLocalPass()).kind).toBe('covered');
  });

  it('guarda el texto de la situación cuando viene con la pila', () => {
    const base: LocalMatch = {
      version: 1,
      status: 'preparing',
      phase: 'setup',
      players: [
        { id: '1', name: 'Ana' },
        { id: '2', name: 'Luis' },
        { id: '3', name: 'Nora' },
        { id: '4', name: 'Otto' },
      ],
      piles: [],
      rounds: [],
    };
    const created = createLocalPiles(
      base,
      Array.from({ length: 15 }, (_, index) => ({
        number: index + 1,
        copies: [1, 2, 3],
        ...(index === 0 ? { text: 'Lenguaje' } : {}),
      })),
    );
    expect(created.ok).toBe(true);
    if (!created.ok) {
      return;
    }
    expect(created.match.piles[0]).toEqual({
      number: 1,
      copies: [1, 2, 3],
      text: 'Lenguaje',
    });
    expect(created.match.piles[1]).toEqual({
      number: 2,
      copies: [1, 2, 3],
    });
  });

  it('cierra el reparto cuando todos miraron y no reparte otra vez', () => {
    const current = match();
    const done = hideLocalCard(
      revealLocalCard(hideLocalCard(revealLocalCard(startLocalPass()), 2)),
      2,
    );
    expect(localCardView(current, done)).toEqual({ kind: 'complete' });
    const closed = closeLocalDeal(current, done);
    expect(closed.ok).toBe(true);
    if (!closed.ok) {
      return;
    }
    expect(closed.match.phase).toBe('conversation');
    expect(closed.match.rounds).toBe(current.rounds);
    const again = closeLocalDeal(closed.match, done);
    expect(again).toEqual({ ok: true, match: closed.match });
    expect(again.match.rounds).toHaveLength(1);
  });

  it('no cierra el reparto si falta alguien', () => {
    const current = match();
    const pending = revealLocalCard(startLocalPass());
    expect(closeLocalDeal(current, pending)).toEqual({
      ok: false,
      match: current,
      message: pendingLocalViewersMessage,
    });
    expect(closeLocalDeal(current, startLocalPass()).match.phase).toBe(
      'viewing',
    );
  });
});
