import type { LocalMatchStorage } from './storage';

type CachedRecovery<T> = {
  storage: LocalMatchStorage;
  result: Promise<T>;
};

let pending: CachedRecovery<unknown> | null = null;

export function resetLocalRecovery(): void {
  pending = null;
}

export function readRecoveryCache<T>(): CachedRecovery<T> | null {
  return pending as CachedRecovery<T> | null;
}

export function writeRecoveryCache<T>(next: CachedRecovery<T>): void {
  pending = next;
}
