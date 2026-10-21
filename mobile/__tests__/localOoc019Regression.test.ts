import { describe, expect, it } from '@jest/globals';

import { dealLocalMatch } from '../src/features/local/catalog/deal';
import { localCatalogSituations } from '../src/features/local/catalog/situations';
import {
  abandonActiveLocalMatch,
  commitLocalMatch,
  installLocalMatchStorage,
} from '../src/features/local/match/autosave';
import { recoverActiveMatch } from '../src/features/local/match/resume';
import { restartLocalMatch } from '../src/features/local/match/restart';
import {
  addPlayer,
  createSetupMatch,
  localRosterMutable,
  maxLocalPlayers,
  removePlayer,
  renamePlayer,
  reopenLocalSetup,
  startedLocalRosterMessage,
  tooFewLocalPlayersMessage,
  validateSetup,
  type LocalSetupMatch,
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

function dealt(): LocalMatch {
  return taken(dealLocalMatch(fourNamed(), localCatalogSituations(), fixedRng));
}

function conceal(match: LocalMatch): LocalMatch {
  let pass = startLocalPass();
  for (let index = 0; index < match.players.length; index += 1) {
    pass = hideLocalCard(revealLocalCard(pass), match.players.length);
  }
  return taken(closeLocalDeal(match, pass));
}

function atConversation(): LocalMatch {
  return conceal(dealt());
}

function atRecording(): LocalMatch {
  return taken(openLocalRecording(atConversation()));
}

function atResults(): LocalMatch {
  let match = atRecording();
  const roundNumber = match.rounds[0]?.number ?? 1;
  for (const player of match.players) {
    match = taken(
      saveLocalVote(match, roundNumber, {
        playerId: player.id,
        gesture: 'fist',
        targets: [],
      }),
    );
  }
  match = taken(confirmLocalVotes(match, roundNumber));
  match = taken(closeLocalVote(match, roundNumber));
  match = taken(openLocalResults(match, roundNumber));
  return taken(settleLocalRound(match, roundNumber));
}

function finishedMatch(): LocalMatch {
  let match = dealt();
  for (let step = 0; step < 40 && match.status !== 'finished'; step += 1) {
    const open = match.rounds.find((round) => round.status !== 'finished');
    if (open === undefined) {
      match = taken(prepareLocalRound(match, fixedRng));
      continue;
    }
    if (match.phase === 'viewing') {
      match = conceal(match);
    }
    if (match.phase === 'conversation') {
      match = taken(openLocalRecording(match));
    }
    const round = match.rounds.find((item) => item.status !== 'finished');
    if (round === undefined) {
      continue;
    }
    for (const player of match.players) {
      match = taken(
        saveLocalVote(match, round.number, {
          playerId: player.id,
          gesture: 'fist',
          targets: [],
        }),
      );
    }
    match = taken(confirmLocalVotes(match, round.number));
    match = taken(closeLocalVote(match, round.number));
    match = taken(openLocalResults(match, round.number));
    match = taken(settleLocalRound(match, round.number));
  }
  expect(match.status).toBe('finished');
  return match;
}

function expectFreshRestart(previous: LocalMatch, phase: string) {
  expect(previous.phase).toBe(phase);
  expect(localRosterMutable(previous)).toBe(false);
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
  expect(restarted.match.rounds).toHaveLength(1);
  expect(restarted.match.rounds[0]?.awards).toBeUndefined();
  expect(restarted.match.rounds[0]?.drafts).toEqual([]);
  expect(restarted.match.rounds[0]?.number).toBe(1);
  expect(restarted.match.piles.length).toBeGreaterThan(0);
}

describe('regresión OOC-019', () => {
  it('crea partida con 4, edita roster, valida 4–8 y bloquea tras el reparto', () => {
    function setupTaken(
      result:
        { ok: true; match: LocalSetupMatch } | { ok: false; match: LocalMatch },
    ): LocalSetupMatch {
      expect(result.ok).toBe(true);
      if (!result.ok) {
        throw new Error('transición rechazada');
      }
      return result.match;
    }

    let setup = createSetupMatch();
    for (const name of ['Ana', 'Luis', 'Nora', 'Otto', 'Pia']) {
      setup = setupTaken(addPlayer(setup, name));
    }
    expect(setup.players).toHaveLength(5);
    expect(validateSetup(setup)).toEqual({ ok: true });

    setup = setupTaken(renamePlayer(setup, '2', 'Lucas'));
    expect(setup.players[1]?.name).toBe('Lucas');
    expect(removePlayer(setup, '4').ok).toBe(true);
    setup = setupTaken(removePlayer(setup, '5'));
    expect(setup.players).toHaveLength(4);
    expect(validateSetup(setup)).toEqual({ ok: true });
    expect(removePlayer(setup, '1')).toEqual({
      ok: false,
      match: setup,
      message: tooFewLocalPlayersMessage,
    });
    setup = setupTaken(addPlayer(setup, 'Pia'));
    expect(setup.players).toHaveLength(5);

    let full = setup;
    while (full.players.length < maxLocalPlayers) {
      full = setupTaken(addPlayer(full, `J${full.players.length + 1}`));
    }
    expect(full.players).toHaveLength(maxLocalPlayers);
    expect(addPlayer(full, 'Extra').ok).toBe(false);

    const started = taken(
      dealLocalMatch(full, localCatalogSituations(), fixedRng),
    );
    expect(localRosterMutable(started)).toBe(false);
    expect(addPlayer(started, 'Zeta')).toEqual({
      ok: false,
      match: started,
      message: startedLocalRosterMessage,
    });
  });

  it('reinicia durante viewing conservando jugadores y borrando progreso', () => {
    expectFreshRestart(dealt(), 'viewing');
  });

  it('reinicia durante conversation conservando jugadores y borrando progreso', () => {
    expectFreshRestart(atConversation(), 'conversation');
  });

  it('reinicia durante recording conservando jugadores y borrando progreso', () => {
    expectFreshRestart(atRecording(), 'recording');
  });

  it('reinicia durante results conservando jugadores y borrando progreso', () => {
    expectFreshRestart(atResults(), 'results');
  });

  it('cancelar no escribe: el documento guardado queda igual', async () => {
    const previous = atResults();
    const storage = memoryStorage();
    installLocalMatchStorage(storage);
    holdLocalMatch(null);
    expect(await commitLocalMatch(previous)).toEqual({ ok: true });
    const before = storage.raw(activeMatchKey);
    expect(before).toBe(JSON.stringify(previous));
    expect(storage.raw(activeMatchKey)).toBe(before);
    expect(readLocalMatch()).toEqual(previous);
  });

  it('abandonar limpia el estado activo sin historial', async () => {
    const previous = dealt();
    const storage = memoryStorage();
    installLocalMatchStorage(storage);
    holdLocalMatch(null);
    expect(await commitLocalMatch(previous)).toEqual({ ok: true });
    expect(await abandonActiveLocalMatch()).toEqual({ ok: true });
    expect(storage.raw(activeMatchKey)).toBeNull();
    expect(storage.keys()).not.toContain(historyKey);
    expect(readLocalMatch()).toBeNull();
    expect(await recoverActiveMatch()).toEqual({ status: 'absent' });
  });

  it('finalizar, volver a jugar y cambiar jugadores no duplican partidas', async () => {
    const previous = finishedMatch();
    const storage = memoryStorage();
    installLocalMatchStorage(storage);
    holdLocalMatch(null);
    expect(await commitLocalMatch(previous)).toEqual({ ok: true });

    const again = restartLocalMatch(
      previous,
      localCatalogSituations(),
      fixedRng,
    );
    expect(again.ok).toBe(true);
    if (!again.ok) {
      return;
    }
    expect(await commitLocalMatch(again.match)).toEqual({ ok: true });
    expect(storage.keys()).toEqual([activeMatchKey]);
    expect(storage.raw(historyKey)).toBeNull();

    const reopened = reopenLocalSetup(previous);
    expect(reopened.ok).toBe(true);
    if (!reopened.ok) {
      return;
    }
    expect(await commitLocalMatch(reopened.match)).toEqual({ ok: true });
    expect(storage.keys()).toEqual([activeMatchKey]);
    expect(localRosterMutable(reopened.match)).toBe(true);
    expect(reopened.match.players).toEqual(previous.players);
  });
});
