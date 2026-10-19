import { describe, expect, it } from '@jest/globals';

import { dealLocalMatch } from '../src/features/local/catalog/deal';
import { localCatalogSituations } from '../src/features/local/catalog/situations';
import {
  commitLocalMatch,
  installLocalMatchStorage,
} from '../src/features/local/match/autosave';
import { recoverActiveMatch } from '../src/features/local/match/resume';
import { restartLocalMatch } from '../src/features/local/match/restart';
import {
  createSetupMatch,
  localRosterMutable,
  reopenLocalSetup,
  startedLocalRosterMessage,
} from '../src/features/local/match/setup';
import {
  activeMatchKey,
  type LocalMatchStorage,
} from '../src/features/local/match/storage';
import {
  closeLocalDeal,
  hideLocalCard,
  holdLocalMatch,
  readLocalMatch,
  revealLocalCard,
  startLocalPass,
} from '../src/features/local/match/viewing';
import { settleLocalRound } from '../src/features/local/rules/board';
import { openLocalResults } from '../src/features/local/rules/reveal';
import {
  prepareLocalRound,
  type LocalMatch,
  type LocalRng,
} from '../src/features/local/rules/round';
import {
  closeLocalVote,
  confirmLocalVotes,
  openLocalRecording,
  saveLocalVote,
} from '../src/features/local/rules/vote';

const historyKey = 'ooc.local.history';

const fixedRng: LocalRng = {
  sample(items, count) {
    return items.slice(0, count);
  },
  shuffle(items) {
    return [...items].reverse();
  },
};

function memoryStorage(): LocalMatchStorage & {
  raw(key: string): string | null;
  keys(): string[];
} {
  const items = new Map<string, string>();
  return {
    raw: (key) => items.get(key) ?? null,
    keys: () => [...items.keys()],
    getItem: async (key) => items.get(key) ?? null,
    setItem: async (key, value) => {
      items.set(key, value);
    },
    removeItem: async (key) => {
      items.delete(key);
    },
  };
}

function taken(
  result: { ok: true; match: LocalMatch } | { ok: false; match: LocalMatch },
): LocalMatch {
  expect(result.ok).toBe(true);
  if (!result.ok) {
    throw new Error('transición rechazada');
  }
  return result.match;
}

