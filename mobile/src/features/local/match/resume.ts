import type { AppRoute } from '../../../navigation/routes';
import { localResultView } from '../rules/reveal';
import type { LocalMatch } from '../rules/round';
import { localVoteSummary } from '../rules/vote';
import { installedLocalMatchStorage, restoreLocalMatch } from './autosave';
import {
  readRecoveryCache,
  resetLocalRecovery,
  writeRecoveryCache,
} from './recoveryCache';
import { readActiveMatch, type LocalMatchStorage } from './storage';
import { localCardView, resumedLocalPass } from './viewing';

export { resetLocalRecovery };

// OOC-010 no define la reanudación presencial ni una carta visible al cerrar.
// Con un documento aceptado se abre la fase guardada, y la pasada vuelve a empezar oculta.
// Volver a mostrar una carta ya oculta, la cubierta de la carga y descartar el archivo siguen pendientes.

export const localMatchResumeError = 'No se puede reanudar la partida.';

export type LocalRecoveryPresentation =
  | { phase: 'setup'; names: readonly string[] }
  | { phase: 'viewing'; playerName: string; covered: true }
  | { phase: 'conversation' }
  | {
      phase: 'recording';
      rows: readonly { name: string; action: string | null }[];
    }
  | {
      phase: 'results' | 'finished';
      rows: readonly {
        name: string;
        cardNumber: number;
        roundPoints: number;
        totalPoints: number;
      }[];
    };

export function localRecoveryPresentation(
  match: LocalMatch,
): LocalRecoveryPresentation {
  switch (match.phase) {
    case 'setup':
      return {
        phase: 'setup',
        names: match.players.map((player) => player.name),
      };
    case 'viewing':
      return coveredRecovery(match);
    case 'conversation':
      return { phase: 'conversation' };
    case 'recording':
      return {
        phase: 'recording',
        rows: recordedRows(match),
      };
    case 'results':
    case 'finished':
      return revealedRecovery(match);
  }
}

export type LocalRecovery =
  | { status: 'absent' }
  | { status: 'ready'; route: AppRoute }
  | { status: 'unavailable' };

export function localEntryRoute(
  match: LocalMatch | null,
  recovery: LocalRecovery | null,
): AppRoute | null {
  if (match !== null) {
    return localPhaseRoute(match.phase);
  }
  if (recovery?.status === 'absent') {
    return 'LocalSetup';
  }
  return null;
}

export function localPhaseRoute(phase: LocalMatch['phase']): AppRoute {
  switch (phase) {
    case 'setup':
      return 'LocalSetup';
    case 'viewing':
      return 'LocalCard';
    case 'conversation':
      return 'LocalTable';
    case 'recording':
      return 'LocalRecord';
    case 'results':
    case 'finished':
      return 'LocalResults';
  }
}

export function recoverActiveMatch(): Promise<LocalRecovery> {
  const current = installedLocalMatchStorage();
  const pending = readRecoveryCache<LocalRecovery>();
  if (pending?.storage === current) {
    return pending.result;
  }
  const result = openStoredMatch(current);
  writeRecoveryCache({ storage: current, result });
  return result;
}

async function openStoredMatch(
  storage: LocalMatchStorage,
): Promise<LocalRecovery> {
  const read = await readActiveMatch(storage);
  if (!read.ok || read.match === null) {
    return read.ok ? { status: 'absent' } : { status: 'unavailable' };
  }
  restoreLocalMatch(read.match);
  return { status: 'ready', route: localPhaseRoute(read.match.phase) };
}

function coveredRecovery(
  match: LocalMatch,
): Extract<LocalRecoveryPresentation, { phase: 'viewing' }> {
  const view = localCardView(match, resumedLocalPass());
  const playerName = view.kind === 'covered' ? view.playerName : '';
  return { phase: 'viewing', playerName, covered: true };
}

function recordedRows(
  match: LocalMatch,
): readonly { name: string; action: string | null }[] {
  const roundNumber = activeRoundNumber(match);
  if (roundNumber === undefined) {
    return [];
  }
  return localVoteSummary(match, roundNumber).map((row) => ({
    name: row.name,
    action: row.action,
  }));
}

function revealedRecovery(
  match: LocalMatch,
): Extract<LocalRecoveryPresentation, { phase: 'results' | 'finished' }> {
  const phase = match.phase === 'finished' ? 'finished' : 'results';
  const roundNumber = activeRoundNumber(match);
  if (roundNumber === undefined) {
    return { phase, rows: [] };
  }
  const view = localResultView(match, roundNumber);
  if (!view.ok) {
    return { phase, rows: [] };
  }
  return {
    phase,
    rows: view.rows.map((row) => ({
      name: row.name,
      cardNumber: row.cardNumber,
      roundPoints: row.roundPoints,
      totalPoints: row.totalPoints,
    })),
  };
}

function activeRoundNumber(match: LocalMatch): number | undefined {
  const open = match.rounds.find((round) => round.status !== 'finished');
  return (open ?? match.rounds[match.rounds.length - 1])?.number;
}
