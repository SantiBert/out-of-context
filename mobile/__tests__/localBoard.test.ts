import { describe, expect, it } from '@jest/globals';

import {
  localScoreboard,
  settleLocalRound,
} from '../src/features/local/rules/board';
import { localResultView } from '../src/features/local/rules/reveal';
import type {
  LocalMatch,
  LocalRound,
  LocalVoteDraft,
} from '../src/features/local/rules/round';
import { localTotals } from '../src/features/local/rules/score';

const players = [
  { id: 'A', name: 'Ana' },
  { id: 'B', name: 'Luis' },
  { id: 'C', name: 'Nora' },
  { id: 'D', name: 'Otto' },
];

const drafts: readonly LocalVoteDraft[] = [
  { playerId: 'A', gesture: 'point', targets: ['B'] },
  { playerId: 'B', gesture: 'point', targets: ['A'] },
  { playerId: 'C', gesture: 'point', targets: ['D'] },
  { playerId: 'D', gesture: 'point', targets: ['C'] },
];

function points(values: readonly number[]) {
  return players.map((player, index) => ({
    playerId: player.id,
    points: values[index] ?? 0,
  }));
}

function round(
  number: number,
  status: LocalRound['status'],
  pile: number,
  values: readonly number[],
): LocalRound {
  return {
    number,
    status,
    piles: [pile, pile + 1, pile + 2],
    hands: [
      { playerId: 'A', number: 1, copy: 1 },
      { playerId: 'B', number: 1, copy: 2 },
      { playerId: 'C', number: 2, copy: 1 },
      { playerId: 'D', number: 2, copy: 2 },
    ],
    discard: [],
    drafts,
    awards: points(values),
  };
}

function match(rounds: readonly LocalRound[]): LocalMatch {
  return {
    version: 1,
    status: 'preparing',
    phase: 'results',
    players,
    piles: Array.from({ length: 15 }, (_, index) => ({
      number: index + 1,
      copies: [1, 2, 3],
    })),
    rounds,
  };
}

describe('marcador presencial', () => {
  it('suma las rondas guardadas una sola vez', () => {
    const current = match([
      round(1, 'finished', 1, [2, 2, 1, 4]),
      round(2, 'voting', 4, [1, 0, 3, 0]),
    ]);
    const hands = current.rounds[1]?.hands;
    const storedDrafts = current.rounds[1]?.drafts;
    const settled = settleLocalRound(current, 2);
    expect(settled.ok).toBe(true);
    if (!settled.ok) {
      return;
    }
    expect(settled.match.rounds).toHaveLength(2);
    expect(settled.match.phase).toBe('results');
    expect(settled.match.status).toBe('preparing');
    expect(settled.match.rounds[1]?.hands).toBe(hands);
    expect(settled.match.rounds[1]?.drafts).toBe(storedDrafts);
    expect(localTotals(settled.match)).toEqual(points([3, 2, 4, 4]));
    expect(localScoreboard(settled.match).winners).toEqual([]);
    const again = settleLocalRound(settled.match, 2);
    expect(again).toEqual({ ok: true, match: settled.match });
    expect(localTotals(again.match)).toEqual(localTotals(settled.match));
    const view = localResultView(settled.match, 2);
    expect(view.ok).toBe(true);
    if (!view.ok) {
      return;
    }
    expect(view.rows.map((row) => row.roundPoints)).toEqual([1, 0, 3, 0]);
    expect(view.rows.map((row) => row.totalPoints)).toEqual([3, 2, 4, 4]);
  });

  it('termina la partida sin repartir cuando no quedan pilas', () => {
    const current = match([
      round(1, 'finished', 1, [1, 1, 0, 1]),
      round(2, 'finished', 4, [0, 0, 0, 0]),
      round(3, 'finished', 7, [0, 0, 0, 0]),
      round(4, 'finished', 10, [0, 0, 0, 0]),
      round(5, 'voting', 13, [4, 4, 1, 0]),
    ]);
    const settled = settleLocalRound(current, 5);
    expect(settled.ok).toBe(true);
    if (!settled.ok) {
      return;
    }
    expect(settled.match.rounds).toHaveLength(5);
    expect(settled.match.status).toBe('finished');
    expect(settled.match.phase).toBe('finished');
    expect(localScoreboard(settled.match)).toEqual({
      standings: [
        { playerId: 'A', name: 'Ana', points: 5 },
        { playerId: 'B', name: 'Luis', points: 5 },
        { playerId: 'C', name: 'Nora', points: 1 },
        { playerId: 'D', name: 'Otto', points: 1 },
      ],
      winners: ['Ana', 'Luis'],
    });
    const view = localResultView(settled.match, 5);
    expect(view.ok).toBe(true);
    if (!view.ok) {
      return;
    }
    expect(view.rows.find((row) => row.playerId === 'A')).toMatchObject({
      roundPoints: 4,
      totalPoints: 5,
    });
  });

  it('no cierra una ronda que todavía no tiene premio', () => {
    const current = match([round(1, 'voting', 1, [1, 1, 1, 1])]);
    const open = current.rounds[0];
    if (open) {
      delete open.awards;
    }
    expect(settleLocalRound(current, 1)).toEqual({
      ok: false,
      match: current,
      message: 'Todavía no hay un resultado.',
    });
    expect(current.rounds[0]?.status).toBe('voting');
  });
});
