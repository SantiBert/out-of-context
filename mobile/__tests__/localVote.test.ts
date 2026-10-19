import { describe, expect, it } from '@jest/globals';

import type { LocalMatch } from '../src/features/local/rules/round';
import {
  closeLocalVote,
  confirmLocalVotes,
  emptyLocalPointMessage,
  gesturedLocalTargetMessage,
  localVoteForm,
  localVoteRoster,
  localVoteSummary,
  missingLocalVoteMessage,
  outsideLocalTargetMessage,
  outsideLocalVotePlayerMessage,
  repeatedLocalTargetMessage,
  reviewLocalVote,
  saveLocalVote,
  selfLocalTargetMessage,
  voteAlreadyClosedMessage,
} from '../src/features/local/rules/vote';

function match(): LocalMatch {
  return {
    version: 1,
    status: 'preparing',
    phase: 'recording',
    players: [
      { id: '1', name: 'Ana' },
      { id: '2', name: 'Luis' },
      { id: '3', name: 'Nora' },
    ],
    piles: [{ number: 1, copies: [1, 2, 3], text: 'Lenguaje' }],
    rounds: [
      {
        number: 1,
        status: 'conversation',
        piles: [1],
        hands: [
          { playerId: '1', number: 1, copy: 1 },
          { playerId: '2', number: 1, copy: 2 },
          { playerId: '3', number: 1, copy: 3 },
        ],
        discard: [],
        drafts: [],
      },
      {
        number: 2,
        status: 'finished',
        piles: [2],
        hands: [],
        discard: [],
        drafts: [],
      },
    ],
  };
}

