import { describe, expect, it } from '@jest/globals';

import type {
  LocalMatch,
  LocalVoteDraft,
} from '../src/features/local/rules/round';
import {
  evaluateLocalTeam,
  localRoundAwards,
  localTotals,
  notALocalTeammateMessage,
  scoreLocalImpostors,
  scoreLocalRound,
  scoreLocalTeams,
} from '../src/features/local/rules/score';
import { closedLocalVoteMessage } from '../src/features/local/rules/vote';

function votingMatch(
  hands: readonly { playerId: string; number: number }[],
  drafts: readonly LocalVoteDraft[],
): LocalMatch {
  const names: Record<string, string> = {
    A: 'Ana',
    B: 'Luis',
    C: 'Nora',
    X: 'Iván',
  };
  return {
    version: 1,
    status: 'preparing',
    phase: 'recording',
    players: hands.map((hand) => ({
      id: hand.playerId,
      name: names[hand.playerId] ?? hand.playerId,
    })),
    piles: [],
    rounds: [
      {
        number: 1,
        status: 'voting',
        piles: [],
        hands: hands.map((hand) => ({ ...hand, copy: 1 })),
        discard: [{ number: 9, copy: 1 }],
        drafts,
      },
    ],
  };
}

describe('puntos de los jugadores normales', () => {
  it('una pareja que se señala suma un punto cada uno', () => {
    const scored = scoreLocalTeams(
      votingMatch(
        [
          { playerId: 'A', number: 1 },
          { playerId: 'B', number: 1 },
        ],
        [
          { playerId: 'A', gesture: 'point', targets: ['B'] },
          { playerId: 'B', gesture: 'point', targets: ['A'] },
        ],
      ),
      1,
    );
    expect(scored).toEqual({
      ok: true,
      scores: [
        { playerId: 'A', points: 1 },
        { playerId: 'B', points: 1 },
      ],
    });
  });

  it('dos parejas sin impostor suman un punto cada una', () => {
    const match = votingMatch(
      [
        { playerId: 'A', number: 1 },
        { playerId: 'B', number: 1 },
        { playerId: 'C', number: 2 },
        { playerId: 'D', number: 2 },
      ],
      [
        { playerId: 'A', gesture: 'point', targets: ['B'] },
        { playerId: 'B', gesture: 'point', targets: ['A'] },
        { playerId: 'C', gesture: 'point', targets: ['D'] },
        { playerId: 'D', gesture: 'point', targets: ['C'] },
      ],
    );
    expect(scoreLocalImpostors(match, 1)).toEqual({ ok: true, scores: [] });
    expect(scoreLocalTeams(match, 1)).toEqual({
      ok: true,
      scores: [
        { playerId: 'A', points: 1 },
        { playerId: 'B', points: 1 },
        { playerId: 'C', points: 1 },
        { playerId: 'D', points: 1 },
      ],
    });
  });

  it('un trío que se señala por completo suma dos puntos cada uno', () => {
    const scored = scoreLocalTeams(
      votingMatch(
        [
          { playerId: 'A', number: 1 },
          { playerId: 'B', number: 1 },
          { playerId: 'C', number: 1 },
        ],
        [
          { playerId: 'A', gesture: 'point', targets: ['B', 'C'] },
          { playerId: 'B', gesture: 'point', targets: ['A', 'C'] },
          { playerId: 'C', gesture: 'point', targets: ['A', 'B'] },
        ],
      ),
      1,
    );
    expect(scored).toEqual({
      ok: true,
      scores: [
        { playerId: 'A', points: 2 },
        { playerId: 'B', points: 2 },
        { playerId: 'C', points: 2 },
      ],
    });
  });

  it('A suma el señalamiento de B aunque B haya incluido a un ajeno', () => {
    const match = votingMatch(
      [
        { playerId: 'A', number: 1 },
        { playerId: 'B', number: 1 },
        { playerId: 'X', number: 2 },
      ],
      [
        { playerId: 'A', gesture: 'point', targets: ['B'] },
        { playerId: 'B', gesture: 'point', targets: ['A', 'X'] },
        { playerId: 'X', gesture: 'fist', targets: [] },
      ],
    );
    const drafts = match.rounds[0].drafts;
    const scored = scoreLocalTeams(match, 1);
    expect(scored).toEqual({
      ok: true,
      scores: [
        { playerId: 'A', points: 1 },
        { playerId: 'B', points: 0 },
      ],
    });
    expect(match.rounds[0].drafts).toBe(drafts);
    expect(scoreLocalTeams(match, 1)).toEqual(scored);
  });

  it('omitir un compañero o incluir un ajeno suma cero', () => {
    const omitted = scoreLocalTeams(
      votingMatch(
        [
          { playerId: 'A', number: 1 },
          { playerId: 'B', number: 1 },
          { playerId: 'C', number: 1 },
        ],
        [
          { playerId: 'A', gesture: 'point', targets: ['B'] },
          { playerId: 'B', gesture: 'point', targets: ['A', 'C'] },
          { playerId: 'C', gesture: 'point', targets: ['A', 'B'] },
        ],
      ),
      1,
    );
    expect(omitted).toEqual({
      ok: true,
      scores: [
        { playerId: 'A', points: 0 },
        { playerId: 'B', points: 2 },
        { playerId: 'C', points: 1 },
      ],
    });

    const outsider = scoreLocalTeams(
      votingMatch(
        [
          { playerId: 'A', number: 1 },
          { playerId: 'B', number: 1 },
          { playerId: 'C', number: 1 },
          { playerId: 'X', number: 2 },
        ],
        [
          { playerId: 'A', gesture: 'point', targets: ['B', 'X'] },
          { playerId: 'B', gesture: 'point', targets: ['A', 'C'] },
          { playerId: 'C', gesture: 'point', targets: ['A', 'B'] },
          { playerId: 'X', gesture: 'v', targets: [] },
        ],
      ),
      1,
    );
    expect(outsider).toEqual({
      ok: true,
      scores: [
        { playerId: 'A', points: 0 },
        { playerId: 'B', points: 2 },
        { playerId: 'C', points: 1 },
      ],
    });
  });

  it('un trío suma por cada compañero que lo señaló, aunque ese haya señalado de menos', () => {
    const scored = scoreLocalTeams(
      votingMatch(
        [
          { playerId: 'A', number: 1 },
          { playerId: 'B', number: 1 },
          { playerId: 'C', number: 1 },
        ],
        [
          { playerId: 'A', gesture: 'point', targets: ['B', 'C'] },
          { playerId: 'B', gesture: 'point', targets: ['A'] },
          { playerId: 'C', gesture: 'point', targets: ['A', 'B'] },
        ],
      ),
      1,
    );
    expect(scored).toEqual({
      ok: true,
      scores: [
        { playerId: 'A', points: 2 },
        { playerId: 'B', points: 0 },
        { playerId: 'C', points: 1 },
      ],
    });
  });

  it('una ronda sin cerrar no se puntúa', () => {
    const match = votingMatch(
      [
        { playerId: 'A', number: 1 },
        { playerId: 'B', number: 1 },
      ],
      [
        { playerId: 'A', gesture: 'point', targets: ['B'] },
        { playerId: 'B', gesture: 'point', targets: ['A'] },
      ],
    );
    match.rounds[0].status = 'conversation';
    expect(scoreLocalTeams(match, 1)).toEqual({
      ok: false,
      message: closedLocalVoteMessage,
    });
    expect(match.rounds[0].drafts).toEqual([
      { playerId: 'A', gesture: 'point', targets: ['B'] },
      { playerId: 'B', gesture: 'point', targets: ['A'] },
    ]);
  });

  it('un impostor no pertenece a un equipo', () => {
    expect(
      evaluateLocalTeam([{ situation: 1, players: ['A', 'B'] }], [], 'X'),
    ).toEqual({ ok: false, message: notALocalTeammateMessage });
  });
});

