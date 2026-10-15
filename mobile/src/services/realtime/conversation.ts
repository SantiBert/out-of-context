import {
  parseConversationRound,
  roomErrorMessage,
  type ConversationRound,
} from '../api/rooms';
import { acceptReadyCount, acceptRoundStatus } from './connection';

export type ConversationUpdate = {
  round: ConversationRound | null;
  notice: string | null;
  fatal: boolean;
  vote: boolean;
  reload: boolean;
};

export const raiseHandCommand = {
  type: 'round.raise_hand',
  payload: {},
} as const;

export const bastaCommand = {
  type: 'round.basta',
  payload: {},
} as const;

export function mayRaiseHand(
  status: string | undefined,
  ready: readonly string[],
  name: string,
): boolean {
  return status === 'conversation' && !ready.includes(name);
}

export function mayCallBasta(status: string | undefined): boolean {
  return status === 'conversation';
}

export function applyConversationEvent(
  round: ConversationRound | null,
  message: unknown,
): ConversationUpdate {
  const keep = {
    round,
    notice: null,
    fatal: false,
    vote: false,
    reload: false,
  };
  if (!isRecord(message) || typeof message.type !== 'string') {
    return keep;
  }
  if (message.type === 'connection.error') {
    const payload = isRecord(message.payload) ? message.payload : {};
    const code = typeof payload.code === 'string' ? payload.code : '';
    const detail = typeof payload.detail === 'string' ? payload.detail : '';
    return {
      round,
      notice: roomErrorMessage(code, detail),
      fatal: code === 'unauthorized' || code === 'room_not_found',
      vote: false,
      reload: false,
    };
  }
  if (message.type === 'round.hand_raised') {
    return applyHand(round, message.payload);
  }
  if (message.type === 'round.phase_changed') {
    return applyPhase(round, message.payload);
  }
  return keep;
}

function applyHand(
  round: ConversationRound | null,
  payload: unknown,
): ConversationUpdate {
  const hand = readHand(payload);
  if (hand === null || round === null || round.number !== hand.number) {
    return {
      round,
      notice: null,
      fatal: false,
      vote: false,
      reload: hand !== null,
    };
  }
  if (!acceptReadyCount(round.readyCount, hand.readyCount)) {
    return {
      round,
      notice: null,
      fatal: false,
      vote: false,
      reload: false,
    };
  }
  if (round.ready.includes(hand.name)) {
    return {
      round: { ...round, readyCount: hand.readyCount },
      notice: null,
      fatal: false,
      vote: false,
      reload: false,
    };
  }
  return {
    round: {
      ...round,
      ready: [...round.ready, hand.name],
      readyCount: hand.readyCount,
    },
    notice: null,
    fatal: false,
    vote: false,
    reload: false,
  };
}

function applyPhase(
  round: ConversationRound | null,
  payload: unknown,
): ConversationUpdate {
  let next: ConversationRound;
  try {
    next = parseConversationRound({
      ...(isRecord(payload)
        ? { number: payload.number, status: payload.status }
        : {}),
      ready: round?.ready ?? [],
      ready_count: round?.readyCount ?? 0,
    });
  } catch {
    return {
      round,
      notice: null,
      fatal: false,
      vote: false,
      reload: false,
    };
  }
  const step = acceptRoundStatus(
    round === null ? null : { number: round.number, status: round.status },
    { number: next.number, status: next.status },
  );
  if (step === 'ignore') {
    return {
      round,
      notice: null,
      fatal: false,
      vote: false,
      reload: false,
    };
  }
  return {
    round:
      step === 'advance' && round !== null
        ? { ...round, status: next.status }
        : {
            number: next.number,
            status: next.status,
            ready: [],
            readyCount: 0,
          },
    notice: null,
    fatal: false,
    vote: next.status === 'voting',
    reload: step === 'replace',
  };
}

function readHand(
  payload: unknown,
): { number: number; name: string; readyCount: number } | null {
  if (!isRecord(payload)) {
    return null;
  }
  const { number, name } = payload;
  const readyCount = payload.ready_count;
  if (
    typeof number !== 'number' ||
    !Number.isInteger(number) ||
    typeof name !== 'string' ||
    name.length === 0 ||
    typeof readyCount !== 'number' ||
    !Number.isInteger(readyCount)
  ) {
    return null;
  }
  return { number, name, readyCount };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}
