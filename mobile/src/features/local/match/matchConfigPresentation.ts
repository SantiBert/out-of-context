import { localDeckConfig } from '../rules/round';
import { localPlayerCountText } from './setup';

export const matchConfigTitle = 'Antes de empezar';
export const matchConfigPlayersHeading = 'Jugadores';
export const matchConfigDealHeading = 'Reparto';
export const matchConfigRulesHeading = 'Cómo funciona';
export const startMatchLabel = 'Comenzar partida';
export const matchConfigBackLabel = 'Volver';
export const matchConfigUnavailable =
  'No hay una lista válida para comenzar. Volvé a Jugadores.';

export const matchConfigRulesBullets = [
  'Los equipos y los impostores salen de las cartas repartidas, no de un ajuste manual.',
  'Las rondas dependen de las pilas del mazo.',
  'La conversación es en la mesa; el teléfono no impone un temporizador en el MVP.',
] as const;

export type MatchConfigSummary = {
  playerCount: number;
  playerCountLabel: string;
  pileCountLabel: string;
  pilesPerRoundLabel: string;
  maxRoundsLabel: string;
};

export function matchConfigSummary(
  playerCount: number,
): MatchConfigSummary | null {
  const config = localDeckConfig(playerCount);
  if (!config.ok) {
    return null;
  }
  const { pileCount, pilesPerRound, maxRounds } = config.config;
  return {
    playerCount,
    playerCountLabel: localPlayerCountText(playerCount),
    pileCountLabel: `${pileCount} pilas en el mazo`,
    pilesPerRoundLabel: `${pilesPerRound} situaciones por ronda`,
    maxRoundsLabel: `Hasta ${maxRounds} rondas`,
  };
}
