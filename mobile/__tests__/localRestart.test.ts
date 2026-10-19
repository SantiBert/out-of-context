import { describe, expect, it } from '@jest/globals';

import { dealLocalMatch } from '../src/features/local/catalog/deal';
import { localCatalogSituations } from '../src/features/local/catalog/situations';
import {
  commitLocalMatch,
  installLocalMatchStorage,
} from '../src/features/local/match/autosave';
import { recoverActiveMatch } from '../src/features/local/match/resume';
import {
  localRestartNotStartedMessage,
  restartLocalMatch,
} from '../src/features/local/match/restart';
import { createSetupMatch } from '../src/features/local/match/setup';
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
  localPileCountMessage,
  type LocalMatch,
  type LocalRng,
} from '../src/features/local/rules/round';
import {
  closeLocalVote,
  confirmLocalVotes,
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

function memoryStorage(): LocalMatchStorage & {
  raw(key: string): string | null;
} {
  const items = new Map<string, string>();
  return {
    raw: (key) => items.get(key) ?? null,
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

function scoredMatch(): LocalMatch {
  let match = taken(
    dealLocalMatch(fourNamed(), localCatalogSituations(), fixedRng),
  );
  let pass = startLocalPass();
  for (let index = 0; index < match.players.length; index += 1) {
    pass = hideLocalCard(revealLocalCard(pass), match.players.length);
  }
  match = taken(closeLocalDeal(match, pass));
  match = taken(openLocalRecording(match));
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
  match = taken(settleLocalRound(match, roundNumber));
  expect(match.rounds[0]?.awards).toBeDefined();
  expect(match.rounds[0]?.drafts?.length).toBe(4);
  return match;
}

describe('reinicio de la partida presencial', () => {
  it('conserva jugadores y orden, y reparte otra partida sin puntos ni votos', () => {
    const previous = scoredMatch();
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
    expect(restarted.match.rounds[0]).toEqual(
      expect.objectContaining({
        number: 1,
        status: 'conversation',
        drafts: [],
      }),
    );
    expect(restarted.match.rounds[0]?.awards).toBeUndefined();
    expect(restarted.match.rounds[0]?.hands).toHaveLength(4);
    expect(restarted.match).not.toBe(previous);
  });

  it('una lista sin confirmar no cambia', () => {
    const setup = createSetupMatch();
    const withNames = {
      ...setup,
      players: [
        { id: '1', name: 'Ana' },
        { id: '2', name: 'Luis' },
        { id: '3', name: 'Nora' },
        { id: '4', name: 'Otto' },
      ],
    };
    const restarted = restartLocalMatch(
      withNames,
      localCatalogSituations(),
      fixedRng,
    );
    expect(restarted).toEqual({
      ok: false,
      match: withNames,
      message: localRestartNotStartedMessage,
    });
  });

  it('un catálogo corto deja la partida original', () => {
    const previous = scoredMatch();
    const short = localCatalogSituations().slice(0, 3);
    const restarted = restartLocalMatch(previous, short, fixedRng);
    expect(restarted).toEqual({
      ok: false,
      match: previous,
      message: localPileCountMessage(15),
    });
  });

  it('cancelar no modifica el documento guardado', async () => {
    const previous = scoredMatch();
    const storage = memoryStorage();
    installLocalMatchStorage(storage);
    holdLocalMatch(null);
    expect(await commitLocalMatch(previous)).toEqual({ ok: true });
    const before = storage.raw(activeMatchKey);
    expect(before).not.toBeNull();
    expect(readLocalMatch()?.rounds[0]?.awards).toBeDefined();
    expect(storage.raw(activeMatchKey)).toBe(before);
    expect(readLocalMatch()).toEqual(previous);
  });

  it('confirmar guarda la partida nueva y la recuperación la restaura', async () => {
    const previous = scoredMatch();
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
    const saved = storage.raw(activeMatchKey);
    const restartedStorage = memoryStorage();
    installLocalMatchStorage(restartedStorage);
    holdLocalMatch(null);
    if (saved === null) {
      throw new Error('no se guardó');
    }
    await restartedStorage.setItem(activeMatchKey, saved);
    expect(await recoverActiveMatch()).toEqual({
      status: 'ready',
      route: 'LocalCard',
    });
    const recovered = readLocalMatch();
    expect(recovered?.players).toEqual(previous.players);
    expect(recovered?.phase).toBe('viewing');
    expect(recovered?.rounds).toHaveLength(1);
    expect(recovered?.rounds[0]?.awards).toBeUndefined();
    expect(recovered?.piles).toHaveLength(15);
  });
});
