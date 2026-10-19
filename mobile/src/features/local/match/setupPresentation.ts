import type { LocalPlayer } from './setup';
import { maxLocalPlayers, minLocalPlayers } from './setup';

export const playersScreenTitle = 'Jugadores';
export const playersLimitsHelper = `Entre ${minLocalPlayers} y ${maxLocalPlayers} jugadores para iniciar.`;
export const addPlayerLabel = 'Añadir jugador';
export const savePlayerLabel = 'Guardar';
export const continueSetupLabel = 'Continuar';
export const editPlayerLabel = 'Editar';
export const removePlayerLabel = 'Quitar';

/** Índice visual 1-based según el orden de la lista (no es el id estable). */
export function playerDisplayIndex(
  players: readonly LocalPlayer[],
  id: string,
): number {
  const index = players.findIndex((player) => player.id === id);
  return index < 0 ? 0 : index + 1;
}
