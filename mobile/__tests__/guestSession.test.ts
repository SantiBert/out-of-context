import { describe, expect, it } from '@jest/globals';

import {
  NAME_MAX_LENGTH,
  cleanPlayerName,
  cleanRoomCode,
  createRoom,
  emptyNameMessage,
  invalidResponseMessage,
  joinRoom,
  longNameMessage,
  parseRoomAccess,
  roomErrorMessage,
  unknownRoomErrorMessage,
} from '../src/services/api/rooms';
import { createSingleFlight } from '../src/services/api/singleFlight';
import {
  loadGuestSession,
  saveGuestSession,
  type SessionStorage,
} from '../src/services/session/guestSession';

function memoryStorage(): SessionStorage & { replace(value: string): void } {
  const items = new Map<string, string>();
  return {
    getItem: async (key) => items.get(key) ?? null,
    setItem: async (key, value) => {
      items.set(key, value);
    },
    replace: (value) => {
      const key = items.keys().next().value;
      if (key === undefined) {
        throw new Error('El almacén todavía no tiene una sesión.');
      }
      items.set(key, value);
    },
  };
}

const roomBody = {
  code: 'AB23CD',
  status: 'waiting',
  host: 'Ana',
  participants: ['Ana'],
  player_count: 1,
  accepting_members: true,
  can_start: false,
  token: 'secreto-de-prueba',
};

describe('nombre de invitado', () => {
  it('recorta el nombre y rechaza el vacío o el que supera 80', () => {
    expect(cleanPlayerName('  Ana  ')).toBe('Ana');
    expect(cleanPlayerName('a'.repeat(NAME_MAX_LENGTH))).toHaveLength(
      NAME_MAX_LENGTH,
    );
    expect(() => cleanPlayerName('   ')).toThrow(emptyNameMessage);
    expect(() => cleanPlayerName('a'.repeat(NAME_MAX_LENGTH + 1))).toThrow(
      longNameMessage,
    );
  });

  it('recorta el código y lo pasa a mayúsculas', () => {
    expect(cleanRoomCode('  ab23cd ')).toBe('AB23CD');
  });
});

describe('alta de sala', () => {
  it('rechaza una respuesta sin token', async () => {
    const withoutToken = { ...roomBody, token: undefined };
    expect(() => parseRoomAccess(withoutToken)).toThrow(invalidResponseMessage);

    process.env.EXPO_PUBLIC_API_URL = 'http://10.0.2.2:8000';
    const fetchImpl = async () => ({
      ok: true,
      status: 201,
      json: async () => withoutToken,
    });
    await expect(createRoom('Ana', fetchImpl)).rejects.toThrow(
      invalidResponseMessage,
    );
  });

  it('crea y se une enviando solo el nombre', async () => {
    process.env.EXPO_PUBLIC_API_URL = 'http://10.0.2.2:8000';
    const calls: { url: string; body: string }[] = [];
    const fetchImpl = async (url: string, init?: RequestInit) => {
      calls.push({ url, body: String(init?.body) });
      return {
        ok: true,
        status: 201,
        json: async () => roomBody,
      };
    };

    const created = await createRoom('  Ana  ', fetchImpl);
    const joined = await joinRoom(' ab23cd ', 'Ana', fetchImpl);

    expect(created.code).toBe('AB23CD');
    expect(joined.code).toBe('AB23CD');

    expect(calls[0]).toEqual({
      url: 'http://10.0.2.2:8000/api/rooms/',
      body: JSON.stringify({ name: 'Ana' }),
    });
    expect(calls[1]).toEqual({
      url: 'http://10.0.2.2:8000/api/rooms/AB23CD/members/',
      body: JSON.stringify({ name: 'Ana' }),
    });
    expect(calls[0]?.body.includes('player_id')).toBe(false);
  });

  it('conserva el código que devuelve unirse', async () => {
    process.env.EXPO_PUBLIC_API_URL = 'http://10.0.2.2:8000';
    const fetchImpl = async () => ({
      ok: true,
      status: 201,
      json: async () => ({
        ...roomBody,
        code: 'ZX98QW',
        participants: ['Ana', 'Luis'],
        player_count: 2,
      }),
    });

    await expect(joinRoom('ab23cd', 'Luis', fetchImpl)).resolves.toMatchObject({
      code: 'ZX98QW',
    });
  });

  it('muestra el detalle de los errores conocidos y uno genérico si no se reconocen', async () => {
    process.env.EXPO_PUBLIC_API_URL = 'http://127.0.0.1:8000';
    const respond =
      (status: number, code: string, detail: string) => async () => ({
        ok: false,
        status,
        json: async () => ({ code, detail }),
      });

    await expect(
      joinRoom(
        'AB23CD',
        'Ana',
        respond(404, 'room_not_found', 'No existe una sala con ese código.'),
      ),
    ).rejects.toThrow('No existe una sala con ese código.');
    await expect(
      joinRoom(
        'AB23CD',
        'Ana',
        respond(409, 'room_full', 'La sala ya tiene 8 participantes.'),
      ),
    ).rejects.toThrow('La sala ya tiene 8 participantes.');
    await expect(
      joinRoom('AB23CD', 'Ana', respond(500, 'teapot', 'traceback')),
    ).rejects.toThrow(unknownRoomErrorMessage);
    expect(roomErrorMessage('room_closed', '   ')).toBe(
      unknownRoomErrorMessage,
    );
  });

  it('no repite una solicitud que todavía no terminó', async () => {
    process.env.EXPO_PUBLIC_API_URL = 'http://10.0.2.2:8000';
    let calls = 0;
    let release: () => void = () => undefined;
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    const fetchImpl = async () => {
      calls += 1;
      await gate;
      return {
        ok: true,
        status: 201,
        json: async () => roomBody,
      };
    };
    const flight = createSingleFlight();
    const first = flight(() => createRoom('Ana', fetchImpl));
    const second = flight(() => createRoom('Ana', fetchImpl));
    release();

    await expect(first).resolves.toMatchObject({ code: 'AB23CD' });
    await expect(second).resolves.toBeUndefined();
    expect(calls).toBe(1);
  });
});

describe('sesión guardada', () => {
  it('lee el nombre, el código y el token del almacén simulado', async () => {
    const storage = memoryStorage();
    await saveGuestSession(
      { name: 'Ana', roomCode: 'AB23CD', token: 'secreto-de-prueba' },
      storage,
    );

    await expect(loadGuestSession(storage)).resolves.toEqual({
      name: 'Ana',
      roomCode: 'AB23CD',
      token: 'secreto-de-prueba',
    });
  });

  it('descarta una sesión guardada sin token', async () => {
    const storage = memoryStorage();
    await saveGuestSession(
      { name: 'Ana', roomCode: 'AB23CD', token: 'secreto-de-prueba' },
      storage,
    );
    storage.replace(JSON.stringify({ name: 'Ana', roomCode: 'AB23CD' }));

    await expect(loadGuestSession(storage)).resolves.toBeNull();
  });
});
