import { describe, expect, it } from '@jest/globals';

import { PrivateDealFrame } from '../src/components/PrivateDealFrame';
import { localTableInstruction } from '../src/features/local/match/copy';
import {
  conversationPhaseLabel,
  openRecordLabel,
  tablePresentation,
  tableScreenTitle,
} from '../src/features/local/match/tablePresentation';
import type { LocalMatch } from '../src/features/local/rules/round';
import { openLocalRecording } from '../src/features/local/rules/vote';

function match(phase: LocalMatch['phase'] = 'conversation'): LocalMatch {
  return {
    version: 1,
    status: 'in_progress',
    phase,
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

describe('localTable UI OOC-020.9', () => {
  it('reutiliza PrivateDealFrame navy y copy de mesa', () => {
    expect(typeof PrivateDealFrame).toBe('function');
    expect(tableScreenTitle).toBe('Mesa');
    expect(conversationPhaseLabel).toBe('Conversación');
    expect(openRecordLabel).toBe('Abrir carga');
    expect(localTableInstruction).toContain('mesa');
    expect(localTableInstruction.toLowerCase()).not.toContain('temporizador');
    expect(localTableInstruction.toLowerCase()).not.toContain('timer');
  });

  it('presenta ronda y fase; Abrir carga solo en conversación', () => {
    expect(tablePresentation(match())).toEqual({
      roundHeading: 'Ronda 1',
      phaseLabel: 'Conversación',
      canOpenRecord: true,
    });
    expect(tablePresentation(match('recording')).canOpenRecord).toBe(false);
  });

  it('Abrir carga abre la fase de registro sin secretos', () => {
    const opened = openLocalRecording(match());
    expect(opened.ok).toBe(true);
    if (!opened.ok) {
      return;
    }
    expect(opened.match.phase).toBe('recording');
    const serialized = JSON.stringify(opened.match.rounds[0]?.drafts ?? []);
    expect(serialized).not.toMatch(/impostor|equipo|En la oficina/i);
  });
});
