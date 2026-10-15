import { describe, expect, it } from '@jest/globals';

import { startRoom } from '../src/services/api/rooms';
import {
  applyRoomEvent,
  mayStart,
  roomSocketUrl,
  type RoomEventResult,
} from '../src/services/realtime/lobby';
import type { RoomState } from '../src/services/api/rooms';

const waiting: RoomState = {
  code: 'AB23CD',
  status: 'waiting',
  host: 'Ana',
  participants: ['Ana'],
  playerCount: 1,
  acceptingMembers: true,
  canStart: false,
};

function roomEvent(
  type: string,
  participants: readonly string[],
  extra: Record<string, unknown> = {},
): RoomEventResult {
  return applyRoomEvent(waiting, {
    type,
    payload: {
      code: 'AB23CD',
      status: extra.status ?? 'waiting',
      host: 'Ana',
      participants,
      player_count: participants.length,
      accepting_members: true,
      can_start: participants.length >= 4,
      ...extra,
    },
  });
}

describe('eventos del lobby', () => {
  it('reemplaza la lista y no duplica un alta repetida', () => {
    const joined = roomEvent('room.player_joined', ['Ana', 'Luis'], {
      name: 'Luis',
    });
    const repeated = applyRoomEvent(joined.room, {
      type: 'room.player_joined',
      payload: {
        code: 'AB23CD',
        status: 'waiting',
        host: 'Ana',
        name: 'Luis',
        participants: ['Ana', 'Luis'],
        player_count: 2,
        accepting_members: true,
        can_start: false,
      },
    });

    expect(joined.room?.participants).toEqual(['Ana', 'Luis']);
    expect(repeated.room?.participants).toEqual(['Ana', 'Luis']);
  });

  it('quita a quien sale y deja fuera las cartas', () => {
    const full = roomEvent('room.snapshot', ['Ana', 'Luis', 'Nora', 'Otto']);
    const left = applyRoomEvent(full.room, {
      type: 'room.player_left',
      payload: {
        code: 'AB23CD',
        status: 'waiting',
        host: 'Ana',
        name: 'Otto',
        participants: ['Ana', 'Luis', 'Nora'],
        player_count: 3,
        accepting_members: true,
        can_start: false,
      },
    });
    const revealed = applyRoomEvent(left.room, {
      type: 'round.revealed',
      payload: {
        code: 'AB23CD',
        number: 1,
        results: [{ name: 'Ana', card: { number: 1, text: 'secreta' } }],
      },
    });

    expect(left.room?.participants).toEqual(['Ana', 'Luis', 'Nora']);
    expect(revealed.room).toEqual(left.room);
    expect(JSON.stringify(revealed.room)).not.toContain('secreta');
  });

  it('marca el inicio y un cierre no autorizado', () => {
    const started = roomEvent('game.started', ['Ana', 'Luis', 'Nora', 'Otto'], {
      status: 'started',
      accepting_members: false,
      can_start: false,
    });
    const denied = applyRoomEvent(waiting, {
      type: 'connection.error',
      payload: {
        code: 'unauthorized',
        detail: 'La conexión no está autorizada.',
      },
    });

    expect(started.started).toBe(true);
    expect(started.room?.status).toBe('started');
    expect(denied.fatal?.code).toBe('unauthorized');
    expect(denied.started).toBe(false);
  });
});

describe('conexión y permiso de inicio', () => {
  it('solo el anfitrión con can_start puede iniciar', () => {
    const ready = { ...waiting, canStart: true, playerCount: 4 };
    expect(mayStart('Ana', ready)).toBe(true);
    expect(mayStart('Luis', ready)).toBe(false);
    expect(mayStart('Ana', waiting)).toBe(false);
  });

  it('rechaza el inicio de quien no es anfitrión', async () => {
    process.env.EXPO_PUBLIC_API_URL = 'http://10.0.2.2:8000';
    const fetchImpl = async () => ({
      ok: false,
      status: 403,
      json: async () => ({
        code: 'not_host',
        detail: 'Solo el anfitrión puede iniciar la partida.',
      }),
    });

    await expect(
      startRoom('AB23CD', 'token-de-luis', fetchImpl),
    ).rejects.toThrow('Solo el anfitrión puede iniciar la partida.');
  });

  it('arma el socket de la sala sin cambiar el protocolo', () => {
    expect(roomSocketUrl('http://10.0.2.2:8000', 'ab23cd', 'token uno')).toBe(
      'ws://10.0.2.2:8000/ws/rooms/ab23cd/?token=token%20uno',
    );
    expect(roomSocketUrl('https://api.example.test', 'AB23CD', 't')).toBe(
      'wss://api.example.test/ws/rooms/AB23CD/?token=t',
    );
  });
});
