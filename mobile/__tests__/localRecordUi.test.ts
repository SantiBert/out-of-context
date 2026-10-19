import { describe, expect, it } from '@jest/globals';

import { GesturePicker } from '../src/components/GesturePicker';
import { localRecordEntry } from '../src/features/local/match/recordGate';
import {
  recordConfirmLabel,
  recordPhaseLabel,
  recordScreenTitle,
} from '../src/features/local/match/recordPresentation';
import type { LocalMatch } from '../src/features/local/rules/round';
import {
  confirmLocalVotes,
  localVoteSummary,
  missingLocalVoteMessage,
  saveLocalVote,
} from '../src/features/local/rules/vote';

function recordingMatch(): LocalMatch {
  return {
    version: 1,
    status: 'in_progress',
    phase: 'recording',
    players: [
      { id: '1', name: 'Ana' },
      { id: '2', name: 'Luis' },
      { id: '3', name: 'Mia' },
    ],
    piles: [{ number: 7, copies: [1, 2, 3, 4], text: 'En el hospital' }],
    rounds: [
      {
        number: 1,
        status: 'prepared',
        piles: [7],
        hands: [
          { playerId: '1', number: 7, copy: 1 },
          { playerId: '2', number: 7, copy: 2 },
          { playerId: '3', number: 7, copy: 3 },
        ],
        discard: [{ number: 7, copy: 4 }],
        drafts: [],
      },
    ],
  };
}

describe('localRecord UI OOC-020.9', () => {
  it('exporta GesturePicker y copy de carga', () => {
    expect(typeof GesturePicker).toBe('function');
    expect(recordScreenTitle).toBe('Carga');
    expect(recordPhaseLabel).toBe('Registro de gestos');
    expect(recordConfirmLabel).toBe('Confirmar');
  });

  it('la entrada empieza cubierta y Continuar abre la lista', () => {
    expect(localRecordEntry(false)).toBe('cover');
    expect(localRecordEntry(true)).toBe('list');
  });

  it('el resumen de votos no revela secreto de carta ni rol', () => {
    const base = recordingMatch();
    const withFist = saveLocalVote(base, 1, {
      playerId: '1',
      gesture: 'fist',
      targets: [],
    });
    expect(withFist.ok).toBe(true);
    if (!withFist.ok) {
      return;
    }
    const summary = localVoteSummary(withFist.match, 1);
    const serialized = JSON.stringify(summary);
    expect(serialized).not.toMatch(/impostor|equipo|hospital|copia/i);
    expect(summary[0]).toMatchObject({
      name: 'Ana',
      registered: true,
      action: 'Puño',
    });
    expect(summary.some((row) => !row.registered)).toBe(true);
  });

  it('bloquea confirmación incompleta en dominio', () => {
    const base = recordingMatch();
    const partial = saveLocalVote(base, 1, {
      playerId: '1',
      gesture: 'v',
      targets: [],
    });
    expect(partial.ok).toBe(true);
    if (!partial.ok) {
      return;
    }
    const confirmed = confirmLocalVotes(partial.match, 1);
    expect(confirmed.ok).toBe(false);
    if (confirmed.ok) {
      return;
    }
    expect(confirmed.message).toBe(missingLocalVoteMessage);
    expect(
      localVoteSummary(partial.match, 1).every((row) => row.registered),
    ).toBe(false);
  });

  it('permite corregir un gesto antes de confirmar', () => {
    const base = recordingMatch();
    const first = saveLocalVote(base, 1, {
      playerId: '2',
      gesture: 'fist',
      targets: [],
    });
    expect(first.ok).toBe(true);
    if (!first.ok) {
      return;
    }
    const corrected = saveLocalVote(first.match, 1, {
      playerId: '2',
      gesture: 'point',
      targets: ['1'],
    });
    expect(corrected.ok).toBe(true);
    if (!corrected.ok) {
      return;
    }
    expect(localVoteSummary(corrected.match, 1)[1]).toMatchObject({
      name: 'Luis',
      registered: true,
      action: 'Señaló a Ana.',
    });
  });
});
