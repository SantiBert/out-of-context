import { describe, expect, it } from '@jest/globals';

import {
  fetchScoreboard,
  invalidResponseMessage,
  parseScoreboard,
} from '../src/services/api/rooms';
import {
  applyScoreEvent,
  readScoreboard,
  replaceScoreboard,
  visibleWinners,
} from '../src/services/realtime/scoreboard';

const playing = {
  status: 'preparing',
  standings: [
    { name: 'Ana', points: 3 },
    { name: 'Luis', points: 1 },
    { name: 'Nora', points: 3 },
  ],
  winners: ['Nora', 'Ana'],
};

describe('marcador', () => {
  it('conserva el orden recibido y no muestra ganadores en curso', async () => {
    const board = readScoreboard(playing);
    const repeated = replaceScoreboard(board);

    expect(board.standings.map((row) => row.name)).toEqual([
      'Ana',
      'Luis',
      'Nora',
    ]);
    expect(repeated.standings.map((row) => row.points)).toEqual([3, 1, 3]);
    expect(visibleWinners(board)).toEqual([]);
    expect(
      applyScoreEvent({ type: 'round.revealed', payload: {} }).reload,
    ).toBe(true);

    process.env.EXPO_PUBLIC_API_URL = 'http://10.0.2.2:8000';
    let seen = '';
    const loaded = await fetchScoreboard('AB23CD', 'token', async (url) => {
      seen = url;
      return { ok: true, status: 200, json: async () => playing };
    });
    expect(seen).toContain('/api/rooms/AB23CD/score/?token=');
    expect(loaded.standings[0]).toEqual({ name: 'Ana', points: 3 });
  });

  it('muestra el empate solo cuando la partida terminó', () => {
    const finished = readScoreboard({ ...playing, status: 'finished' });

    expect(visibleWinners(finished)).toEqual(['Nora', 'Ana']);
    expect(finished.standings.map((row) => row.name)).toEqual([
      'Ana',
      'Luis',
      'Nora',
    ]);
  });

  it('no inventa un cero si falta el puntaje', () => {
    expect(() =>
      parseScoreboard({
        status: 'preparing',
        standings: [{ name: 'Ana' }],
      }),
    ).toThrow(invalidResponseMessage);
    expect(
      applyScoreEvent({
        type: 'round.phase_changed',
        payload: { status: 'conversation' },
      }).reload,
    ).toBe(false);
  });
});
