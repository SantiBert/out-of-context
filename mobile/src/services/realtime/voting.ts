import {
  parseVoteWindow,
  type VoteChoice,
  type VoteWindow,
} from '../api/rooms';
import { acceptRoundStatus } from './connection';

export type VoteUpdate = {
  window: VoteWindow | null;
  reveal: boolean;
  reload: boolean;
};

export function nextMark(
  current: number | null,
  incoming: number,
): number | null {
  if (!Number.isInteger(incoming)) {
    return current;
  }
  if (current === null || incoming <= current) {
    return incoming;
  }
  return current;
}

export function controlsLocked(
  window: VoteWindow | null,
  confirmed: boolean,
  roundRejected: boolean,
): boolean {
  if (confirmed || roundRejected || window === null) {
    return confirmed || roundRejected;
  }
  return window.voteMark === 0 || window.status !== 'voting';
}

export function canEdit(
  window: VoteWindow | null,
  confirmed: VoteChoice | null,
  unknown: VoteChoice | null,
  roundRejected: boolean,
): boolean {
  return (
    confirmed === null &&
    unknown === null &&
    !controlsLocked(window, false, roundRejected) &&
    window?.status === 'voting'
  );
}

export function confirmBallot(
  confirmed: VoteChoice | null,
  saved: VoteChoice,
): VoteChoice {
  return confirmed ?? saved;
}

export function doubtBallot(
  confirmed: VoteChoice | null,
  sent: VoteChoice,
): VoteChoice | null {
  if (confirmed !== null) {
    return null;
  }
  return sent;
}

export function pointTargets(
  participants: readonly string[],
  self: string,
  selected: readonly string[],
): string[] {
  const others = new Set(
    participants.filter((name) => name.length > 0 && name !== self),
  );
  const unique: string[] = [];
  for (const name of selected) {
    if (others.has(name) && !unique.includes(name)) {
      unique.push(name);
    }
  }
  return unique;
}

export function applyVoteEvent(
  window: VoteWindow | null,
  message: unknown,
): VoteUpdate {
  const keep = { window, reveal: false, reload: false };
  if (!isRecord(message) || typeof message.type !== 'string') {
    return keep;
  }
  if (message.type === 'round.countdown') {
    return applyCountdown(window, message.payload);
  }
  if (message.type === 'round.phase_changed') {
    return applyPhase(window, message.payload);
  }
  if (message.type === 'round.revealed') {
    return {
      window:
        window === null
          ? null
          : {
              ...window,
              status: 'finished',
            },
      reveal: true,
      reload: window === null,
    };
  }
  return keep;
}

function applyCountdown(
  window: VoteWindow | null,
  payload: unknown,
): VoteUpdate {
  if (!isRecord(payload) || typeof payload.mark !== 'number') {
    return { window, reveal: false, reload: false };
  }
  const number = payload.number;
  if (
    window === null ||
    typeof number !== 'number' ||
    number !== window.number
  ) {
    return { window, reveal: false, reload: true };
  }
  const voteMark = nextMark(window.voteMark, payload.mark);
  return {
    window: {
      ...window,
      voteMark,
      voteOpenedAt: stamp(payload.opened_at, window.voteOpenedAt),
      voteClosesAt: stamp(payload.closes_at, window.voteClosesAt),
    },
    reveal: false,
    reload: false,
  };
}

function applyPhase(window: VoteWindow | null, payload: unknown): VoteUpdate {
  let next: VoteWindow;
  try {
    next = parseVoteWindow({
      number: isRecord(payload) ? payload.number : undefined,
      status: isRecord(payload) ? payload.status : undefined,
      vote_mark: window?.voteMark ?? null,
      vote_opened_at: window?.voteOpenedAt ?? null,
      vote_closes_at: window?.voteClosesAt ?? null,
    });
  } catch {
    return { window, reveal: false, reload: false };
  }
  const step = acceptRoundStatus(
    window === null ? null : { number: window.number, status: window.status },
    { number: next.number, status: next.status },
  );
  if (step === 'ignore') {
    return { window, reveal: false, reload: false };
  }
  return {
    window:
      step === 'advance' && window !== null
        ? { ...window, status: next.status }
        : {
            number: next.number,
            status: next.status,
            voteMark: null,
            voteOpenedAt: null,
            voteClosesAt: null,
          },
    reveal: next.status === 'finished',
    reload: step === 'replace',
  };
}

function stamp(value: unknown, previous: string | null): string | null {
  if (typeof value === 'string' && value.length > 0) {
    return value;
  }
  if (value === null) {
    return null;
  }
  return previous;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}
