import { describe, expect, it } from '@jest/globals';

import {
  absentLocalResultMessage,
  localResultView,
  openLocalResults,
} from '../src/features/local/rules/reveal';
import type {
  LocalMatch,
  LocalVoteDraft,
} from '../src/features/local/rules/round';
import { localTotals } from '../src/features/local/rules/score';
import { closedLocalVoteMessage } from '../src/features/local/rules/vote';

function playedMatch(
  drafts: readonly LocalVoteDraft[],
  phase: LocalMatch['phase'] = 'recording',
  status: LocalMatch['rounds'][number]['status'] = 'voting',
): LocalMatch {
  return {
    version: 1,
    status: 'preparing',
    phase,
    players: [
      { id: 'A', name: 'Ana' },
      { id: 'B', name: 'Luis' },
      { id: 'I', name: 'Iván' },
    ],
    piles: [
      { number: 1, copies: [1, 2, 3], text: 'En la mesa' },
      { number: 2, copies: [1, 2, 3] },
    ],
    rounds: [
      {
        number: 1,
        status: 'finished',
        piles: [],
        hands: [],
        discard: [],
        awards: [
          { playerId: 'A', points: 2 },
          { playerId: 'B', points: 2 },
          { playerId: 'I', points: 4 },
        ],
      },
      {
        number: 2,
        status,
        piles: [],
        hands: [
          { playerId: 'A', number: 1, copy: 1 },
          { playerId: 'B', number: 1, copy: 1 },
          { playerId: 'I', number: 2, copy: 1 },
        ],
        discard: [{ number: 9, copy: 1 }],
        drafts,
      },
    ],
  };
}

const ballot: readonly LocalVoteDraft[] = [
  { playerId: 'A', gesture: 'point', targets: ['B'] },
  { playerId: 'B', gesture: 'point', targets: ['A'] },
  { playerId: 'I', gesture: 'v', targets: [] },
];

describe('resultados de la ronda presencial', () => {
  it('muestra carta, equipo, gesto y separa la ronda del total', () => {
    const opened = openLocalResults(playedMatch(ballot), 2);
    expect(opened.ok).toBe(true);
    if (!opened.ok) {
      return;
    }
    const view = localResultView(opened.match, 2);
    expect(view).toEqual({
      ok: true,
      teams: [{ situation: 1, names: ['Ana', 'Luis'] }],
      impostors: [{ situation: 2, name: 'Iván' }],
      rows: [
        {
          playerId: 'A',
          name: 'Ana',
          cardNumber: 1,
          cardText: 'En la mesa',
          action: 'Señaló a Luis.',
          roundPoints: 1,
          totalPoints: 3,
          explanation: 'Reconocido por: Luis',
        },
        {
          playerId: 'B',
          name: 'Luis',
          cardNumber: 1,
          cardText: 'En la mesa',
          action: 'Señaló a Ana.',
          roundPoints: 1,
          totalPoints: 3,
          explanation: 'Reconocido por: Ana',
        },
        {
          playerId: 'I',
          name: 'Iván',
          cardNumber: 2,
          action: 'V',
          roundPoints: 0,
          totalPoints: 4,
          explanation: 'Señalado por: nadie',
        },
      ],
    });
    expect(opened.match.phase).toBe('results');
    expect(opened.match.rounds[1]?.status).toBe('voting');
  });

  it('conserva el premio guardado aunque el borrador traiga puntos', () => {
    const match = playedMatch(ballot.map((draft) => ({ ...draft })));
    const awards = [
      { playerId: 'A', points: 7 },
      { playerId: 'B', points: 0 },
      { playerId: 'I', points: 4 },
    ];
    const round = match.rounds[1];
    if (round === undefined) {
      throw new Error('falta la ronda');
    }
    round.awards = awards;
    Object.assign(round.drafts?.[0] ?? {}, { points: 99 });
    const opened = openLocalResults(match, 2);
    expect(opened.ok).toBe(true);
    if (!opened.ok) {
      return;
    }
    expect(opened.match.rounds[1]?.awards).toBe(awards);
    const view = localResultView(opened.match, 2);
    expect(view.ok).toBe(true);
    if (!view.ok) {
      return;
    }
    expect(view.rows.map((row) => row.roundPoints)).toEqual([7, 0, 4]);
    expect(view.rows.map((row) => row.totalPoints)).toEqual([9, 2, 8]);
  });

  it('no revela antes del cierre ni duplica el total al repetir', () => {
    const talking = playedMatch(ballot, 'conversation', 'conversation');
    expect(localResultView(talking, 2)).toEqual({
      ok: false,
      message: absentLocalResultMessage,
    });
    expect(openLocalResults(talking, 2)).toEqual({
      ok: false,
      match: talking,
      message: closedLocalVoteMessage,
    });

    const recording = playedMatch(ballot);
    const hands = recording.rounds[1]?.hands;
    const drafts = recording.rounds[1]?.drafts;
    expect(localResultView(recording, 2)).toEqual({
      ok: false,
      message: absentLocalResultMessage,
    });
    expect(localResultView({ ...recording, phase: 'results' }, 2)).toEqual({
      ok: false,
      message: absentLocalResultMessage,
    });

    const opened = openLocalResults(recording, 2);
    expect(opened.ok).toBe(true);
    if (!opened.ok) {
      return;
    }
    expect(opened.match.rounds[1]?.hands).toBe(hands);
    expect(opened.match.rounds[1]?.drafts).toBe(drafts);
    const again = openLocalResults(opened.match, 2);
    expect(again).toEqual({ ok: true, match: opened.match });
    expect(localTotals(opened.match)).toEqual([
      { playerId: 'A', points: 3 },
      { playerId: 'B', points: 3 },
      { playerId: 'I', points: 4 },
    ]);
    expect(localTotals(again.match)).toEqual(localTotals(opened.match));
  });
});
