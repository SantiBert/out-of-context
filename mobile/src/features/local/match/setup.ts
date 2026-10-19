import {
  NameValidationError,
  cleanPlayerName,
} from '../../../services/api/rooms';
import type { LocalMatch } from '../rules/round';

export const minLocalPlayers = 4;
export const maxLocalPlayers = 8;

export const duplicateLocalNameMessage = 'Ese nombre ya está en la partida.';
export const fullLocalMatchMessage = 'La partida ya tiene 8 jugadores.';
export const missingLocalPlayerMessage = 'Ese jugador no está en la partida.';
export const tooFewLocalPlayersMessage =
  'Con menos de 4 jugadores no se reparte.';
export const startedLocalRosterMessage =
  'La partida ya empezó. Los jugadores no se pueden cambiar.';

export type LocalPlayer = {
  id: string;
  name: string;
};

export type LocalSetupMatch = {
  version: 1;
  status: 'preparing';
  phase: 'setup';
  players: readonly LocalPlayer[];
  piles: readonly [];
  rounds: readonly [];
};

export type SetupChange =
  | { ok: true; match: LocalSetupMatch }
  | { ok: false; match: LocalMatch; message: string };

export function createSetupMatch(): LocalSetupMatch {
  return {
    version: 1,
    status: 'preparing',
    phase: 'setup',
    players: [],
    piles: [],
    rounds: [],
  };
}

export function localPlayerCountText(count: number): string {
  return count === 1 ? '1 jugador' : `${count} jugadores`;
}

export function localRosterMutable(match: LocalMatch): boolean {
  return (
    match.phase === 'setup' &&
    match.piles.length === 0 &&
    match.rounds.length === 0
  );
}

export function addPlayer(match: LocalMatch, rawName: string): SetupChange {
  const refused = refuseStartedRoster(match);
  if (refused) {
    return refused;
  }
  const cleaned = readName(rawName);
  if (!cleaned.ok) {
    return { ok: false, match, message: cleaned.message };
  }
  if (hasName(match.players, cleaned.name)) {
    return { ok: false, match, message: duplicateLocalNameMessage };
  }
  if (match.players.length >= maxLocalPlayers) {
    return { ok: false, match, message: fullLocalMatchMessage };
  }
  return {
    ok: true,
    match: setupDocument([
      ...match.players,
      { id: nextPlayerId(match.players), name: cleaned.name },
    ]),
  };
}

export function renamePlayer(
  match: LocalMatch,
  id: string,
  rawName: string,
): SetupChange {
  const refused = refuseStartedRoster(match);
  if (refused) {
    return refused;
  }
  const current = match.players.find((player) => player.id === id);
  if (!current) {
    return { ok: false, match, message: missingLocalPlayerMessage };
  }
  const cleaned = readName(rawName);
  if (!cleaned.ok) {
    return { ok: false, match, message: cleaned.message };
  }
  if (hasName(match.players, cleaned.name, id)) {
    return { ok: false, match, message: duplicateLocalNameMessage };
  }
  return {
    ok: true,
    match: setupDocument(
      match.players.map((player) =>
        player.id === id ? { ...player, name: cleaned.name } : player,
      ),
    ),
  };
}

export const readyLocalPlayersMessage =
  'La lista cumple el mínimo y el máximo. El reparto no está disponible.';

export function validateSetup(
  match: LocalSetupMatch,
): { ok: true } | { ok: false; message: string } {
  const seen = new Set<string>();
  for (const player of match.players) {
    const cleaned = readName(player.name);
    if (!cleaned.ok) {
      return cleaned;
    }
    if (seen.has(cleaned.name)) {
      return { ok: false, message: duplicateLocalNameMessage };
    }
    seen.add(cleaned.name);
  }
  if (match.players.length < minLocalPlayers) {
    return { ok: false, message: tooFewLocalPlayersMessage };
  }
  if (match.players.length > maxLocalPlayers) {
    return { ok: false, message: fullLocalMatchMessage };
  }
  return { ok: true };
}

