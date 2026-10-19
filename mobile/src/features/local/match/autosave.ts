import { holdLocalMatch } from './viewing';
import { resetLocalRecovery } from './recoveryCache';
import {
  deleteActiveMatch,
  saveActiveMatch,
  type LocalMatchStorage,
  type MatchDelete,
  type MatchWrite,
} from './storage';
import type { LocalMatch } from '../rules/round';

// OOC-010 no define cuándo un cambio presencial queda confirmado.
// Se guarda el documento que la transición ya aceptó, no cada tecla ni el pase de la carta.

export const localMatchSaveError = 'No se pudo guardar la partida.';
export const localMatchAbandonError = 'No se pudo abandonar la partida.';

let generation = 0;
let tail: Promise<void> = Promise.resolve();
let storage: LocalMatchStorage = createMemoryStorage();

export function installLocalMatchStorage(next: LocalMatchStorage): void {
  storage = next;
  generation = 0;
  tail = Promise.resolve();
  resetLocalRecovery();
}

export function installedLocalMatchStorage(): LocalMatchStorage {
  return storage;
}

export function restoreLocalMatch(match: LocalMatch): void {
  holdLocalMatch(match);
}

export function commitLocalMatch(match: LocalMatch): Promise<MatchWrite> {
  const ticket = ++generation;
  return enqueue(async () => {
    if (ticket !== generation) {
      return { ok: false, reason: 'write' };
    }
    const saved = await saveActiveMatch(match, guardedStorage(ticket));
    if (saved.ok && ticket === generation) {
      holdLocalMatch(match);
      return { ok: true };
    }
    return { ok: false, reason: 'write' };
  });
}

export function abandonActiveLocalMatch(): Promise<MatchDelete> {
  const ticket = ++generation;
  return enqueue(async () => {
    if (ticket !== generation) {
      return { ok: false, reason: 'delete' };
    }
    const deleted = await deleteActiveMatch(guardedStorage(ticket));
    if (!deleted.ok || ticket !== generation) {
      return { ok: false, reason: 'delete' };
    }
    holdLocalMatch(null);
    resetLocalRecovery();
    return { ok: true };
  });
}

function enqueue<T>(task: () => Promise<T>): Promise<T> {
  const run = tail.then(task, task);
  tail = run.then(
    () => undefined,
    () => undefined,
  );
  return run;
}

function guardedStorage(ticket: number): LocalMatchStorage {
  return {
    getItem: (key) => storage.getItem(key),
    setItem: (key, value) => {
      if (ticket !== generation) {
        return Promise.reject(new Error('stale'));
      }
      return storage.setItem(key, value);
    },
    removeItem: (key) => {
      if (ticket !== generation) {
        return Promise.reject(new Error('stale'));
      }
      return storage.removeItem(key);
    },
  };
}

function createMemoryStorage(): LocalMatchStorage {
  const items = new Map<string, string>();
  return {
    async getItem(key) {
      return items.get(key) ?? null;
    },
    async setItem(key, value) {
      items.set(key, value);
    },
    async removeItem(key) {
      items.delete(key);
    },
  };
}
