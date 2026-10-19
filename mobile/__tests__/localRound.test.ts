import { describe, expect, it } from '@jest/globals';

import {
  classifyLocalHands,
  createLocalPiles,
  duplicateLocalClassificationMessage,
  insufficientLocalPilesMessage,
  invalidLocalSituationCountMessage,
  localDeckConfig,
  localGameFinishedMessage,
  localRoundPublic,
  missingLocalHandMessage,
  ownLocalCard,
  prepareLocalRound,
  roundStillOpenMessage,
  type LocalMatch,
  type LocalRng,
  type LocalSituation,
} from '../src/features/local/rules/round';

const fixedRng: LocalRng = {
  sample(items, count) {
    return items.slice(0, count);
  },
  shuffle(items) {
    return [...items].reverse();
  },
};

function players(count: number): LocalMatch['players'] {
  return Array.from({ length: count }, (_, index) => ({
    id: String(index + 1),
    name: `Jugador ${index + 1}`,
  }));
}

function situations(count: number): LocalSituation[] {
  return Array.from({ length: count }, (_, index) => ({
    number: index + 1,
    copies: [1, 2, 3],
  }));
}

function setupMatch(playerCount: number): LocalMatch {
  return {
    version: 1,
    status: 'preparing',
    phase: 'setup',
    players: players(playerCount),
    piles: [],
    rounds: [],
  };
}

function withPiles(playerCount: number): LocalMatch {
  const config = localDeckConfig(playerCount);
  expect(config.ok).toBe(true);
  if (!config.ok) {
    return setupMatch(playerCount);
  }
  const created = createLocalPiles(
    setupMatch(playerCount),
    situations(config.config.pileCount),
  );
  expect(created.ok).toBe(true);
  return created.match;
}

function finishOpenRound(match: LocalMatch): LocalMatch {
  return {
    ...match,
    rounds: match.rounds.map((round, index) =>
      index === match.rounds.length - 1
        ? { ...round, status: 'finished' }
        : round,
    ),
  };
}

function copyKey(copy: { number: number; copy: number }): string {
  return `${copy.number}:${copy.copy}`;
}

function disjoint(
  left: ReadonlySet<unknown>,
  right: ReadonlySet<unknown>,
): boolean {
  for (const item of left) {
    if (right.has(item)) {
      return false;
    }
  }
  return true;
}

