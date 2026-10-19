import type { AppRoute } from '../../../navigation/routes';
import type { LocalMatch } from '../rules/round';
import { localEntryRoute, type LocalRecovery } from './resume';

/** Hay documento en memoria y se puede reanudar (no unavailable). */
export function canContinueLocal(
  match: LocalMatch | null,
  recovery: LocalRecovery | null,
): boolean {
  if (match === null) {
    return false;
  }
  if (recovery?.status === 'unavailable') {
    return false;
  }
  return localEntryRoute(match, recovery) !== null;
}

/** Sin documento activo y la entrada permite abrir Nombres. */
export function canStartLocal(
  match: LocalMatch | null,
  recovery: LocalRecovery | null,
): boolean {
  if (match !== null) {
    return false;
  }
  return localEntryRoute(match, recovery) === 'LocalSetup';
}

export function continueLocalRoute(
  match: LocalMatch | null,
  recovery: LocalRecovery | null,
): AppRoute | null {
  if (!canContinueLocal(match, recovery)) {
    return null;
  }
  return localEntryRoute(match, recovery);
}
