import { describe, expect, it } from '@jest/globals';

import { localEntryRoute } from '../src/features/local/match/resume';
import {
  closeLocalDeal,
  hideLocalCard,
  localCardView,
  revealLocalCard,
  startLocalPass,
} from '../src/features/local/match/viewing';
import {
  localScoreboard,
  settleLocalRound,
} from '../src/features/local/rules/board';
import { openLocalResults } from '../src/features/local/rules/reveal';
import {
  createLocalPiles,
  localDeckConfig,
  prepareLocalRound,
  type LocalMatch,
  type LocalRng,
  type LocalSituation,
} from '../src/features/local/rules/round';
import { scoreLocalRound } from '../src/features/local/rules/score';
import {
  closeLocalVote,
  confirmLocalVotes,
  missingLocalVoteMessage,
  openLocalRecording,
  saveLocalVote,
} from '../src/features/local/rules/vote';

const fixedRng: LocalRng = {
  sample(items, count) {
    return items.slice(0, count);
  },
  shuffle(items) {
    return [...items].reverse();
  },
};

function situations(count: number): LocalSituation[] {
  return Array.from({ length: count }, (_, index) => ({
    number: index + 1,
    copies: [1, 2, 3],
  }));
}

function fourPlayers(): LocalMatch {
  const match: LocalMatch = {
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
  const config = localDeckConfig(match.players.length);
  expect(config.ok).toBe(true);
  if (!config.ok) {
    return match;
  }
  const created = createLocalPiles(match, situations(config.config.pileCount));
  expect(created.ok).toBe(true);
  return created.match;
}

function playRound(match: LocalMatch): LocalMatch {
  const prepared = prepareLocalRound(match, fixedRng);
  expect(prepared.ok).toBe(true);
  if (!prepared.ok) {
    return match;
  }
  let current = prepared.match;
  const round = current.rounds[current.rounds.length - 1];
  expect(round?.piles).toHaveLength(3);
  expect(round?.hands).toHaveLength(4);
  expect(current.phase).toBe('viewing');

  let pass = startLocalPass();
  expect(localCardView(current, pass)).toEqual({
    kind: 'covered',
    playerName: 'Ana',
    nextPlayerName: 'Luis',
    canContinue: false,
    canGoBack: false,
  });
  for (let index = 0; index < current.players.length; index += 1) {
    const visible = revealLocalCard(pass);
    const shown = localCardView(current, visible);
    expect(shown.kind).toBe('visible');
    if (shown.kind === 'visible') {
      expect(shown.nextPlayerName).toBe(
        current.players[index + 1]?.name ?? null,
      );
    }
    pass = hideLocalCard(visible, current.players.length);
    const next = localCardView(current, pass);
    if (index < current.players.length - 1) {
      expect(next).toEqual({
        kind: 'covered',
        playerName: current.players[index + 1]?.name,
        nextPlayerName: current.players[index + 2]?.name ?? null,
        canContinue: false,
        canGoBack: true,
      });
      expect(next).not.toHaveProperty('number');
    } else {
      expect(next).toEqual({ kind: 'complete' });
    }
  }

  const table = closeLocalDeal(current, pass);
  expect(table.ok).toBe(true);
  if (!table.ok) {
    return current;
  }
  expect(table.match.phase).toBe('conversation');
  const recording = openLocalRecording(table.match);
  expect(recording.ok).toBe(true);
  if (!recording.ok || round === undefined) {
    return table.match;
  }
  current = recording.match;
  expect(confirmLocalVotes(current, round.number)).toEqual({
    ok: false,
    match: current,
    message: missingLocalVoteMessage,
  });
  for (const player of current.players) {
    const saved = saveLocalVote(current, round.number, {
      playerId: player.id,
      gesture: 'fist',
      targets: [],
    });
    expect(saved.ok).toBe(true);
    if (!saved.ok) {
      return current;
    }
    current = saved.match;
  }
  expect(confirmLocalVotes(current, round.number).ok).toBe(true);
  const closed = closeLocalVote(current, round.number);
  expect(closed.ok).toBe(true);
  if (!closed.ok) {
    return current;
  }
  const opened = openLocalResults(closed.match, round.number);
  expect(opened.ok).toBe(true);
  if (!opened.ok) {
    return closed.match;
  }
  const awards = opened.match.rounds.find(
    (item) => item.number === round.number,
  )?.awards;
  expect(awards).toHaveLength(4);
  const repeatedScore = scoreLocalRound(opened.match, round.number);
  expect(repeatedScore.ok).toBe(true);
  if (!repeatedScore.ok) {
    return opened.match;
  }
  expect(repeatedScore.match).toBe(opened.match);
  expect(
    repeatedScore.match.rounds.find((item) => item.number === round.number)
      ?.awards,
  ).toEqual(awards);

  const settled = settleLocalRound(opened.match, round.number);
  expect(settled.ok).toBe(true);
  if (!settled.ok) {
    return opened.match;
  }
  const repeatedSettle = settleLocalRound(settled.match, round.number);
  expect(repeatedSettle).toEqual({ ok: true, match: settled.match });
  return settled.match;
}

describe('flujo presencial de cuatro jugadores', () => {
  it('una partida guardada no vuelve a Nombres', () => {
    const saved: LocalMatch = {
      version: 1,
      status: 'preparing',
      phase: 'recording',
      players: [{ id: '1', name: 'Ana' }],
      piles: [],
      rounds: [],
    };
    expect(localEntryRoute(saved, { status: 'absent' })).toBe('LocalRecord');
    expect(localEntryRoute(null, { status: 'absent' })).toBe('LocalSetup');
    expect(localEntryRoute(null, null)).toBeNull();
    expect(localEntryRoute(null, { status: 'unavailable' })).toBeNull();
  });

  it('recorre el reparto, la mesa, los votos y el marcador sin duplicar puntos', () => {
    let match = fourPlayers();
    expect(match.piles).toHaveLength(15);
    match = playRound(match);
    expect(match.status).toBe('preparing');
    expect(localScoreboard(match).winners).toEqual([]);
    while (match.status !== 'finished') {
      match = playRound(match);
    }
    expect(match.phase).toBe('finished');
    expect(match.rounds).toHaveLength(5);
    const board = localScoreboard(match);
    expect(board.standings).toHaveLength(4);
    expect(board.winners.length).toBeGreaterThan(0);
    expect(match.rounds.every((round) => round.awards?.length === 4)).toBe(
      true,
    );
  });
});
