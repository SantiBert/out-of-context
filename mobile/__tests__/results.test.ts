import { describe, expect, it } from '@jest/globals';

import {
  fetchRoundResults,
  parseRoundResults,
  type RoundResult,
} from '../src/services/api/rooms';
import {
  applyReveal,
  explanation,
  gameFinished,
  gestureText,
  mayContinue,
  replaceResults,
  roundFinished,
} from '../src/services/realtime/results';

const team: RoundResult = {
  name: 'Ana',
  card: { number: 4, text: 'En la fila del banco' },
  gesture: 'point',
  targets: ['Luis'],
  points: 1,
  recognizedBy: ['Luis'],
};

const impostor: RoundResult = {
  name: 'Otto',
  card: { number: 9, text: 'Una carta distinta' },
  gesture: null,
  targets: [],
  points: 0,
  pointedBy: ['Ana'],
};

function revealed(rows: readonly RoundResult[]) {
  return {
    type: 'round.revealed',
    payload: {
      code: 'AB23CD',
      number: 1,
      results: rows.map((row) => ({
        name: row.name,
        card: row.card,
        gesture: row.gesture,
        targets: row.targets,
        points: row.points,
        ...(row.recognizedBy ? { recognized_by: row.recognizedBy } : {}),
        ...(row.pointedBy ? { pointed_by: row.pointedBy } : {}),
        role: 'no mostrar',
      })),
    },
  };
}

describe('filas de la revelación', () => {
  it('muestra la carta, el gesto y una sola explicación', () => {
    const rows = parseRoundResults([
      {
        name: 'Ana',
        card: { number: 4, text: 'En la fila del banco' },
        gesture: 'point',
        targets: ['Luis'],
        points: 1,
        recognized_by: ['Luis'],
        role: 'equipo',
      },
      {
        name: 'Otto',
        card: { number: 9, text: 'Una carta distinta' },
        gesture: null,
        targets: [],
        points: 0,
        pointed_by: ['Ana'],
      },
    ]);

    expect(rows).toEqual([team, impostor]);
    expect(explanation(rows[0])).toEqual({
      label: 'Reconocido por',
      names: ['Luis'],
    });
    expect(explanation(rows[1])).toEqual({
      label: 'Señalado por',
      names: ['Ana'],
    });
    expect(gestureText(null)).toBe('Sin gesto');
    expect(JSON.stringify(rows)).not.toContain('equipo');
    expect(JSON.stringify(rows)).not.toContain('role');
  });

  it('no muestra filas cuando los resultados no están', async () => {
    process.env.EXPO_PUBLIC_API_URL = 'http://10.0.2.2:8000';
    const missing = fetchRoundResults('AB23CD', 'token', async (url) => {
      expect(url).toContain('/api/rooms/AB23CD/results/?token=');
      return {
        ok: false,
        status: 409,
        json: async () => ({
          code: 'results_unavailable',
          detail: 'Los resultados todavía no están disponibles.',
        }),
      };
    });

    await expect(missing).rejects.toMatchObject({
      code: 'results_unavailable',
      message: 'Los resultados todavía no están disponibles.',
    });
    expect(mayContinue(null)).toBe(false);
  });
});

describe('cierre de la ronda', () => {
  it('un evento repetido no duplica filas ni puntos', () => {
    const first = applyReveal(null, revealed([team]));
    const repeated = applyReveal(first.results, revealed([team]));
    const replaced = replaceResults([team, team]);

    expect(first.results).toEqual([team]);
    expect(repeated.results).toEqual([team]);
    expect(
      repeated.results?.reduce((total, row) => total + row.points, 0),
    ).toBe(1);
    expect(replaced).toEqual([team]);
    expect(mayContinue(repeated.results)).toBe(true);
  });

  it('una ronda terminada no termina la partida', () => {
    expect(roundFinished('finished')).toBe(true);
    expect(roundFinished('voting')).toBe(false);
    expect(gameFinished('started', 'finished')).toBe(false);
    expect(gameFinished('waiting', 'finished')).toBe(false);
    expect(mayContinue(null)).toBe(false);
  });
});