export function initializeLocalMatch(match: LocalSetupMatch): SetupChange {
  const check = validateSetup(match);
  if (!check.ok) {
    return { ok: false, match, message: check.message };
  }
  return { ok: true, match };
}

export type SetupReview =
  | { reviewing: true; match: LocalSetupMatch }
  | { reviewing: false; match: LocalSetupMatch; message: string };

export function openSetupReview(match: LocalSetupMatch): SetupReview {
  const check = validateSetup(match);
  if (!check.ok) {
    return { reviewing: false, match, message: check.message };
  }
  return { reviewing: true, match };
}

export function returnToEdit(match: LocalSetupMatch): LocalSetupMatch {
  return match;
}

export function cancelSetupReview(match: LocalSetupMatch): LocalSetupMatch {
  return returnToEdit(match);
}

export function confirmSetupReview(match: LocalSetupMatch): SetupChange {
  return initializeLocalMatch(match);
}

export type PendingConfirmation =
  | { entered: false; match: LocalSetupMatch }
  | { entered: true; ok: true; match: LocalSetupMatch }
  | { entered: true; ok: false; match: LocalSetupMatch; message: string };

export function confirmPendingSetup(
  match: LocalSetupMatch,
  alreadyAccepted: boolean,
): PendingConfirmation {
  if (alreadyAccepted) {
    return { entered: false, match };
  }
  const result = confirmSetupReview(match);
  if (!result.ok) {
    return {
      entered: true,
      ok: false,
      match,
      message: result.message,
    };
  }
  return { entered: true, ok: true, match: result.match };
}

export function continueSetup(match: LocalSetupMatch): SetupChange {
  return initializeLocalMatch(match);
}

export function removePlayer(match: LocalMatch, id: string): SetupChange {
  const refused = refuseStartedRoster(match);
  if (refused) {
    return refused;
  }
  if (!match.players.some((player) => player.id === id)) {
    return { ok: true, match: setupDocument(match.players) };
  }
  return {
    ok: true,
    match: setupDocument(match.players.filter((player) => player.id !== id)),
  };
}

export function reopenLocalSetup(match: LocalMatch): SetupChange {
  if (localRosterMutable(match)) {
    return {
      ok: true,
      match: setupDocument(
        match.players.map((player) => ({
          id: player.id,
          name: player.name,
        })),
      ),
    };
  }
  if (match.status !== 'finished' && match.phase !== 'finished') {
    return { ok: false, match, message: startedLocalRosterMessage };
  }
  return {
    ok: true,
    match: setupDocument(
      match.players.map((player) => ({
        id: player.id,
        name: player.name,
      })),
    ),
  };
}

function refuseStartedRoster(match: LocalMatch): SetupChange | undefined {
  if (localRosterMutable(match)) {
    return undefined;
  }
  return { ok: false, match, message: startedLocalRosterMessage };
}

function setupDocument(players: readonly LocalPlayer[]): LocalSetupMatch {
  return {
    version: 1,
    status: 'preparing',
    phase: 'setup',
    players,
    piles: [],
    rounds: [],
  };
}

function readName(
  rawName: string,
): { ok: true; name: string } | { ok: false; message: string } {
  try {
    return { ok: true, name: cleanPlayerName(rawName) };
  } catch (error) {
    if (error instanceof NameValidationError) {
      return { ok: false, message: error.message };
    }
    throw error;
  }
}

function hasName(
  players: readonly LocalPlayer[],
  name: string,
  exceptId?: string,
): boolean {
  return players.some(
    (player) => player.name === name && player.id !== exceptId,
  );
}

function nextPlayerId(players: readonly LocalPlayer[]): string {
  const highest = players.reduce((max, player) => {
    const value = Number(player.id);
    return Number.isInteger(value) && value > max ? value : max;
  }, 0);
  return String(highest + 1);
}
