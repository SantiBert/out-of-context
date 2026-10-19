import { describe, expect, it } from '@jest/globals';

import {
  abandonActiveLocalMatch,
  commitLocalMatch,
  installLocalMatchStorage,
} from '../src/features/local/match/autosave';
import {
  localEntryRoute,
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

const guestKey = 'ooc.guest.session';

function memoryStorage(): LocalMatchStorage & {
  raw(key: string): string | null;
  failDelete(): void;
} {
  const items = new Map<string, string>();
  let deleteFails = false;
  return {
    raw: (key) => items.get(key) ?? null,
    failDelete: () => {
      deleteFails = true;
    },
    getItem: async (key) => items.get(key) ?? null,
    setItem: async (key, value) => {
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

function namedMatch(): LocalMatch {
  return {
    version: 1,
    status: 'preparing',
    phase: 'viewing',
    players: [
      { id: '1', name: 'Ana' },
      { id: '2', name: 'Luis' },
      { id: '3', name: 'Nora' },
      { id: '4', name: 'Otto' },
    ],
    piles: [{ number: 1, copies: [1, 2, 3], text: 'En la mesa' }],
    rounds: [
      {
        number: 1,
        status: 'conversation',
        piles: [1],
        hands: [
          { playerId: '1', number: 1, copy: 1 },
          { playerId: '2', number: 1, copy: 2 },
          { playerId: '3', number: 1, copy: 3 },
          { playerId: '4', number: 1, copy: 1 },
        ],
        discard: [],
        drafts: [],
      },
    ],
  };
}

describe('abandono de la partida presencial', () => {
  it('borra la partida, vacía la memoria y abre nombres de nuevo', async () => {
    const storage = memoryStorage();
    installLocalMatchStorage(storage);
    holdLocalMatch(null);
    const match = namedMatch();
    expect(await commitLocalMatch(match)).toEqual({ ok: true });
    expect(await recoverActiveMatch()).toEqual({
      status: 'ready',
      route: 'LocalCard',
    });
    expect(readLocalMatch()).toEqual(match);

    expect(await abandonActiveLocalMatch()).toEqual({ ok: true });
    expect(storage.raw(activeMatchKey)).toBeNull();
    expect(storage.raw(activeMatchTempKey)).toBeNull();
    expect(readLocalMatch()).toBeNull();
    expect(await recoverActiveMatch()).toEqual({ status: 'absent' });
    expect(localEntryRoute(null, { status: 'absent' })).toBe('LocalSetup');
  });

  it('tras una recuperación lista, abandonar deja la siguiente lectura ausente', async () => {
    const storage = memoryStorage();
    installLocalMatchStorage(storage);
    holdLocalMatch(null);
    expect(await commitLocalMatch(namedMatch())).toEqual({ ok: true });
    expect(await recoverActiveMatch()).toEqual({
      status: 'ready',
      route: 'LocalCard',
    });
    expect(await abandonActiveLocalMatch()).toEqual({ ok: true });
    const restarted = memoryStorage();
    installLocalMatchStorage(restarted);
    holdLocalMatch(null);
    expect(await recoverActiveMatch()).toEqual({ status: 'absent' });
    expect(readLocalMatch()).toBeNull();
    expect(localEntryRoute(readLocalMatch(), { status: 'absent' })).toBe(
      'LocalSetup',
    );
  });

  it('cancelar no modifica el documento guardado', async () => {
    const storage = memoryStorage();
    installLocalMatchStorage(storage);
    holdLocalMatch(null);
    const match = namedMatch();
    expect(await commitLocalMatch(match)).toEqual({ ok: true });
    const before = storage.raw(activeMatchKey);
    expect(before).not.toBeNull();
    expect(storage.raw(activeMatchKey)).toBe(before);
    expect(readLocalMatch()).toEqual(match);
  });

  it('no borra una clave ajena al presencial', async () => {
    const storage = memoryStorage();
    installLocalMatchStorage(storage);
    holdLocalMatch(null);
    await storage.setItem(guestKey, '{"token":"x"}');
    expect(await commitLocalMatch(namedMatch())).toEqual({ ok: true });
    expect(await abandonActiveLocalMatch()).toEqual({ ok: true });
    expect(storage.raw(guestKey)).toBe('{"token":"x"}');
    expect(storage.raw(activeMatchKey)).toBeNull();
  });

  it('un fallo al borrar deja la partida en memoria y en el almacenamiento', async () => {
    const storage = memoryStorage();
    installLocalMatchStorage(storage);
    holdLocalMatch(null);
    const match = namedMatch();
    expect(await commitLocalMatch(match)).toEqual({ ok: true });
    expect(await recoverActiveMatch()).toEqual({
      status: 'ready',
      route: 'LocalCard',
    });
    storage.failDelete();
    expect(await abandonActiveLocalMatch()).toEqual({
      ok: false,
      reason: 'delete',
    });
    expect(storage.raw(activeMatchKey)).toBe(JSON.stringify(match));
    expect(readLocalMatch()).toEqual(match);
    expect(await recoverActiveMatch()).toEqual({
      status: 'ready',
      route: 'LocalCard',
    });
  });
});
