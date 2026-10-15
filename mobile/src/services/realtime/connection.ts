export const reconnectDelaysMs = [1000, 2000, 4000] as const;

export const maxReconnects = reconnectDelaysMs.length;

export type CloseDecision =
  | { kind: 'retry'; delayMs: number; failures: number }
  | { kind: 'stop'; failures: number };

export type RecoverableAction =
  'read' | 'start' | 'raise_hand' | 'basta' | 'vote';

export type RoundCursor = {
  number: number;
  status: string;
};

export type RoundStep = 'ignore' | 'advance' | 'replace';

const roundRank: Record<string, number> = {
  prepared: 0,
  conversation: 1,
  voting: 2,
  finished: 3,
};

export function decideAfterClose(input: {
  opened: boolean;
  failures: number;
  fatal: boolean;
}): CloseDecision {
  if (input.fatal) {
    return { kind: 'stop', failures: input.failures };
  }
  const failures = input.opened ? 1 : input.failures + 1;
  if (failures > maxReconnects) {
    return { kind: 'stop', failures };
  }
  return {
    kind: 'retry',
    delayMs: reconnectDelaysMs[failures - 1],
    failures,
  };
}

export function acceptGeneration(active: number, incoming: number): boolean {
  return incoming === active;
}

export function acceptRoundStatus(
  current: RoundCursor | null,
  next: RoundCursor,
): RoundStep {
  const nextRank = roundRank[next.status];
  if (!Number.isInteger(next.number) || nextRank === undefined) {
    return 'ignore';
  }
  if (current === null || roundRank[current.status] === undefined) {
    return 'replace';
  }
  if (next.number > current.number) {
    return 'replace';
  }
  if (next.number < current.number) {
    return 'ignore';
  }
  if (nextRank < roundRank[current.status]) {
    return 'ignore';
  }
  return 'advance';
}

export function acceptReadyCount(current: number, incoming: number): boolean {
  return incoming >= current;
}

export function mayAutoRetry(action: RecoverableAction): boolean {
  return action === 'read';
}

export function automaticRetries(): readonly RecoverableAction[] {
  const actions: readonly RecoverableAction[] = [
    'read',
    'start',
    'raise_hand',
    'basta',
    'vote',
  ];
  return actions.filter(mayAutoRetry);
}

export function markBastaUncertain(pending: boolean, live: boolean): boolean {
  return pending && !live;
}
