import {
  RoomRequestError,
  parseRoundPhase,
  type OwnCard,
  type RoundPhase,
} from '../api/rooms';
import { acceptRoundStatus } from './connection';

export type HeldCard = {
  roundNumber: number;
  card: OwnCard;
};

export type PhaseEffect =
  | { kind: 'ignore' }
  | {
      kind: 'update';
      phase: RoundPhase;
      held: HeldCard | null;
      reload: boolean;
    };

const visibleStatuses = new Set(['conversation', 'voting']);

export function retainCard(
  activeRound: number | null,
  loadedRound: number,
  card: OwnCard,
): HeldCard | null {
  if (activeRound === null || loadedRound !== activeRound) {
    return null;
  }
  return { roundNumber: loadedRound, card };
}

export function endVisualization(): null {
  return null;
}

export function mayOpenConversation(
  status: string | null | undefined,
): boolean {
  return status === 'conversation';
}

export function isMissingCard(error: unknown): boolean {
  return (
    error instanceof RoomRequestError &&
    (error.code === 'card_unavailable' || error.code === 'round_unavailable')
  );
}

export function applyPhaseEvent(
  phase: RoundPhase | null,
  held: HeldCard | null,
  message: unknown,
): PhaseEffect {
  if (!isRecord(message) || message.type !== 'round.phase_changed') {
    return { kind: 'ignore' };
  }
  let next: RoundPhase;
  try {
    next = parseRoundPhase(message.payload);
  } catch {
    return { kind: 'ignore' };
  }
  const step = acceptRoundStatus(
    phase === null ? null : { number: phase.number, status: phase.status },
    next,
  );
  if (step === 'ignore') {
    return { kind: 'ignore' };
  }
  const numberChanged = step === 'replace';
  const hidden = !visibleStatuses.has(next.status);
  const reload = numberChanged || hidden;
  if (reload || (held !== null && held.roundNumber !== next.number)) {
    return { kind: 'update', phase: next, held: null, reload: true };
  }
  return { kind: 'update', phase: next, held, reload: false };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}
