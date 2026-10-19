import { describe, expect, it } from '@jest/globals';

import {
  presentLocalResults,
  sortStandings,
} from '../src/features/local/match/resultsPresentation';
import { localScoreboard } from '../src/features/local/rules/board';
import {
  localResultView,
  openLocalResults,
} from '../src/features/local/rules/reveal';
import type {
  LocalMatch,
  LocalVoteDraft,
} from '../src/features/local/rules/round';

function playedMatch(
  drafts: readonly LocalVoteDraft[],
  phase: LocalMatch['phase'] = 'recording',
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
          { id: 'A', points: 2 },
          { id: 'B', points: 2 },
          { id: 'I', points: 4 },
        ].map((item) => ({ playerId: item.id, points: item.points })),
      },
      {
        number: 2,
        status: 'voting',
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

describe('presentación de resultados presencial', () => {
  it('una fila por jugador con rol, carta y puntos del dominio', () => {
    const opened = openLocalResults(playedMatch(ballot), 2);
    expect(opened.ok).toBe(true);
    if (!opened.ok) {
      return;
    }
    const view = localResultView(opened.match, 2);
    expect(view.ok).toBe(true);
    if (!view.ok) {
      return;
    }
    const board = localScoreboard(opened.match);
    const presented = presentLocalResults(opened.match, view, board, 2, false);
    expect(presented.rows).toHaveLength(3);
    expect(presented.rows.map((row) => row.playerId)).toEqual(['A', 'B', 'I']);
    expect(presented.rows.map((row) => row.role)).toEqual([
      'team',
      'team',
      'impostor',
    ]);
    expect(presented.rows[0]?.cardLabel).toBe('Carta #1');
    expect(presented.rows[0]?.cardText).toBe('En la mesa');
    expect(presented.rows[2]?.roleLabel).toBe('Impostor');
    expect(presented.rows.map((row) => row.roundPoints)).toEqual(
      view.rows.map((row) => row.roundPoints),
    );
    expect(presented.rows.map((row) => row.totalPoints)).toEqual(
      view.rows.map((row) => row.totalPoints),
    );
    expect(presented.winnersLine).toBeUndefined();
  });

  it('ordena la clasificación por puntos y mantiene empates estables', () => {
    const rosterIndex = new Map([
      ['A', 0],
      ['B', 1],
      ['C', 2],
    ]);
    const sorted = sortStandings(
      [
        { playerId: 'A', name: 'Ana', points: 2 },
        { playerId: 'B', name: 'Luis', points: 5 },
        { playerId: 'C', name: 'Nora', points: 5 },
      ],
      rosterIndex,
    );
    expect(sorted.map((row) => row.playerId)).toEqual(['B', 'C', 'A']);
  });

  it('en el marcador lista ganadores sin alterar el dominio', () => {
    const opened = openLocalResults(playedMatch(ballot), 2);
    expect(opened.ok).toBe(true);
    if (!opened.ok) {
      return;
    }
    const finished: LocalMatch = {
      ...opened.match,
      status: 'finished',
      phase: 'finished',
    };
    const view = localResultView(finished, 2);
    expect(view.ok).toBe(true);
    if (!view.ok) {
      return;
    }
    const board = localScoreboard(finished);
    const presented = presentLocalResults(finished, view, board, 2, true);
    expect(presented.standings[0]?.points).toBeGreaterThanOrEqual(
      presented.standings[presented.standings.length - 1]?.points ?? 0,
    );
    expect(presented.winnersLine).toBe(
      `Ganadores: ${board.winners.join(', ')}`,
    );
    expect(board.winners).toEqual(localScoreboard(finished).winners);
  });

  it('no revela resultados fuera de results o finished', () => {
    const view = localResultView(playedMatch(ballot, 'recording'), 2);
    expect(view).toEqual({
      ok: false,
      message: 'Todavía no hay un resultado.',
    });
  });
});