describe('preparación de la ronda presencial', () => {
  it('configura 15 pilas para 4 a 6 y 16 para 7 y 8', () => {
    for (const playerCount of [4, 5, 6]) {
      expect(localDeckConfig(playerCount)).toEqual({
        ok: true,
        config: {
          pileCount: 15,
          copiesPerPile: 3,
          pilesPerRound: 3,
          maxRounds: 5,
        },
      });
    }
    for (const playerCount of [7, 8]) {
      expect(localDeckConfig(playerCount)).toEqual({
        ok: true,
        config: {
          pileCount: 16,
          copiesPerPile: 3,
          pilesPerRound: 4,
          maxRounds: 4,
        },
      });
    }
  });

  it('prepara una ronda de 4 jugadores con tres pilas y cinco descartes', () => {
    const match = withPiles(4);
    expect(match.piles).toHaveLength(15);
    expect(match.piles.every((pile) => pile.copies.length === 3)).toBe(true);

    const prepared = prepareLocalRound(match, fixedRng);
    expect(prepared.ok).toBe(true);
    if (!prepared.ok) {
      return;
    }
    expect(prepared.match.status).toBe('preparing');
    expect(prepared.match.phase).toBe('viewing');
    expect(prepared.match.rounds).toHaveLength(1);
    const round = prepared.match.rounds[0];
    expect(round.status).toBe('conversation');
    expect(round.piles).toEqual([1, 2, 3]);
    expect(round.hands).toHaveLength(4);
    expect(round.discard).toHaveLength(5);
    expect(round.hands[0]).toEqual({
      playerId: '1',
      number: 3,
      copy: 3,
    });
    const dealt = new Set(round.hands.map(copyKey));
    const discarded = new Set(round.discard.map(copyKey));
    expect(disjoint(dealt, discarded)).toBe(true);
    expect(dealt.size + discarded.size).toBe(9);
  });

  it('prepara una ronda de 7 jugadores con cuatro pilas y cinco descartes', () => {
    const prepared = prepareLocalRound(withPiles(7), fixedRng);
    expect(prepared.ok).toBe(true);
    if (!prepared.ok) {
      return;
    }
    expect(prepared.match.piles).toHaveLength(16);
    const round = prepared.match.rounds[0];
    expect(round.piles).toEqual([1, 2, 3, 4]);
    expect(round.hands).toHaveLength(7);
    expect(round.discard).toHaveLength(5);
    const dealt = new Set(round.hands.map(copyKey));
    const discarded = new Set(round.discard.map(copyKey));
    expect(disjoint(dealt, discarded)).toBe(true);
    expect(dealt.size + discarded.size).toBe(12);
  });

  it('reparte 5 y 6 con tres pilas y 8 con cuatro, sin repetirlas', () => {
    for (const playerCount of [5, 6, 8]) {
      const config = localDeckConfig(playerCount);
      expect(config.ok).toBe(true);
      if (!config.ok) {
        return;
      }
      const first = prepareLocalRound(withPiles(playerCount), fixedRng);
      expect(first.ok).toBe(true);
      if (!first.ok) {
        return;
      }
      const round = first.match.rounds[0];
      expect(round.piles).toHaveLength(config.config.pilesPerRound);
      expect(round.hands).toHaveLength(playerCount);
      expect(round.discard).toHaveLength(
        config.config.pilesPerRound * config.config.copiesPerPile - playerCount,
      );
      const second = prepareLocalRound(finishOpenRound(first.match), fixedRng);
      expect(second.ok).toBe(true);
      if (!second.ok) {
        return;
      }
      const [opened, next] = second.match.rounds;
      expect(disjoint(new Set(opened.piles), new Set(next.piles))).toBe(true);
    }
  });

  it('no vuelve a elegir una pila ya usada', () => {
    const first = prepareLocalRound(withPiles(4), fixedRng);
    expect(first.ok).toBe(true);
    if (!first.ok) {
      return;
    }
    const second = prepareLocalRound(finishOpenRound(first.match), fixedRng);
    expect(second.ok).toBe(true);
    if (!second.ok) {
      return;
    }
    const [opened, next] = second.match.rounds;
    expect(disjoint(new Set(opened.piles), new Set(next.piles))).toBe(true);
  });

  it('una segunda preparación deja el mismo documento', () => {
    const first = prepareLocalRound(withPiles(4), fixedRng);
    expect(first.ok).toBe(true);
    if (!first.ok) {
      return;
    }
    const repeated = prepareLocalRound(first.match, fixedRng);
    expect(repeated).toEqual({
      ok: false,
      match: first.match,
      message: roundStillOpenMessage,
    });
    expect(repeated.match.rounds[0].hands).toEqual(first.match.rounds[0].hands);
    expect(repeated.match.rounds[0].discard).toEqual(
      first.match.rounds[0].discard,
    );
  });

  it('asigna una sola carta de la ronda y oculta el resto', () => {
    const prepared = prepareLocalRound(withPiles(4), fixedRng);
    expect(prepared.ok).toBe(true);
    if (!prepared.ok) {
      return;
    }
    const round = prepared.match.rounds[0];
    expect(round.hands.map((hand) => hand.playerId)).toEqual([
      '1',
      '2',
      '3',
      '4',
    ]);
    expect(new Set(round.hands.map((hand) => hand.playerId)).size).toBe(4);
    expect(new Set(round.hands.map(copyKey)).size).toBe(4);
    expect(round.hands.every((hand) => round.piles.includes(hand.number))).toBe(
      true,
    );
    expect(
      round.discard.every((copy) => round.piles.includes(copy.number)),
    ).toBe(true);
    expect(localRoundPublic(prepared.match, round)).toEqual({
      number: 1,
      status: 'conversation',
      playerIds: ['1', '2', '3', '4'],
      dealtCount: 4,
      discardCount: 5,
    });
    expect(ownLocalCard(round, '1')).toEqual({
      ok: true,
      number: 3,
      copy: 3,
    });
    expect(ownLocalCard(round, '2')).toEqual({
      ok: true,
      number: 3,
      copy: 2,
    });
    expect(ownLocalCard(round, 'ausente')).toEqual({
      ok: false,
      message: missingLocalHandMessage,
    });
  });

  it('clasifica equipos e impostores solo con las cartas asignadas', () => {
    expect(
      classifyLocalHands([
        { playerId: 'Ana', situation: 1 },
        { playerId: 'Luis', situation: 1 },
      ]),
    ).toEqual({
      ok: true,
      teams: [{ situation: 1, players: ['Ana', 'Luis'] }],
      impostors: [],
    });
    const trio = classifyLocalHands([
      { playerId: 'Ana', situation: 1 },
      { playerId: 'Luis', situation: 1 },
      { playerId: 'Nora', situation: 1 },
    ]);
    expect(trio.ok).toBe(true);
    if (trio.ok) {
      expect(trio.teams[0].players).toEqual(['Ana', 'Luis', 'Nora']);
    }
    const oneImpostor = classifyLocalHands([
      { playerId: 'Ana', situation: 1 },
      { playerId: 'Luis', situation: 1 },
      { playerId: 'Nora', situation: 1 },
      { playerId: 'Otto', situation: 2 },
    ]);
    expect(oneImpostor.ok).toBe(true);
    if (oneImpostor.ok) {
      expect(oneImpostor.teams[0].players).toEqual(['Ana', 'Luis', 'Nora']);
      expect(oneImpostor.impostors).toEqual([{ situation: 2, player: 'Otto' }]);
    }
    expect(
      classifyLocalHands([
        { playerId: 'Ana', situation: 1 },
        { playerId: 'Luis', situation: 2 },
        { playerId: 'Nora', situation: 3 },
      ]),
    ).toEqual({
      ok: true,
      teams: [],
      impostors: [
        { situation: 1, player: 'Ana' },
        { situation: 2, player: 'Luis' },
        { situation: 3, player: 'Nora' },
      ],
    });
    const dealt = [
      { playerId: 'Ana', situation: 1 },
      { playerId: 'Luis', situation: 1 },
      { playerId: 'Nora', situation: 2 },
    ];
    const withLeftoverIgnored = classifyLocalHands(dealt);
    expect(withLeftoverIgnored.ok).toBe(true);
    if (withLeftoverIgnored.ok) {
      expect(withLeftoverIgnored.impostors).toEqual([
        { situation: 2, player: 'Nora' },
      ]);
    }
    expect(
      classifyLocalHands([...dealt, { playerId: 'Ana', situation: 2 }]),
    ).toEqual({
      ok: false,
      message: duplicateLocalClassificationMessage,
    });
    expect(
      classifyLocalHands([
        { playerId: 'Ana', situation: 1 },
        { playerId: 'Luis', situation: 1 },
        { playerId: 'Nora', situation: 1 },
        { playerId: 'Otto', situation: 1 },
      ]),
    ).toEqual({
      ok: false,
      message: invalidLocalSituationCountMessage,
    });
  });

  it('termina la partida cuando no quedan pilas para otra ronda', () => {
    let four = withPiles(4);
    for (let index = 0; index < 5; index += 1) {
      const prepared = prepareLocalRound(four, fixedRng);
      expect(prepared.ok).toBe(true);
      if (!prepared.ok) {
        return;
      }
      four = finishOpenRound(prepared.match);
    }
    const blocked = prepareLocalRound(four, fixedRng);
    expect(blocked.ok).toBe(false);
    if (blocked.ok) {
      return;
    }
    expect(blocked.message).toBe(insufficientLocalPilesMessage);
    expect(blocked.match.status).toBe('finished');
    expect(blocked.match.rounds).toHaveLength(5);
    expect(prepareLocalRound(blocked.match, fixedRng)).toEqual({
      ok: false,
      match: blocked.match,
      message: localGameFinishedMessage,
    });

    let seven = withPiles(7);
    for (let index = 0; index < 4; index += 1) {
      const prepared = prepareLocalRound(seven, fixedRng);
      expect(prepared.ok).toBe(true);
      if (!prepared.ok) {
        return;
      }
      seven = finishOpenRound(prepared.match);
    }
    const large = prepareLocalRound(seven, fixedRng);
    expect(large.ok).toBe(false);
    if (large.ok) {
      return;
    }
    expect(large.message).toBe(insufficientLocalPilesMessage);
    expect(large.match.status).toBe('finished');
    expect(large.match.rounds).toHaveLength(4);
  });
});
