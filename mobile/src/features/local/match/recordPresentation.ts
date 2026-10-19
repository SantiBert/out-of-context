import { localRoundHeading } from './copy';

export const recordScreenTitle = 'Carga';
export const recordPhaseLabel = 'Registro de gestos';
export const recordConfirmLabel = 'Confirmar';
export const recordCloseLabel = 'Cerrar';
export const recordOpenPlayerLabel = 'Abrir';
export const recordSaveVoteLabel = 'Guardar';
export const recordBackLabel = 'Volver';
export const recordResultsLabel = 'Resultados';
export const recordTargetsHeading = '¿A quién señaló?';

export function recordRoundHeading(roundNumber: number): string {
  return localRoundHeading(roundNumber);
}
