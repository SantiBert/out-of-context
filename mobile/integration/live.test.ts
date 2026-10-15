/**
 * @jest-environment node
 */
import { describe, expect, it } from '@jest/globals';

import {
  RoomRequestError,
  createRoom,
  fetchOwnCard,
  fetchRoundPhase,
  fetchScoreboard,
  joinRoom,
  startRoom,
} from '../src/services/api/rooms';
import { roomSocketUrl } from '../src/services/realtime/lobby';

const api = 'http://127.0.0.1:8000';

function snapshot(url: string): Promise<readonly string[]> {
  return new Promise((resolve, reject) => {
    const socket = new WebSocket(url);
    const timer = setTimeout(() => {
      socket.close();
      reject(new Error('El snapshot no llegó.'));
    }, 8000);
    socket.addEventListener('message', (event) => {
      const message = JSON.parse(String(event.data)) as {
        type?: string;
        payload?: { participants?: string[]; token?: string };
      };
      if (message.type === 'connection.error') {
        clearTimeout(timer);
        socket.close();
        reject(new Error('La conexión fue rechazada.'));
        return;
      }
      if (message.type !== 'room.snapshot') {
        return;
      }
      clearTimeout(timer);
      socket.close();
      if (message.payload !== undefined && 'token' in message.payload) {
        reject(new Error('El snapshot incluye el token.'));
        return;
      }
      resolve(message.payload?.participants ?? []);
    });
    socket.addEventListener('error', () => {
      clearTimeout(timer);
      reject(new Error('El socket no conectó.'));
    });
  });
}

describe('backend local', () => {
  it('recorre los contratos publicados y reconecta sin duplicar', async () => {
    process.env.EXPO_PUBLIC_API_URL = api;
    const created = await createRoom('Ana');
    for (const name of ['Luis', 'Nora', 'Otto']) {
      await joinRoom(created.code, name);
    }
    const started = await startRoom(created.code, created.token);
    expect(started.status).toBe('started');
    expect(started.participants).toEqual(['Ana', 'Luis', 'Nora', 'Otto']);

    await expect(
      fetchOwnCard(created.code, created.token),
    ).rejects.toMatchObject({ code: 'card_unavailable' });
    await expect(
      fetchRoundPhase(created.code, created.token),
    ).rejects.toMatchObject({ code: 'round_unavailable' });
    const board = await fetchScoreboard(created.code, created.token);
    expect(board.status).toBe('preparing');
    expect(board.standings.map((row) => row.name)).toEqual([
      'Ana',
      'Luis',
      'Nora',
      'Otto',
    ]);
    expect(board.winners).toBeUndefined();

    const stranger = await createRoom('Zoe');
    await expect(
      fetchScoreboard(created.code, stranger.token),
    ).rejects.toBeInstanceOf(RoomRequestError);
    await expect(
      fetchScoreboard(created.code, stranger.token),
    ).rejects.toMatchObject({ code: 'unauthorized' });
    await expect(fetchScoreboard('ZZZZZZ', 'algo')).rejects.toMatchObject({
      code: 'room_not_found',
    });

    const url = roomSocketUrl(api, created.code, created.token);
    const first = await snapshot(url);
    const second = await snapshot(url);
    expect(first).toEqual(['Ana', 'Luis', 'Nora', 'Otto']);
    expect(second).toEqual(first);
    expect(new Set(second).size).toBe(second.length);
    expect(JSON.stringify(second)).not.toContain('carta');
  }, 20000);
});