describe('carga de la votación presencial', () => {
  it('lista a los jugadores sin registro y sin cartas', () => {
    expect(localVoteRoster(match(), 1)).toEqual([
      { playerId: '1', name: 'Ana', registered: false },
      { playerId: '2', name: 'Luis', registered: false },
      { playerId: '3', name: 'Nora', registered: false },
    ]);
    const form = localVoteForm(match(), 1, '1');
    expect(form).toEqual({
      playerName: 'Ana',
      others: [
        { id: '2', name: 'Luis' },
        { id: '3', name: 'Nora' },
      ],
      draft: null,
    });
    expect(JSON.stringify(form)).not.toContain('Lenguaje');
  });

  it('guarda señalar, puño y V en la misma ronda', () => {
    const pointed = saveLocalVote(match(), 1, {
      playerId: '1',
      gesture: 'point',
      targets: ['2', '3'],
    });
    expect(pointed.ok).toBe(true);
    if (!pointed.ok) {
      return;
    }
    expect(pointed.match.rounds[0].drafts).toEqual([
      { playerId: '1', gesture: 'point', targets: ['2', '3'] },
    ]);
    expect(pointed.match.rounds[1].drafts).toEqual([]);
    expect(reviewLocalVote(pointed.match, 1, '1')).toEqual({
      registered: true,
      name: 'Ana',
      gesture: 'point',
      targetNames: ['Luis', 'Nora'],
    });

    const fist = saveLocalVote(pointed.match, 1, {
      playerId: '2',
      gesture: 'fist',
      targets: [],
    });
    expect(fist.ok).toBe(true);
    if (!fist.ok) {
      return;
    }
    const risk = saveLocalVote(fist.match, 1, {
      playerId: '3',
      gesture: 'v',
      targets: [],
    });
    expect(risk.ok).toBe(true);
    if (!risk.ok) {
      return;
    }
    expect(localVoteRoster(risk.match, 1).every((row) => row.registered)).toBe(
      true,
    );
    expect(reviewLocalVote(risk.match, 1, '2')).toEqual({
      registered: true,
      name: 'Luis',
      gesture: 'fist',
      targetNames: [],
    });
    expect(reviewLocalVote(risk.match, 1, '3')?.registered).toBe(true);
  });

  it('reemplaza el borrador del mismo jugador', () => {
    const first = saveLocalVote(match(), 1, {
      playerId: '1',
      gesture: 'point',
      targets: ['2'],
    });
    expect(first.ok).toBe(true);
    if (!first.ok) {
      return;
    }
    const second = saveLocalVote(first.match, 1, {
      playerId: '1',
      gesture: 'fist',
      targets: [],
    });
    expect(second.ok).toBe(true);
    if (!second.ok) {
      return;
    }
    expect(second.match.rounds[0].drafts).toEqual([
      { playerId: '1', gesture: 'fist', targets: [] },
    ]);
  });

  it('un voto inválido no cambia el documento', () => {
    const current = match();
    expect(
      saveLocalVote(current, 1, {
        playerId: '1',
        gesture: 'point',
        targets: ['1'],
      }),
    ).toEqual({ ok: false, match: current, message: selfLocalTargetMessage });
    expect(
      saveLocalVote(current, 1, {
        playerId: '1',
        gesture: 'point',
        targets: ['2', '2'],
      }),
    ).toEqual({
      ok: false,
      match: current,
      message: repeatedLocalTargetMessage,
    });
    expect(
      saveLocalVote(current, 1, {
        playerId: '1',
        gesture: 'fist',
        targets: ['2'],
      }),
    ).toEqual({
      ok: false,
      match: current,
      message: gesturedLocalTargetMessage,
    });
    expect(
      saveLocalVote(current, 1, {
        playerId: '1',
        gesture: 'point',
        targets: [],
      }),
    ).toEqual({ ok: false, match: current, message: emptyLocalPointMessage });
    expect(
      saveLocalVote(current, 1, {
        playerId: '9',
        gesture: 'v',
        targets: [],
      }),
    ).toEqual({
      ok: false,
      match: current,
      message: outsideLocalVotePlayerMessage,
    });
    expect(current.rounds[0].drafts).toEqual([]);
  });

  it('guarda varios señalados del votante y oculta el borrador ajeno', () => {
    const table: LocalMatch = {
      ...match(),
      players: [
        { id: '1', name: 'Ana' },
        { id: '2', name: 'Luis' },
        { id: '3', name: 'Nora' },
        { id: '4', name: 'Iván' },
      ],
    };
    const other = saveLocalVote(table, 1, {
      playerId: '2',
      gesture: 'point',
      targets: ['4'],
    });
    expect(other.ok).toBe(true);
    if (!other.ok) {
      return;
    }
    const saved = saveLocalVote(other.match, 1, {
      playerId: '1',
      gesture: 'point',
      targets: ['2', '3', '4'],
    });
    expect(saved.ok).toBe(true);
    if (!saved.ok) {
      return;
    }
    expect(saved.match.rounds[0].drafts?.[0]).toEqual({
      playerId: '2',
      gesture: 'point',
      targets: ['4'],
    });
    expect(saved.match.rounds[0].drafts?.[1]).toEqual({
      playerId: '1',
      gesture: 'point',
      targets: ['2', '3', '4'],
    });
    const form = localVoteForm(saved.match, 1, '1');
    expect(form?.others.map((player) => player.id)).toEqual(['2', '3', '4']);
    expect(form?.draft).toEqual({
      playerId: '1',
      gesture: 'point',
      targets: ['2', '3', '4'],
    });
    expect(JSON.stringify(form)).not.toContain('Lenguaje');
    expect(JSON.stringify(form)).not.toContain('"targets":["4"]');
    expect(localVoteRoster(saved.match, 1)[0]).toEqual({
      playerId: '1',
      name: 'Ana',
      registered: true,
    });
  });

  it('un objetivo ajeno a la ronda no cambia el documento', () => {
    const current = match();
    expect(
      saveLocalVote(current, 1, {
        playerId: '1',
        gesture: 'point',
        targets: ['9'],
      }),
    ).toEqual({
      ok: false,
      match: current,
      message: outsideLocalTargetMessage,
    });
  });

  it('modificar los señalados deja un registro y conserva el resto', () => {
    const current = match();
    const first = saveLocalVote(current, 1, {
      playerId: '1',
      gesture: 'point',
      targets: ['2'],
    });
    expect(first.ok).toBe(true);
    if (!first.ok) {
      return;
    }
    const other = saveLocalVote(first.match, 1, {
      playerId: '2',
      gesture: 'point',
      targets: ['3'],
    });
    expect(other.ok).toBe(true);
    if (!other.ok) {
      return;
    }
    const second = saveLocalVote(other.match, 1, {
      playerId: '1',
      gesture: 'point',
      targets: ['3'],
    });
    expect(second.ok).toBe(true);
    if (!second.ok) {
      return;
    }
    expect(second.match.rounds[0].drafts).toEqual([
      { playerId: '2', gesture: 'point', targets: ['3'] },
      { playerId: '1', gesture: 'point', targets: ['3'] },
    ]);
    expect(second.match.rounds[0].hands).toBe(current.rounds[0].hands);
    expect(second.match.rounds[1]).toBe(current.rounds[1]);
    expect(current.rounds[0].drafts).toEqual([]);
  });

  it('una lista parcial se guarda sin puntos ni acierto', () => {
    const saved = saveLocalVote(match(), 1, {
      playerId: '1',
      gesture: 'point',
      targets: ['2'],
    });
    expect(saved.ok).toBe(true);
    if (!saved.ok) {
      return;
    }
    const draft = saved.match.rounds[0].drafts?.[0];
    expect(draft).toEqual({
      playerId: '1',
      gesture: 'point',
      targets: ['2'],
    });
    expect(draft).not.toHaveProperty('points');
    expect(draft).not.toHaveProperty('correct');
  });

  it('guarda el puño y la V en la ronda abierta', () => {
    const current = match();
    const fist = saveLocalVote(current, 1, {
      playerId: '1',
      gesture: 'fist',
      targets: [],
    });
    expect(fist.ok).toBe(true);
    if (!fist.ok) {
      return;
    }
    const risk = saveLocalVote(fist.match, 1, {
      playerId: '2',
      gesture: 'v',
      targets: [],
    });
    expect(risk.ok).toBe(true);
    if (!risk.ok) {
      return;
    }
    expect(risk.match.phase).toBe('recording');
    expect(risk.match.rounds[0].number).toBe(1);
    expect(risk.match.rounds[0].drafts).toEqual([
      { playerId: '1', gesture: 'fist', targets: [] },
      { playerId: '2', gesture: 'v', targets: [] },
    ]);
    expect(risk.match.rounds[1]).toBe(current.rounds[1]);
    const form = localVoteForm(risk.match, 1, '1');
    expect(form?.draft).toEqual({
      playerId: '1',
      gesture: 'fist',
      targets: [],
    });
    expect(JSON.stringify(form)).not.toContain('"gesture":"v"');
    expect(JSON.stringify(form)).not.toMatch(/points|correct|role|impostor/i);
    expect(JSON.stringify(localVoteRoster(risk.match, 1))).not.toMatch(
      /fist|"v"|points|impostor/i,
    );
  });

  it('corrige el puño y la V y conserva el otro registro', () => {
    const current = match();
    const fist = saveLocalVote(current, 1, {
      playerId: '1',
      gesture: 'fist',
      targets: [],
    });
    expect(fist.ok).toBe(true);
    if (!fist.ok) {
      return;
    }
    const risk = saveLocalVote(fist.match, 1, {
      playerId: '2',
      gesture: 'v',
      targets: [],
    });
    expect(risk.ok).toBe(true);
    if (!risk.ok) {
      return;
    }
    const correctedFist = saveLocalVote(risk.match, 1, {
      playerId: '1',
      gesture: 'v',
      targets: [],
    });
    expect(correctedFist.ok).toBe(true);
    if (!correctedFist.ok) {
      return;
    }
    const correctedRisk = saveLocalVote(correctedFist.match, 1, {
      playerId: '2',
      gesture: 'fist',
      targets: [],
    });
    expect(correctedRisk.ok).toBe(true);
    if (!correctedRisk.ok) {
      return;
    }
    expect(correctedRisk.match.rounds[0].drafts).toEqual([
      { playerId: '1', gesture: 'v', targets: [] },
      { playerId: '2', gesture: 'fist', targets: [] },
    ]);
    const draft = correctedRisk.match.rounds[0].drafts?.[0];
    expect(draft).not.toHaveProperty('points');
    expect(draft).not.toHaveProperty('correct');
    expect(draft).not.toHaveProperty('role');
  });

  it('el aviso del puño con objetivos no nombra un rol', () => {
    const current = match();
    const saved = saveLocalVote(current, 1, {
      playerId: '1',
      gesture: 'fist',
      targets: ['2'],
    });
    expect(saved).toEqual({
      ok: false,
      match: current,
      message: gesturedLocalTargetMessage,
    });
    expect(gesturedLocalTargetMessage).not.toMatch(/impostor|rol/i);
  });

  it('un registro incompleto no confirma la ronda', () => {
    const current = match();
    const saved = saveLocalVote(current, 1, {
      playerId: '1',
      gesture: 'point',
      targets: ['2'],
    });
    expect(saved.ok).toBe(true);
    if (!saved.ok) {
      return;
    }
    expect(confirmLocalVotes(saved.match, 1)).toEqual({
      ok: false,
      match: saved.match,
      message: missingLocalVoteMessage,
    });
    expect(saved.match.phase).toBe('recording');
    expect(saved.match.rounds[1].drafts).toEqual([]);
  });

  it('corregir los señalados actualiza solo esa línea', () => {
    const first = saveLocalVote(match(), 1, {
      playerId: '1',
      gesture: 'point',
      targets: ['2'],
    });
    expect(first.ok).toBe(true);
    if (!first.ok) {
      return;
    }
    const other = saveLocalVote(first.match, 1, {
      playerId: '2',
      gesture: 'point',
      targets: ['3'],
    });
    expect(other.ok).toBe(true);
    if (!other.ok) {
      return;
    }
    const corrected = saveLocalVote(other.match, 1, {
      playerId: '1',
      gesture: 'point',
      targets: ['2', '3'],
    });
    expect(corrected.ok).toBe(true);
    if (!corrected.ok) {
      return;
    }
    expect(localVoteSummary(corrected.match, 1)).toEqual([
      {
        playerId: '1',
        name: 'Ana',
        registered: true,
        action: 'Señaló a Luis y Nora.',
      },
      {
        playerId: '2',
        name: 'Luis',
        registered: true,
        action: 'Señaló a Nora.',
      },
      {
        playerId: '3',
        name: 'Nora',
        registered: false,
        action: null,
      },
    ]);
    expect(corrected.match.rounds[1].drafts).toEqual([]);
  });

  it('corregir el gesto actualiza solo esa línea', () => {
    const fist = saveLocalVote(match(), 1, {
      playerId: '1',
      gesture: 'fist',
      targets: [],
    });
    expect(fist.ok).toBe(true);
    if (!fist.ok) {
      return;
    }
    const risk = saveLocalVote(fist.match, 1, {
      playerId: '2',
      gesture: 'v',
      targets: [],
    });
    expect(risk.ok).toBe(true);
    if (!risk.ok) {
      return;
    }
    const corrected = saveLocalVote(risk.match, 1, {
      playerId: '1',
      gesture: 'v',
      targets: [],
    });
    expect(corrected.ok).toBe(true);
    if (!corrected.ok) {
      return;
    }
    expect(
      localVoteSummary(corrected.match, 1).map((row) => row.action),
    ).toEqual(['V', 'V', null]);
    expect(corrected.match.rounds[0].drafts).toEqual([
      { playerId: '2', gesture: 'v', targets: [] },
      { playerId: '1', gesture: 'v', targets: [] },
    ]);
  });

  it('el resumen no trae carta, puntos ni rol', () => {
    const saved = saveLocalVote(match(), 1, {
      playerId: '1',
      gesture: 'fist',
      targets: [],
    });
    expect(saved.ok).toBe(true);
    if (!saved.ok) {
      return;
    }
    const summary = JSON.stringify(localVoteSummary(saved.match, 1));
    expect(summary).not.toMatch(
      /Lenguaje|points|correct|role|impostor|equipo/i,
    );
    expect(saved.match.rounds[1].drafts).toEqual([]);
  });

  it('con todos registrados confirmar no puntúa ni cambia la fase', () => {
    const current = match();
    const ana = saveLocalVote(current, 1, {
      playerId: '1',
      gesture: 'point',
      targets: ['2'],
    });
    expect(ana.ok).toBe(true);
    if (!ana.ok) {
      return;
    }
    const luis = saveLocalVote(ana.match, 1, {
      playerId: '2',
      gesture: 'fist',
      targets: [],
    });
    expect(luis.ok).toBe(true);
    if (!luis.ok) {
      return;
    }
    const nora = saveLocalVote(luis.match, 1, {
      playerId: '3',
      gesture: 'v',
      targets: [],
    });
    expect(nora.ok).toBe(true);
    if (!nora.ok) {
      return;
    }
    const confirmed = confirmLocalVotes(nora.match, 1);
    expect(confirmed).toEqual({ ok: true, match: nora.match });
    expect(confirmed.match.phase).toBe('recording');
    expect(JSON.stringify(confirmed.match)).not.toMatch(/points|correct/i);
  });

  it('una papeleta completa cierra la votación sin puntuar', () => {
    const current = match();
    const ana = saveLocalVote(current, 1, {
      playerId: '1',
      gesture: 'point',
      targets: ['2'],
    });
    expect(ana.ok).toBe(true);
    if (!ana.ok) {
      return;
    }
    const luis = saveLocalVote(ana.match, 1, {
      playerId: '2',
      gesture: 'fist',
      targets: [],
    });
    expect(luis.ok).toBe(true);
    if (!luis.ok) {
      return;
    }
    const nora = saveLocalVote(luis.match, 1, {
      playerId: '3',
      gesture: 'v',
      targets: [],
    });
    expect(nora.ok).toBe(true);
    if (!nora.ok) {
      return;
    }
    const closed = closeLocalVote(nora.match, 1);
    expect(closed.ok).toBe(true);
    if (!closed.ok) {
      return;
    }
    expect(closed.match.phase).toBe('recording');
    expect(closed.match.rounds[0].status).toBe('voting');
    expect(closed.match.rounds[0].drafts).toBe(nora.match.rounds[0].drafts);
    expect(closed.match.rounds[1]).toBe(nora.match.rounds[1]);
    expect(JSON.stringify(closed.match)).not.toMatch(/points|correct/i);
    expect(closeLocalVote(closed.match, 1)).toEqual({
      ok: true,
      match: closed.match,
    });
  });

  it('un registro incompleto no cierra la votación', () => {
    const current = match();
    const saved = saveLocalVote(current, 1, {
      playerId: '1',
      gesture: 'fist',
      targets: [],
    });
    expect(saved.ok).toBe(true);
    if (!saved.ok) {
      return;
    }
    expect(closeLocalVote(saved.match, 1)).toEqual({
      ok: false,
      match: saved.match,
      message: missingLocalVoteMessage,
    });
    expect(saved.match.rounds[0].status).toBe('conversation');
  });

  it('guardar después del cierre no cambia el documento', () => {
    const current = match();
    const ana = saveLocalVote(current, 1, {
      playerId: '1',
      gesture: 'fist',
      targets: [],
    });
    expect(ana.ok).toBe(true);
    if (!ana.ok) {
      return;
    }
    const luis = saveLocalVote(ana.match, 1, {
      playerId: '2',
      gesture: 'v',
      targets: [],
    });
    expect(luis.ok).toBe(true);
    if (!luis.ok) {
      return;
    }
    const nora = saveLocalVote(luis.match, 1, {
      playerId: '3',
      gesture: 'point',
      targets: ['1'],
    });
    expect(nora.ok).toBe(true);
    if (!nora.ok) {
      return;
    }
    const closed = closeLocalVote(nora.match, 1);
    expect(closed.ok).toBe(true);
    if (!closed.ok) {
      return;
    }
    expect(
      saveLocalVote(closed.match, 1, {
        playerId: '1',
        gesture: 'v',
        targets: [],
      }),
    ).toEqual({
      ok: false,
      match: closed.match,
      message: voteAlreadyClosedMessage,
    });
  });

  it('un borrador inválido no cierra la votación', () => {
    const current = match();
    const round = current.rounds[0];
    const invalid: LocalMatch = {
      ...current,
      rounds: [
        {
          ...round,
          drafts: [
            { playerId: '1', gesture: 'point', targets: ['1'] },
            { playerId: '2', gesture: 'fist', targets: [] },
            { playerId: '3', gesture: 'v', targets: [] },
          ],
        },
        current.rounds[1],
      ],
    };
    expect(closeLocalVote(invalid, 1)).toEqual({
      ok: false,
      match: invalid,
      message: selfLocalTargetMessage,
    });
    expect(invalid.rounds[0].status).toBe('conversation');
    expect(invalid.rounds[0].drafts).toHaveLength(3);
  });
});
