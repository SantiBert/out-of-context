import { parseRoundResults, type RoundResult } from '../api/rooms';

export type RevealUpdate = {
  results: readonly RoundResult[] | null;
  number: number | null;
  reload: boolean;
};

export function replaceResults(next: readonly RoundResult[]): RoundResult[] {
  const byName = new Map<string, RoundResult>();
  for (const row of next) {
    byName.set(row.name, {
      name: row.name,
      card: { ...row.card },
      gesture: row.gesture,
      targets: [...row.targets],
      points: row.points,
      ...(row.recognizedBy ? { recognizedBy: [...row.recognizedBy] } : {}),
      ...(row.pointedBy ? { pointedBy: [...row.pointedBy] } : {}),
    });
  }
  return [...byName.values()];
}

export function applyReveal(
  current: readonly RoundResult[] | null,
  message: unknown,
): RevealUpdate {
  const keep = { results: current, number: null, reload: false };
  if (!isRecord(message) || typeof message.type !== 'string') {
    return keep;
  }
  if (message.type === 'round.phase_changed') {
    const payload = isRecord(message.payload) ? message.payload : {};
    return {
      results: current,
      number: typeof payload.number === 'number' ? payload.number : null,
      reload: payload.status === 'finished',
    };
  }
  if (message.type !== 'round.revealed') {
    return keep;
  }
  const payload = message.payload;
  if (!isRecord(payload) || typeof payload.number !== 'number') {
    return keep;
  }
  try {
    return {
      results: replaceResults(parseRoundResults(payload.results)),
      number: payload.number,
      reload: false,
    };
  } catch {
    return keep;
  }
}

export function mayContinue(results: readonly RoundResult[] | null): boolean {
  return results !== null;
}

export function roundFinished(status: string | undefined): boolean {
  return status === 'finished';
}

export function gameFinished(
  roomStatus: string | undefined,
  roundStatus: string | undefined,
): boolean {
  if (
    roundStatus === 'finished' ||
    roomStatus === 'started' ||
    roomStatus === 'waiting' ||
    roomStatus === undefined
  ) {
    return false;
  }
  return roomStatus === 'finished';
}

export function gestureText(gesture: string | null): string {
  if (gesture === null) {
    return 'Sin gesto';
  }
  if (gesture === 'point') {
    return 'Señalar';
  }
  if (gesture === 'fist') {
    return 'Puño';
  }
  if (gesture === 'v') {
    return 'Arriesgar';
  }
  return gesture;
}

export function explanation(row: RoundResult): {
  label: string;
  names: readonly string[];
} | null {
  if (row.recognizedBy) {
    return { label: 'Reconocido por', names: row.recognizedBy };
  }
  if (row.pointedBy) {
    return { label: 'Señalado por', names: row.pointedBy };
  }
  return null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}
