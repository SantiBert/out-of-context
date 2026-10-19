export const localSetupInstruction =
  'Anotá de 4 a 8 personas, en el orden en que van a mirar la carta. El teléfono se pasa de mano en mano.';

export const localEmptyCardInstruction =
  'La lista está guardada. Todavía no hay una carta para mirar.';

export const localMissingCardInstruction =
  'Todavía no hay una carta para mirar.';

export function localTurnLabel(playerName: string): string {
  return `Turno de ${playerName}`;
}

export function localCoveredCardInstruction(playerName: string): string {
  return `Pasá el teléfono a ${playerName}. Solo esa persona toca Ver carta.`;
}

export const localVisibleCardInstruction = 'Ocultá la carta antes de pasarlo.';

export const localHideCardLabel = 'Ocultar';

export const localCompleteCardInstruction =
  'Todos miraron su carta. La conversación es en la mesa.';

export const localTableInstruction =
  'Conversen en la mesa, sin mirar cartas en el teléfono. Cuando terminen, abrí la carga.';

export const localRecordCoverInstruction =
  'Los gestos ya anotados se ven al continuar. No se muestran cartas ni roles.';

export const localRecordContinueLabel = 'Continuar';

export const localRecordListInstruction =
  'Anotá el gesto que viste en la mesa.';

export const localVoteRegisteredLabel = 'Registrado';

export const localVoteMissingLabel = 'Sin registro';

export const localVoteCloseInstruction =
  'Revisá los gestos. Al cerrar se calculan los puntos.';

export const localRoundPointsLabel = 'Puntos de la ronda';

export const localMatchTotalLabel = 'Total de la partida';

export const localStandingsLabel = 'Clasificación';

export const localTeamRoleLabel = 'Equipo';

export const localImpostorRoleLabel = 'Impostor';

export const localWinnersNobodyLabel = 'Ganadores: nadie';

export function localRoundHeading(roundNumber: number): string {
  return `Ronda ${roundNumber}`;
}

export function localCardLabel(cardNumber: number): string {
  return `Carta #${cardNumber}`;
}

export function localWinnersLine(names: readonly string[]): string {
  if (names.length === 0) {
    return localWinnersNobodyLabel;
  }
  return `Ganadores: ${names.join(', ')}`;
}

export const localNextRoundLabel = 'Siguiente ronda';

export const localRestartLabel = 'Reiniciar partida';

export const localRestartTitle = 'Reiniciar partida';

export const localRestartMessage =
  'Se borra el progreso y se reparte otra vez con las mismas personas.';

export const localRestartConfirmLabel = 'Reiniciar';

export const localRestartCancelLabel = 'Cancelar';

export const localPlayAgainLabel = 'Volver a jugar';

export const localPlayAgainTitle = 'Volver a jugar';

export const localPlayAgainMessage =
  'Se reparte otra partida con las mismas personas. Los puntos y las rondas anteriores no se conservan.';

export const localPlayAgainConfirmLabel = 'Volver a jugar';

export const localPlayAgainCancelLabel = 'Cancelar';

export const localChangePlayersLabel = 'Cambiar jugadores';

export const localChangePlayersTitle = 'Cambiar jugadores';

export const localChangePlayersMessage =
  'Se cierra el marcador y se abren los nombres para editarlos. La partida terminada no se conserva.';

export const localChangePlayersConfirmLabel = 'Cambiar jugadores';

export const localChangePlayersCancelLabel = 'Cancelar';

export const localAbandonLabel = 'Abandonar partida';

export const localAbandonTitle = 'Abandonar partida';

export const localAbandonMessage =
  'Se borra esta partida. No se puede reanudar.';

export const localAbandonConfirmLabel = 'Abandonar';

export const localAbandonCancelLabel = 'Cancelar';

export function localResultsCopy(finished: boolean): {
  title: 'Resultados' | 'Marcador';
  message: string;
} {
  if (finished) {
    return { title: 'Marcador', message: 'La partida terminó.' };
  }
  return {
    title: 'Resultados',
    message: 'Quedan pilas. Estos puntos ya quedaron guardados.',
  };
}
