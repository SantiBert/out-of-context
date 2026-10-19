import type { LocalMatch } from '../rules/round';
import { localRoundHeading } from './copy';

export const conversationPhaseLabel = 'Conversación';
export const openRecordLabel = 'Abrir carga';
export const tableScreenTitle = 'Mesa';

export type TablePresentation = {
  roundHeading: string;
  phaseLabel: string;
  canOpenRecord: boolean;
};

export function tablePresentation(match: LocalMatch | null): TablePresentation {
  const round = match?.rounds.find((item) => item.status !== 'finished');
  return {
    roundHeading:
      round !== undefined
        ? localRoundHeading(round.number)
        : localRoundHeading(1),
    phaseLabel: conversationPhaseLabel,
    canOpenRecord: match?.phase === 'conversation',
  };
}
