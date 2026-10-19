import fs from 'fs';
import path from 'path';

import { describe, expect, it } from '@jest/globals';

import {
  commitLocalMatch,
  installLocalMatchStorage,
} from '../src/features/local/match/autosave';
import { recoverActiveMatch } from '../src/features/local/match/resume';
import {
  addPlayer,
  confirmPendingSetup,
  createSetupMatch,
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
  createLocalPiles,
  localDeckConfig,
  prepareLocalRound,
  type LocalMatch,
  type LocalRng,
  type LocalSituation,
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
  result: { ok: true; match: LocalMatch } | { ok: false },
): LocalMatch {
  expect(result.ok).toBe(true);
  if (!result.ok) {
    throw new Error('transición rechazada');
  }
  return result.match;
}

function localSourceFiles(dir: string): string[] {
  const files: string[] = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...localSourceFiles(full));
    } else if (entry.name.endsWith('.ts')) {
      files.push(full);
    }
  }
  return files;
}

describe('partida presencial sin backend', () => {
  it('recorre la partida y la restaura sin llamar a la red', async () => {
    let setup = createSetupMatch();
    for (const name of ['Ana', 'Luis', 'Nora', 'Otto']) {
      const added = addPlayer(setup, name);
      expect(added.ok).toBe(true);
      if (!added.ok) {
        return;
      }
      setup = added.match;
    }
    const confirmed = confirmPendingSetup(setup, false);
    expect(confirmed).toEqual({ entered: true, ok: true, match: setup });

    const config = localDeckConfig(setup.players.length);
    expect(config.ok).toBe(true);
    if (!config.ok) {
      return;
    }
    const situations: LocalSituation[] = Array.from(
      { length: config.config.pileCount },
      (_, index) => ({ number: index + 1, copies: [1, 2, 3] }),
    );
    let match: LocalMatch = taken(createLocalPiles(setup, situations));
    match = taken(prepareLocalRound(match, fixedRng));
    expect(match.phase).toBe('viewing');

    let pass = startLocalPass();
    for (let index = 0; index < match.players.length; index += 1) {
      pass = hideLocalCard(revealLocalCard(pass), match.players.length);
    }
    match = taken(closeLocalDeal(match, pass));
    expect(match.phase).toBe('conversation');
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
    expect(match.rounds[0]?.awards).toHaveLength(match.players.length);
    match = taken(settleLocalRound(match, roundNumber));

    const storage = memoryStorage();
    installLocalMatchStorage(storage);
    holdLocalMatch(null);
    expect(await commitLocalMatch(match)).toEqual({ ok: true });
    const saved = storage.raw(activeMatchKey);
    const restarted = memoryStorage();
    installLocalMatchStorage(restarted);
    holdLocalMatch(null);
    if (saved !== null) {
      await restarted.setItem(activeMatchKey, saved);
    }
    expect(await recoverActiveMatch()).toEqual({
      status: 'ready',
      route: 'LocalResults',
    });
    expect(readLocalMatch()).toEqual(match);
  });

  it('el código local no abre red y solo usa rooms para los nombres', () => {
    const root = path.join(__dirname, '../src/features/local');
    const sources = localSourceFiles(root).map((file) =>
      fs.readFileSync(file, 'utf8'),
    );
    const combined = sources.join('\n');
    expect(combined).not.toContain('fetch(');
    expect(combined).not.toContain('WebSocket');
    expect(combined).not.toContain('getApiBaseUrl');

    const setup = fs.readFileSync(path.join(root, 'match', 'setup.ts'), 'utf8');
    const serviceImports = setup.match(/from ['"][^'"]+['"]/g) ?? [];
    expect(
      serviceImports.filter(
        (item) =>
          item.includes('services/api') || item.includes('services/realtime'),
      ),
    ).toEqual(["from '../../../services/api/rooms'"]);
    expect(setup).toContain('cleanPlayerName');
    expect(setup).toContain('NameValidationError');
  });
});
