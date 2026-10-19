import { beforeEach, describe, expect, it } from '@jest/globals';

import {
  commitLocalMatch,
  installLocalMatchStorage,
  restoreLocalMatch,
} from '../src/features/local/match/autosave';
import {
  activeMatchKey,
  activeMatchTempKey,
  readActiveMatch,
  type LocalMatchStorage,
} from '../src/features/local/match/storage';
import {
  holdLocalMatch,
  readLocalMatch,
} from '../src/features/local/match/viewing';
import type { LocalMatch } from '../src/features/local/rules/round';

const names: LocalMatch = {
  version: 1,
  status: 'preparing',
  phase: 'setup',
  players: [{ id: '1', name: 'Ana' }],
  piles: [],
  rounds: [],
};

const played: LocalMatch = {
  version: 1,
  status: 'preparing',
  phase: 'recording',
  players: [
    { id: '1', name: 'Ana' },
    { id: '2', name: 'Luis' },
  ],
  piles: [{ number: 4, copies: [1, 2, 3], text: 'En la mesa' }],
  rounds: [
    {
      number: 1,
      status: 'voting',
      piles: [4],
      hands: [
        { playerId: '1', number: 4, copy: 1 },
        { playerId: '2', number: 4, copy: 2 },
      ],
      discard: [{ number: 4, copy: 3 }],
      drafts: [{ playerId: '1', gesture: 'fist', targets: [] }],
      awards: [
        { playerId: '1', points: 2 },
        { playerId: '2', points: 0 },
      ],
    },
  ],
};

function memoryStorage(): LocalMatchStorage & {
  raw(key: string): string | null;
  failNextTempWrite(): void;
  writes(): number;
} {
  const items = new Map<string, string>();
  let failTempWrite = false;
  let writes = 0;
  return {
    raw: (key) => items.get(key) ?? null,
    failNextTempWrite: () => {
      failTempWrite = true;
    },
    writes: () => writes,
    getItem: async (key) => items.get(key) ?? null,
    setItem: async (key, value) => {
      if (failTempWrite && key === activeMatchTempKey) {
        failTempWrite = false;
        throw new Error('escritura');
      }
      writes += 1;
      items.set(key, value);
    },
    removeItem: async (key) => {
      items.delete(key);
    },
  };
}

describe('guardado automático de la partida presencial', () => {
  let storage: ReturnType<typeof memoryStorage>;

  beforeEach(() => {
    storage = memoryStorage();
    installLocalMatchStorage(storage);
    holdLocalMatch(null);
  });

  it('dos guardados seguidos dejan el documento más nuevo', async () => {
    expect(await commitLocalMatch(names)).toEqual({ ok: true });
    expect(await commitLocalMatch(played)).toEqual({ ok: true });

    expect(await readActiveMatch(storage)).toEqual({ ok: true, match: played });
    expect(readLocalMatch()).toEqual(played);
    const round = played.rounds[0];
    expect(round?.piles).toEqual([4]);
    expect(round?.hands).toEqual([
      { playerId: '1', number: 4, copy: 1 },
      { playerId: '2', number: 4, copy: 2 },
    ]);
    expect(round?.drafts).toEqual([
      { playerId: '1', gesture: 'fist', targets: [] },
    ]);
    expect(round?.awards).toEqual([
      { playerId: '1', points: 2 },
      { playerId: '2', points: 0 },
    ]);
    expect(storage.raw(activeMatchKey)).not.toContain('winners');
  });

  it('una escritura fallida no reemplaza el documento anterior', async () => {
    expect(await commitLocalMatch(names)).toEqual({ ok: true });
    storage.failNextTempWrite();

    expect(await commitLocalMatch(played)).toEqual({
      ok: false,
      reason: 'write',
    });
    expect(await readActiveMatch(storage)).toEqual({ ok: true, match: names });
    expect(readLocalMatch()).toEqual(names);

    expect(await commitLocalMatch(played)).toEqual({ ok: true });
    expect(await readActiveMatch(storage)).toEqual({ ok: true, match: played });
    expect(readLocalMatch()).toEqual(played);
  });

  it('una escritura lenta no deja su documento por encima del posterior', async () => {
    const items = new Map<string, string>();
    const activeWrites: string[] = [];
    let release: () => void = () => undefined;
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    let entered: () => void = () => undefined;
    const started = new Promise<void>((resolve) => {
      entered = resolve;
    });
    let holdNext = true;
    const slow: LocalMatchStorage = {
      getItem: async (key) => items.get(key) ?? null,
      setItem: async (key, value) => {
        if (holdNext) {
          holdNext = false;
          entered();
          await gate;
        }
        if (key === activeMatchKey) {
          activeWrites.push(value);
        }
        items.set(key, value);
      },
      removeItem: async (key) => {
        items.delete(key);
      },
    };
    installLocalMatchStorage(slow);

    const first = commitLocalMatch(names);
    await started;
    const second = commitLocalMatch(played);
    release();

    expect(await first).toEqual({ ok: false, reason: 'write' });
    expect(await second).toEqual({ ok: true });
    expect(await readActiveMatch(slow)).toEqual({ ok: true, match: played });
    expect(readLocalMatch()).toEqual(played);
    expect(activeWrites.map((value) => JSON.parse(value))).toEqual([played]);
  });

  it('restaurar no vuelve a escribir', async () => {
    expect(await commitLocalMatch(played)).toEqual({ ok: true });
    const writes = storage.writes();
    const stored = storage.raw(activeMatchKey);

    restoreLocalMatch(names);

    expect(storage.writes()).toBe(writes);
    expect(storage.raw(activeMatchKey)).toBe(stored);
    expect(readLocalMatch()).toEqual(names);
  });

  it('guardar o restaurar no repite ronda, voto ni puntos', async () => {
    expect(await commitLocalMatch(played)).toEqual({ ok: true });
    const stored = await readActiveMatch(storage);
    expect(stored).toEqual({ ok: true, match: played });
    if (!stored.ok || stored.match === null) {
      throw new Error('la partida guardada no está');
    }

    expect(await commitLocalMatch(stored.match)).toEqual({ ok: true });
    restoreLocalMatch(stored.match);

    const again = await readActiveMatch(storage);
    expect(again).toEqual({ ok: true, match: played });
    if (!again.ok || again.match === null) {
      throw new Error('la partida guardada no está');
    }
    expect(again.match.rounds).toHaveLength(1);
    expect(again.match.rounds[0]?.status).toBe('voting');
    expect(again.match.rounds[0]?.awards).toEqual([
      { playerId: '1', points: 2 },
      { playerId: '2', points: 0 },
    ]);
    expect(readLocalMatch()).toEqual(played);
  });
});
