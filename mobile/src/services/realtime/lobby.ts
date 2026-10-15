import {
  parseRoomState,
  unknownRoomErrorMessage,
  type RoomState,
} from '../api/rooms';

export type LobbyConnection = 'connecting' | 'live' | 'reconnecting' | 'error';

export const connectionLabel: Record<LobbyConnection, string> = {
  connecting: 'Conectando',
  live: 'En vivo',
  reconnecting: 'Reconectando',
  error: 'Sin conexión',
};

const roomEvents = new Set([
  'room.snapshot',
  'room.player_joined',
  'room.player_left',
  'room.state_changed',
  'game.started',
]);

export type RoomEventResult = {
  room: RoomState | null;
  fatal: { code: string; detail: string } | null;
  started: boolean;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

export function applyRoomEvent(
  current: RoomState | null,
  message: unknown,
): RoomEventResult {
  if (!isRecord(message) || typeof message.type !== 'string') {
    return { room: current, fatal: null, started: false };
  }
  if (message.type === 'connection.error') {
    const payload = isRecord(message.payload) ? message.payload : {};
    const code = typeof payload.code === 'string' ? payload.code : '';
    const detail =
      typeof payload.detail === 'string' && payload.detail
        ? payload.detail
        : unknownRoomErrorMessage;
    if (code === 'unauthorized' || code === 'room_not_found') {
      return { room: current, fatal: { code, detail }, started: false };
    }
    return { room: current, fatal: null, started: false };
  }
  if (!roomEvents.has(message.type)) {
    return { room: current, fatal: null, started: false };
  }
  try {
    return {
      room: parseRoomState(message.payload),
      fatal: null,
      started: message.type === 'game.started',
    };
  } catch {
    return { room: current, fatal: null, started: false };
  }
}

export function mayStart(viewerName: string, room: RoomState): boolean {
  return viewerName === room.host && room.canStart;
}

export function roomSocketUrl(
  baseUrl: string,
  code: string,
  token: string,
): string {
  const url = new URL(baseUrl);
  url.protocol = url.protocol === 'https:' ? 'wss:' : 'ws:';
  url.pathname = `/ws/rooms/${encodeURIComponent(code)}/`;
  url.search = `token=${encodeURIComponent(token)}`;
  return url.toString();
}
