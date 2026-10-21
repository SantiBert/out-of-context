import { describe, expect, it } from '@jest/globals';

import {
  localCardLabel,
  localCoveredCardInstruction,
  localHideCardLabel,
  localImpostorRoleLabel,
  localMatchTotalLabel,
  localRecordContinueLabel,
  localRecordCoverInstruction,
  localRecordListInstruction,
  localResultsCopy,
  localRoundHeading,
  localRoundPointsLabel,
  localStandingsLabel,
  localTeamRoleLabel,
  localTurnLabel,
  localVisibleCardInstruction,
  localVoteMissingLabel,
  localVoteRegisteredLabel,
  localWinnersLine,
  localWinnersNobodyLabel,
} from '../src/features/local/match/copy';

describe('textos de la partida presencial', () => {
  it('la carta cubierta pide pasar el teléfono a esa persona', () => {
    expect(localTurnLabel('Ana')).toBe('Turno de Ana');
    expect(localCoveredCardInstruction('Ana')).toBe('Pasa el teléfono a Ana');
  });

  it('la carta visible pide ocultarla antes de continuar', () => {
    expect(localVisibleCardInstruction).toBe(
      'Deslizá hacia abajo para ocultar la carta antes de continuar.',
    );
    expect(localHideCardLabel).toBe('Continuar');
  });

  it('la carga pide continuar antes de mostrar gestos anotados', () => {
    expect(localRecordCoverInstruction).toContain('continuar');
    expect(localRecordCoverInstruction).toContain('cartas');
    expect(localRecordContinueLabel).toBe('Continuar');
    expect(localRecordListInstruction).toBe(
      'Anotá el gesto que viste en la mesa.',
    );
    expect(localVoteRegisteredLabel).toBe('Registrado');
    expect(localVoteMissingLabel).toBe('Sin registro');
  });

  it('separa los puntos de la ronda del total de la partida', () => {
    expect(localRoundPointsLabel).toBe('Puntos de la ronda');
    expect(localMatchTotalLabel).toBe('Total de la partida');
    expect(localRoundPointsLabel).not.toBe(localMatchTotalLabel);
  });

  it('distingue el resultado de una ronda del marcador final', () => {
    expect(localResultsCopy(false)).toEqual({
      title: 'Resultados',
      message: 'Quedan pilas. Estos puntos ya quedaron guardados.',
    });
    expect(localResultsCopy(true)).toEqual({
      title: 'Marcador',
      message: 'La partida terminó.',
    });
  });

  it('nombra carta, roles, clasificación y ganadores', () => {
    expect(localRoundHeading(2)).toBe('Ronda 2');
    expect(localCardLabel(3)).toBe('Carta #3');
    expect(localTeamRoleLabel).toBe('Equipo');
    expect(localImpostorRoleLabel).toBe('Impostor');
    expect(localStandingsLabel).toBe('Clasificación');
    expect(localWinnersNobodyLabel).toBe('Ganadores: nadie');
    expect(localWinnersLine(['Ana', 'Luis'])).toBe('Ganadores: Ana, Luis');
    expect(localWinnersLine([])).toBe(localWinnersNobodyLabel);
  });
});
