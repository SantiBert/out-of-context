import { beforeEach, describe, expect, it } from '@jest/globals';

import { installLocalMatchStorage } from '../src/features/local/match/autosave';
import {
  localPhaseRoute,
  recoverActiveMatch,
} from '../src/features/local/match/resume';
import {
  activeMatchKey,
  activeMatchTempKey,
  type LocalMatchStorage,
} from '../src/features/local/match/storage';
import {
  holdLocalMatch,
  readLocalMatch,
} from '../src/features/local/match/viewing';
import type { LocalMatch } from '../src/features/local/rules/round';

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
  reads(): number;
  writes(): number;
  deletes(): number;
} {
  const items = new Map<string, string>();
  let reads = 0;
  let writes = 0;
  let deletes = 0;
  return {
    raw: (key) => items.get(key) ?? null,
    reads: () => reads,
    writes: () => writes,
    deletes: () => deletes,
    getItem: async (key) => {
      reads += 1;
      return items.get(key) ?? null;
    },
    setItem: async (key, value) => {
      writes += 1;
      items.set(key, value);
    },
    removeItem: async (key) => {
      deletes += 1;
      items.delete(key);
    },
  };
}

describe('reanudación de la partida al iniciar', () => {
  let storage: ReturnType<typeof memoryStorage>;

  beforeEach(() => {
    storage = memoryStorage();
    installLocalMatchStorage(storage);
    holdLocalMatch(null);
  });

  it('sin partida sigue en inicio y no escribe', async () => {
    expect(await recoverActiveMatch()).toEqual({ status: 'absent' });
    expect(readLocalMatch()).toBeNull();
    expect(storage.writes()).toBe(0);
    expect(storage.deletes()).toBe(0);
  });

  it('una partida válida restaura la fase y el progreso confirmado', async () => {
    await storage.setItem(activeMatchKey, JSON.stringify(played));
    const writes = storage.writes();

    expect(await recoverActiveMatch()).toEqual({
      status: 'ready',
      route: 'LocalRecord',
    });
    expect(readLocalMatch()).toEqual(played);
    expect(storage.writes()).toBe(writes);
    expect(storage.deletes()).toBe(0);
    expect(storage.raw(activeMatchKey)).toBe(JSON.stringify(played));
    const round = played.rounds[0];
    expect(round?.status).toBe('voting');
    expect(round?.piles).toEqual([4]);
    expect(round?.hands).toHaveLength(2);
    expect(round?.drafts).toEqual([
      { playerId: '1', gesture: 'fist', targets: [] },
    ]);
    expect(round?.awards).toEqual([
      { playerId: '1', points: 2 },
      { playerId: '2', points: 0 },
    ]);
    expect(localPhaseRoute('setup')).toBe('LocalSetup');
    expect(localPhaseRoute('viewing')).toBe('LocalCard');
    expect(localPhaseRoute('conversation')).toBe('LocalTable');
    expect(localPhaseRoute('results')).toBe('LocalResults');
    expect(localPhaseRoute('finished')).toBe('LocalResults');
  });

  it('un documento inválido no se borra ni se carga', async () => {
    await storage.setItem(activeMatchKey, '{');
    const stored = storage.raw(activeMatchKey);

    expect(await recoverActiveMatch()).toEqual({ status: 'unavailable' });
    expect(readLocalMatch()).toBeNull();
    expect(storage.raw(activeMatchKey)).toBe(stored);
    expect(storage.raw(activeMatchTempKey)).toBeNull();
    expect(storage.writes()).toBe(1);
    expect(storage.deletes()).toBe(0);
  });

  it('un fallo de lectura no borra el archivo', async () => {
    await storage.setItem(activeMatchKey, JSON.stringify(played));
    const stored = storage.raw(activeMatchKey);
    const failing: LocalMatchStorage = {
      getItem: async () => {
        throw new Error('lectura');
      },
      setItem: async () => {
        throw new Error('escritura');
      },
      removeItem: async () => {
        throw new Error('borrado');
      },
    };
    installLocalMatchStorage(failing);

    expect(await recoverActiveMatch()).toEqual({ status: 'unavailable' });
    expect(readLocalMatch()).toBeNull();
    expect(storage.raw(activeMatchKey)).toBe(stored);
    expect(storage.deletes()).toBe(0);
  });

  it('dos recuperaciones solapadas leen una sola vez', async () => {
    let release: () => void = () => undefined;
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    let reads = 0;
    const slow: LocalMatchStorage = {
      getItem: async () => {
        reads += 1;
        await gate;
        return null;
      },
      setItem: async () => undefined,
      removeItem: async () => undefined,
    };
    installLocalMatchStorage(slow);

    const first = recoverActiveMatch();
    const second = recoverActiveMatch();
    release();

    expect(await first).toEqual({ status: 'absent' });
    expect(await second).toEqual({ status: 'absent' });
    expect(reads).toBe(1);
    expect(readLocalMatch()).toBeNull();
  });
});
