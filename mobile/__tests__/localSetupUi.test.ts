import { describe, expect, it } from '@jest/globals';

import { DashedButton } from '../src/components/DashedButton';
import { PlayerRosterRow } from '../src/components/PlayerRosterRow';
import {
  addPlayer,
  createSetupMatch,
  openSetupReview,
  renamePlayer,
  tooFewLocalPlayersMessage,
} from '../src/features/local/match/setup';
import {
  addPlayerLabel,
  continueSetupLabel,
  playerDisplayIndex,
  playersLimitsHelper,
  playersScreenTitle,
} from '../src/features/local/match/setupPresentation';

function withPlayers(...names: string[]) {
  return names.reduce((match, name) => {
    const result = addPlayer(match, name);
    if (!result.ok) {
      throw new Error(result.message);
    }
    return result.match;
  }, createSetupMatch());
}

describe('localSetup UI OOC-020.6', () => {
  it('expone copy de Jugadores y Continuar', () => {
    expect(playersScreenTitle).toBe('Jugadores');
    expect(addPlayerLabel).toBe('Añadir jugador');
    expect(continueSetupLabel).toBe('Continuar');
    expect(playersLimitsHelper).toContain('4');
    expect(playersLimitsHelper).toContain('8');
  });

  it('exporta filas y botón discontinuo', () => {
    expect(typeof PlayerRosterRow).toBe('function');
    expect(typeof DashedButton).toBe('function');
  });

  it('calcula índice visual 1-based sin cambiar ids al renombrar', () => {
    const match = withPlayers('Ana', 'Luis', 'Mia', 'Tom');
    const luis = match.players[1];
    expect(playerDisplayIndex(match.players, luis.id)).toBe(2);
    const renamed = renamePlayer(match, luis.id, 'Nora');
    expect(renamed.ok).toBe(true);
    if (!renamed.ok) {
      return;
    }
    expect(renamed.match.players.map((player) => player.id)).toEqual(
      match.players.map((player) => player.id),
    );
    expect(playerDisplayIndex(renamed.match.players, luis.id)).toBe(2);
  });

  it('Continuar usa la revisión existente y exige al menos 4', () => {
    const few = withPlayers('Ana', 'Luis', 'Mia');
    const blocked = openSetupReview(few);
    expect(blocked.reviewing).toBe(false);
    if (blocked.reviewing) {
      return;
    }
    expect(blocked.message).toBe(tooFewLocalPlayersMessage);

    const ready = withPlayers('Ana', 'Luis', 'Mia', 'Tom');
    const opened = openSetupReview(ready);
    expect(opened.reviewing).toBe(true);
  });
});
