import { describe, expect, it } from '@jest/globals';

import { PrivateDealFrame } from '../src/components/PrivateDealFrame';
import { SituationCard } from '../src/components/SituationCard';
import {
  localCompleteCardInstruction,
  localHideCardLabel,
  localTurnLabel,
} from '../src/features/local/match/copy';
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
    status: 'in_progress',
    phase: 'viewing',
    players: [
      { id: '1', name: 'Ana' },
      { id: '2', name: 'Luis' },
    ],
    piles: [{ number: 4, copies: [1, 2, 3], text: 'En la oficina' }],
    rounds: [
      {
        number: 1,
        status: 'prepared',
        piles: [4],
        hands: [
          { playerId: '1', number: 4, copy: 1 },
          { playerId: '2', number: 4, copy: 2 },
        ],
        discard: [{ number: 4, copy: 3 }],
      },
    ],
  };
}

describe('localCard UI OOC-020.8', () => {
  it('exporta frame navy y SituationCard', () => {
    expect(typeof PrivateDealFrame).toBe('function');
    expect(typeof SituationCard).toBe('function');
  });

  it('cubre el flujo turno → ver → ocultar → completo sin roles', () => {
    const doc = match();
    let pass = startLocalPass();
    expect(localCardView(doc, pass)).toEqual({
      kind: 'covered',
      playerName: 'Ana',
    });
    expect(localTurnLabel('Ana')).toContain('Ana');

    pass = revealLocalCard(pass);
    const visible = localCardView(doc, pass);
    expect(visible.kind).toBe('visible');
    if (visible.kind !== 'visible') {
      return;
    }
    expect(visible.number).toBe(4);
    expect(JSON.stringify(visible)).not.toContain('impostor');
    expect(JSON.stringify(visible)).not.toContain('equipo');

    pass = coverLocalCard(pass);
    expect(localCardView(doc, pass).kind).toBe('covered');

    pass = revealLocalCard(pass);
    pass = hideLocalCard(pass, 2);
    expect(localCardView(doc, pass)).toEqual({
      kind: 'covered',
      playerName: 'Luis',
    });

    pass = revealLocalCard(pass);
    pass = hideLocalCard(pass, 2);
    expect(localCardView(doc, pass)).toEqual({ kind: 'complete' });
    expect(localCompleteCardInstruction.length).toBeGreaterThan(0);
    expect(localHideCardLabel).toBe('Ocultar');
  });

  it('al reanudar la pasada vuelve cubierta', () => {
    const resumed = resumedLocalPass();
    expect(localCardView(match(), resumed)).toEqual({
      kind: 'covered',
      playerName: 'Ana',
    });
  });
});