describe('puntos de los impostores', () => {
  function round(
    gesture: 'fist' | 'v' | 'point',
    pointers: readonly ('A' | 'B')[],
    impostorTargets: readonly string[] = [],
  ) {
    return votingMatch(
      [
        { playerId: 'A', number: 1 },
        { playerId: 'B', number: 1 },
        { playerId: 'I', number: 2 },
      ],
      [
        {
          playerId: 'A',
          gesture: 'point',
          targets: pointers.includes('A') ? ['B', 'I'] : ['B'],
        },
        {
          playerId: 'B',
          gesture: 'point',
          targets: pointers.includes('B') ? ['A', 'I'] : ['A'],
        },
        { playerId: 'I', gesture, targets: impostorTargets },
      ],
    );
  }

  it('el puño suma uno aunque lo hayan señalado', () => {
    const match = round('fist', ['A', 'B']);
    const drafts = match.rounds[0].drafts;
    expect(scoreLocalImpostors(match, 1)).toEqual({
      ok: true,
      scores: [{ playerId: 'I', points: 1 }],
    });
    expect(match.rounds[0].drafts).toBe(drafts);
    expect(scoreLocalImpostors(match, 1).ok && match.rounds[0].drafts).toBe(
      drafts,
    );
  });

  it('la V suma cero, dos o tres según los señalamientos', () => {
    expect(scoreLocalImpostors(round('v', []), 1)).toEqual({
      ok: true,
      scores: [{ playerId: 'I', points: 0 }],
    });
    expect(scoreLocalImpostors(round('v', ['A']), 1)).toEqual({
      ok: true,
      scores: [{ playerId: 'I', points: 2 }],
    });
    expect(scoreLocalImpostors(round('v', ['A', 'B']), 1)).toEqual({
      ok: true,
      scores: [{ playerId: 'I', points: 3 }],
    });
  });

  it('un jugador de equipo con puño o V suma cero', () => {
    for (const gesture of ['fist', 'v'] as const) {
      const scored = scoreLocalTeams(
        votingMatch(
          [
            { playerId: 'A', number: 1 },
            { playerId: 'B', number: 1 },
            { playerId: 'I', number: 2 },
          ],
          [
            { playerId: 'A', gesture, targets: [] },
            { playerId: 'B', gesture: 'point', targets: ['A'] },
            { playerId: 'I', gesture: 'fist', targets: [] },
          ],
        ),
        1,
      );
      expect(scored.ok).toBe(true);
      if (!scored.ok) {
        return;
      }
      expect(scored.scores.find((score) => score.playerId === 'A')).toEqual({
        playerId: 'A',
        points: 0,
      });
    }
  });

  it('un impostor que señala suma cero', () => {
    expect(scoreLocalImpostors(round('point', [], ['A']), 1)).toEqual({
      ok: true,
      scores: [{ playerId: 'I', points: 0 }],
    });
  });
});

