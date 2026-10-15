import { parseScoreboard, type Scoreboard } from '../api/rooms';

export function replaceScoreboard(next: Scoreboard): Scoreboard {
  return {
    status: next.status,
    standings: next.standings.map((row) => ({
      name: row.name,
      points: row.points,
    })),
    ...(next.winners ? { winners: [...next.winners] } : {}),
  };
}

export function visibleWinners(board: Scoreboard): readonly string[] {
  if (board.status !== 'finished' || !board.winners) {
    return [];
  }
  return [...board.winners];
}

export function applyScoreEvent(message: unknown): { reload: boolean } {
  if (!isRecord(message) || typeof message.type !== 'string') {
    return { reload: false };
  }
  if (message.type === 'round.revealed') {
    return { reload: true };
  }
  if (message.type === 'round.phase_changed') {
    const payload = isRecord(message.payload) ? message.payload : {};
    return { reload: payload.status === 'finished' };
  }
  return { reload: false };
}

export function readScoreboard(value: unknown): Scoreboard {
  return replaceScoreboard(parseScoreboard(value));
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}
