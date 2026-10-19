import { describe, expect, it } from '@jest/globals';

import {
  activeMatchKey,
  activeMatchTempKey,
  deleteActiveMatch,
  readActiveMatch,
  saveActiveMatch,
  type LocalMatchStorage,
} from '../src/features/local/match/storage';
import type { LocalMatch } from '../src/features/local/rules/round';

const first: LocalMatch = {
  version: 1,
  status: 'preparing',
  phase: 'setup',
  players: [{ id: '1', name: 'Ana' }],
  piles: [{ number: 4, copies: [1, 2, 3], text: 'En la mesa' }],
  rounds: [],
};

const second: LocalMatch = {
  ...first,
  phase: 'results',
  rounds: [
    {
      number: 1,
      status: 'finished',
      piles: [4],
      hands: [{ playerId: '1', number: 4, copy: 1 }],
      discard: [{ number: 4, copy: 2 }],
      drafts: [{ playerId: '1', gesture: 'point', targets: [] }],
      awards: [{ playerId: '1', points: 1 }],
    },
  ],
};

function memoryStorage(): LocalMatchStorage & {
  raw(key: string): string | null;
  failTempWrite(): void;
  failRead(): void;
  failDelete(): void;
} {
  const items = new Map<string, string>();
  let tempWriteFails = false;
  let readFails = false;
  let deleteFails = false;
  return {
    raw: (key) => items.get(key) ?? null,
    failTempWrite: () => {
      tempWriteFails = true;
    },
    failRead: () => {
      readFails = true;
    },
    failDelete: () => {
      deleteFails = true;
    },
    getItem: async (key) => {
      if (readFails) {
        throw new Error('lectura');
      }
      return items.get(key) ?? null;
    },
    setItem: async (key, value) => {
      if (tempWriteFails && key === activeMatchTempKey) {
        throw new Error('escritura');
      }
      items.set(key, value);
    },
    removeItem: async (key) => {
      if (deleteFails) {
        throw new Error('borrado');
      }
      items.delete(key);
    },
  };
}

describe('persistencia de la partida activa', () => {
  it('guarda y lee el mismo documento', async () => {
    const storage = memoryStorage();
    expect(await saveActiveMatch(second, storage)).toEqual({ ok: true });
    expect(await readActiveMatch(storage)).toEqual({ ok: true, match: second });
    expect(storage.raw(activeMatchTempKey)).toBeNull();
  });

  it('reemplaza la partida activa y no deja otra', async () => {
    const storage = memoryStorage();
    expect(await saveActiveMatch(first, storage)).toEqual({ ok: true });
    expect(await saveActiveMatch(second, storage)).toEqual({ ok: true });
    expect(await readActiveMatch(storage)).toEqual({ ok: true, match: second });
    expect(storage.raw(activeMatchTempKey)).toBeNull();
    const stored = storage.raw(activeMatchKey);
    expect(stored).not.toContain('token');
    expect(stored).not.toContain('ooc.guest.session');
  });

  it('borrar deja la lectura en ausencia', async () => {
    const storage = memoryStorage();
    await saveActiveMatch(first, storage);
    expect(await deleteActiveMatch(storage)).toEqual({ ok: true });
    expect(await readActiveMatch(storage)).toEqual({ ok: true, match: null });
  });

  it('un fallo al escribir la clave temporal conserva la partida anterior', async () => {
    const storage = memoryStorage();
    await saveActiveMatch(first, storage);
    storage.failTempWrite();
    expect(await saveActiveMatch(second, storage)).toEqual({
      ok: false,
      reason: 'write',
    });
    expect(await readActiveMatch(storage)).toEqual({ ok: true, match: first });
  });

  it('un fallo de lectura no borra el documento', async () => {
    const storage = memoryStorage();
    await saveActiveMatch(first, storage);
    const stored = storage.raw(activeMatchKey);
    storage.failRead();
    expect(await readActiveMatch(storage)).toEqual({
      ok: false,
      reason: 'read',
    });
    expect(storage.raw(activeMatchKey)).toBe(stored);
  });

  it('un JSON ilegible o de otra versión no borra el documento', async () => {
    const storage = memoryStorage();
    await storage.setItem(activeMatchKey, '{');
    expect(await readActiveMatch(storage)).toEqual({
      ok: false,
      reason: 'invalid',
    });
    expect(storage.raw(activeMatchKey)).toBe('{');

    await storage.setItem(activeMatchKey, JSON.stringify({ version: 2 }));
    expect(await readActiveMatch(storage)).toEqual({
      ok: false,
      reason: 'version',
    });
    expect(storage.raw(activeMatchKey)).toBe(JSON.stringify({ version: 2 }));
  });

  it('un campo obligatorio ausente no se reemplaza por una partida vacía', async () => {
    const storage = memoryStorage();
    const broken = JSON.stringify({ ...second, players: undefined });
    await storage.setItem(activeMatchKey, broken);
    const read = await readActiveMatch(storage);
    expect(read).toEqual({ ok: false, reason: 'invalid' });
    expect(storage.raw(activeMatchKey)).toBe(broken);
    expect(JSON.stringify(read)).not.toContain('En la mesa');
  });

  it('una referencia fuera de la partida no se borra', async () => {
    const storage = memoryStorage();
    const outside = {
      ...second,
      rounds: [
        {
          ...second.rounds[0],
          hands: [{ playerId: 'ausente', number: 4, copy: 1 }],
          drafts: [{ playerId: '1', gesture: 'point', targets: ['ausente'] }],
        },
      ],
    };
    const encoded = JSON.stringify(outside);
    await storage.setItem(activeMatchKey, encoded);
    expect(await readActiveMatch(storage)).toEqual({
      ok: false,
      reason: 'invalid',
    });
    expect(storage.raw(activeMatchKey)).toBe(encoded);
    expect(storage.raw(activeMatchTempKey)).toBeNull();
  });

  it('otra versión no se migra a una partida jugable', async () => {
    const storage = memoryStorage();
    const encoded = JSON.stringify({ ...second, version: 2 });
    await storage.setItem(activeMatchKey, encoded);
    const read = await readActiveMatch(storage);
    expect(read).toEqual({ ok: false, reason: 'version' });
    expect(storage.raw(activeMatchKey)).toBe(encoded);
    expect(read).not.toEqual({ ok: true, match: { ...second, version: 1 } });
    expect(JSON.stringify(read)).not.toContain('Ana');
  });

  it('un fallo al borrar devuelve el error', async () => {
    const storage = memoryStorage();
    await saveActiveMatch(first, storage);
    storage.failDelete();
    expect(await deleteActiveMatch(storage)).toEqual({
      ok: false,
      reason: 'delete',
    });
    expect(storage.raw(activeMatchKey)).toBe(JSON.stringify(first));
  });
});