function fourNamed(): LocalMatch {
  return {
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
}

function conceal(match: LocalMatch): LocalMatch {
  let pass = startLocalPass();
  for (let index = 0; index < match.players.length; index += 1) {
    pass = hideLocalCard(revealLocalCard(pass), match.players.length);
  }
  return taken(closeLocalDeal(match, pass));
}

function playOpenRound(match: LocalMatch): LocalMatch {
  let next = match;
  if (next.phase === 'viewing') {
    next = conceal(next);
  }
  if (next.phase === 'conversation') {
    next = taken(openLocalRecording(next));
  }
  const open = next.rounds.find((round) => round.status !== 'finished');
  if (open === undefined) {
    return next;
  }
  const roundNumber = open.number;
  for (const player of next.players) {
    next = taken(
      saveLocalVote(next, roundNumber, {
        playerId: player.id,
        gesture: 'fist',
        targets: [],
      }),
    );
  }
  next = taken(confirmLocalVotes(next, roundNumber));
  next = taken(closeLocalVote(next, roundNumber));
  next = taken(openLocalResults(next, roundNumber));
  return taken(settleLocalRound(next, roundNumber));
}

function finishedMatch(): LocalMatch {
  let match = taken(
    dealLocalMatch(fourNamed(), localCatalogSituations(), fixedRng),
  );
  for (let step = 0; step < 40 && match.status !== 'finished'; step += 1) {
    const open = match.rounds.find((round) => round.status !== 'finished');
    if (open === undefined) {
      match = taken(prepareLocalRound(match, fixedRng));
      continue;
    }
    match = playOpenRound(match);
  }
  expect(match.status).toBe('finished');
  expect(match.phase).toBe('finished');
  return match;
}

function midMatch(): LocalMatch {
  return taken(dealLocalMatch(fourNamed(), localCatalogSituations(), fixedRng));
}

describe('volver a jugar y cambiar jugadores', () => {
  it('desde el marcador reparte otra partida con los mismos nombres', () => {
    const previous = finishedMatch();
    const snapshot = JSON.stringify(previous);
    const restarted = restartLocalMatch(
      previous,
      localCatalogSituations(),
      fixedRng,
    );
    expect(restarted.ok).toBe(true);
    if (!restarted.ok) {
      return;
    }
    expect(JSON.stringify(previous)).toBe(snapshot);
    expect(restarted.match.players).toEqual(previous.players);
    expect(restarted.match.phase).toBe('viewing');
    expect(restarted.match.status).toBe('preparing');
    expect(restarted.match.piles).toHaveLength(15);
    expect(restarted.match.rounds).toHaveLength(1);
    expect(restarted.match.rounds[0]?.awards).toBeUndefined();
    expect(restarted.match.rounds[0]?.drafts).toEqual([]);
    expect(restarted.match.rounds[0]?.number).toBe(1);
    expect(restarted.match).not.toBe(previous);
  });

  it('cambiar jugadores desde el marcador abre un setup editable', () => {
    const previous = finishedMatch();
    const snapshot = JSON.stringify(previous);
    const reopened = reopenLocalSetup(previous);
    expect(reopened.ok).toBe(true);
    if (!reopened.ok) {
      return;
    }
    expect(JSON.stringify(previous)).toBe(snapshot);
    expect(reopened.match.players).toEqual(previous.players);
    expect(reopened.match.phase).toBe('setup');
    expect(reopened.match.status).toBe('preparing');
    expect(reopened.match.piles).toEqual([]);
    expect(reopened.match.rounds).toEqual([]);
    expect(localRosterMutable(reopened.match)).toBe(true);
  });

  it('no permite cambiar jugadores durante una partida activa', () => {
    const previous = midMatch();
    const reopened = reopenLocalSetup(previous);
    expect(reopened).toEqual({
      ok: false,
      match: previous,
      message: startedLocalRosterMessage,
    });
  });

  it('un setup ya editable se reabre sin cambios de fase', () => {
    const setup = {
      ...createSetupMatch(),
      players: fourNamed().players,
    };
    const reopened = reopenLocalSetup(setup);
    expect(reopened.ok).toBe(true);
    if (!reopened.ok) {
      return;
    }
    expect(reopened.match.players).toEqual(setup.players);
    expect(localRosterMutable(reopened.match)).toBe(true);
  });

  it('volver a jugar reemplaza el documento activo y la recuperación abre Carta', async () => {
    const previous = finishedMatch();
    const storage = memoryStorage();
    installLocalMatchStorage(storage);
    holdLocalMatch(null);
    expect(await commitLocalMatch(previous)).toEqual({ ok: true });
    const restarted = restartLocalMatch(
      previous,
      localCatalogSituations(),
      fixedRng,
    );
    expect(restarted.ok).toBe(true);
    if (!restarted.ok) {
      return;
    }
    expect(await commitLocalMatch(restarted.match)).toEqual({ ok: true });
    expect(storage.keys()).toEqual([activeMatchKey]);
    expect(storage.raw(historyKey)).toBeNull();

    const recoveredStorage = memoryStorage();
    installLocalMatchStorage(recoveredStorage);
    holdLocalMatch(null);
    const saved = storage.raw(activeMatchKey);
    if (saved === null) {
      throw new Error('no se guardó');
    }
    await recoveredStorage.setItem(activeMatchKey, saved);
    expect(await recoverActiveMatch()).toEqual({
      status: 'ready',
      route: 'LocalCard',
    });
    const recovered = readLocalMatch();
    expect(recovered?.players).toEqual(previous.players);
    expect(recovered?.phase).toBe('viewing');
    expect(recovered?.rounds[0]?.awards).toBeUndefined();
    expect(recoveredStorage.keys()).not.toContain(historyKey);
  });

  it('cambiar jugadores reemplaza el documento activo y la recuperación abre Nombres', async () => {
    const previous = finishedMatch();
    const storage = memoryStorage();
    installLocalMatchStorage(storage);
    holdLocalMatch(null);
    expect(await commitLocalMatch(previous)).toEqual({ ok: true });
    const reopened = reopenLocalSetup(previous);
    expect(reopened.ok).toBe(true);
    if (!reopened.ok) {
      return;
    }
    expect(await commitLocalMatch(reopened.match)).toEqual({ ok: true });
    expect(storage.keys()).toEqual([activeMatchKey]);
    expect(storage.raw(historyKey)).toBeNull();

    const recoveredStorage = memoryStorage();
    installLocalMatchStorage(recoveredStorage);
    holdLocalMatch(null);
    const saved = storage.raw(activeMatchKey);
    if (saved === null) {
      throw new Error('no se guardó');
    }
    await recoveredStorage.setItem(activeMatchKey, saved);
    expect(await recoverActiveMatch()).toEqual({
      status: 'ready',
      route: 'LocalSetup',
    });
    const recovered = readLocalMatch();
    expect(recovered?.players).toEqual(previous.players);
    expect(recovered?.phase).toBe('setup');
    expect(recovered?.piles).toEqual([]);
    expect(recovered?.rounds).toEqual([]);
    expect(recovered !== null && localRosterMutable(recovered)).toBe(true);
  });
});