describe('puntaje consolidado de la ronda', () => {
  it('guarda un premio para la pareja y el impostor, incluido el cero', () => {
    const match = votingMatch(
      [
        { playerId: 'A', number: 1 },
        { playerId: 'B', number: 1 },
        { playerId: 'I', number: 2 },
      ],
      [
        { playerId: 'A', gesture: 'point', targets: ['B'] },
        { playerId: 'B', gesture: 'point', targets: ['A'] },
        { playerId: 'I', gesture: 'v', targets: [] },
      ],
    );
    const hands = match.rounds[0].hands;
    const drafts = match.rounds[0].drafts;
    Object.assign(drafts?.[0] ?? {}, { points: 99 });
    const scored = scoreLocalRound(match, 1);
    expect(scored.ok).toBe(true);
    if (!scored.ok) {
      return;
    }
    expect(localRoundAwards(scored.match, 1)).toEqual([
      { playerId: 'A', points: 1 },
      { playerId: 'B', points: 1 },
      { playerId: 'I', points: 0 },
    ]);
    expect(scored.match.phase).toBe('recording');
    expect(scored.match.rounds[0].status).toBe('voting');
    expect(scored.match.rounds[0].hands).toBe(hands);
    expect(scored.match.rounds[0].drafts).toBe(drafts);
    const again = scoreLocalRound(scored.match, 1);
    expect(again).toEqual({ ok: true, match: scored.match });
    expect(localTotals(again.match)).toEqual(localRoundAwards(scored.match, 1));
  });

  it('guarda un premio para el trío y el impostor', () => {
    const scored = scoreLocalRound(
      votingMatch(
        [
          { playerId: 'A', number: 1 },
          { playerId: 'B', number: 1 },
          { playerId: 'C', number: 1 },
          { playerId: 'I', number: 2 },
        ],
        [
          { playerId: 'A', gesture: 'point', targets: ['B'] },
          { playerId: 'B', gesture: 'point', targets: ['A', 'C'] },
          { playerId: 'C', gesture: 'point', targets: ['A', 'B'] },
          { playerId: 'I', gesture: 'fist', targets: [] },
        ],
      ),
      1,
    );
    expect(scored.ok).toBe(true);
    if (!scored.ok) {
      return;
    }
    expect(localRoundAwards(scored.match, 1)).toEqual([
      { playerId: 'A', points: 0 },
      { playerId: 'B', points: 2 },
      { playerId: 'C', points: 1 },
      { playerId: 'I', points: 1 },
    ]);
  });

  it('cubre a dos impostores sin omitir al que suma cero', () => {
    const scored = scoreLocalRound(
      votingMatch(
        [
          { playerId: 'A', number: 1 },
          { playerId: 'B', number: 1 },
          { playerId: 'I', number: 2 },
          { playerId: 'J', number: 3 },
        ],
        [
          { playerId: 'A', gesture: 'point', targets: ['B'] },
          { playerId: 'B', gesture: 'point', targets: ['A'] },
          { playerId: 'I', gesture: 'fist', targets: [] },
          { playerId: 'J', gesture: 'v', targets: [] },
        ],
      ),
      1,
    );
    expect(scored.ok).toBe(true);
    if (!scored.ok) {
      return;
    }
    expect(localRoundAwards(scored.match, 1)).toEqual([
      { playerId: 'A', points: 1 },
      { playerId: 'B', points: 1 },
      { playerId: 'I', points: 1 },
      { playerId: 'J', points: 0 },
    ]);
    expect(localTotals(scored.match)).toEqual(
      localRoundAwards(scored.match, 1),
    );
  });
});
