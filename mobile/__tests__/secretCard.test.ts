import { describe, expect, it } from '@jest/globals';

import {
  RoomRequestError,
  fetchOwnCard,
  fetchRoundPhase,
  invalidResponseMessage,
  parseOwnCard,
  parseRoundPhase,
} from '../src/services/api/rooms';
import {
  applyPhaseEvent,
  endVisualization,
  isMissingCard,
  mayOpenConversation,
  retainCard,
  type HeldCard,
} from '../src/services/realtime/secretCard';

const held: HeldCard = {
  roundNumber: 1,
  card: { number: 4, text: 'En la fila del banco' },
};

describe('carta propia', () => {
  it('lee el número y el texto de la carta', async () => {
    expect(parseOwnCard({ number: 12, text: 'En la fila del banco' })).toEqual({
      number: 12,
      text: 'En la fila del banco',
    });
    expect(() => parseOwnCard({ number: 1.5, text: 'En el banco' })).toThrow(
      invalidResponseMessage,
    );
    expect(() => parseOwnCard({ number: 1, text: '   ' })).toThrow(
      invalidResponseMessage,
    );

    process.env.EXPO_PUBLIC_API_URL = 'http://10.0.2.2:8000';
    let seen = '';
    const card = await fetchOwnCard('ab23cd', 'token secreto', async (url) => {
      seen = url;
      return {
        ok: true,
        status: 200,
        json: async () => ({ number: 12, text: 'En la fila del banco' }),
      };
    });

    expect(card).toEqual({ number: 12, text: 'En la fila del banco' });
    expect(seen).toBe(
      'http://10.0.2.2:8000/api/rooms/AB23CD/card/?token=token%20secreto',
    );
  });

  it('muestra el detalle de un error conocido', async () => {
    process.env.EXPO_PUBLIC_API_URL = 'http://10.0.2.2:8000';
    const failure = fetchOwnCard('AB23CD', 'ajeno', async () => ({
      ok: false,
      status: 401,
      json: async () => ({
        code: 'unauthorized',
        detail: 'La conexión no está autorizada.',
      }),
    }));

    await expect(failure).rejects.toBeInstanceOf(RoomRequestError);
    await expect(failure).rejects.toMatchObject({
      code: 'unauthorized',
      message: 'La conexión no está autorizada.',
    });
  });

  it('trata la carta ausente como ausencia y no inventa texto', async () => {
    process.env.EXPO_PUBLIC_API_URL = 'http://10.0.2.2:8000';
    const failure = fetchOwnCard('AB23CD', 'token', async () => ({
      ok: false,
      status: 404,
      json: async () => ({
        code: 'card_unavailable',
        detail: 'No hay una carta para este jugador.',
      }),
    }));

    await expect(failure).rejects.toMatchObject({
      code: 'card_unavailable',
      message: 'No hay una carta para este jugador.',
    });
    try {
      await failure;
    } catch (error) {
      expect(isMissingCard(error)).toBe(true);
      expect(endVisualization()).toBeNull();
    }
  });
});

describe('ronda de la carta', () => {
  it('conserva solo el número y el estado', async () => {
    const phase = parseRoundPhase({
      number: 2,
      status: 'finished',
      participant_ids: [1, 2],
      results: [
        {
          name: 'Luis',
          card: { number: 9, text: 'Carta ajena' },
        },
      ],
    });

    expect(phase).toEqual({ number: 2, status: 'finished' });
    expect(JSON.stringify(phase)).not.toContain('Carta ajena');

    process.env.EXPO_PUBLIC_API_URL = 'http://10.0.2.2:8000';
    let seen = '';
    const loaded = await fetchRoundPhase('AB23CD', 'token', async (url) => {
      seen = url;
      return {
        ok: true,
        status: 200,
        json: async () => ({
          number: 2,
          status: 'conversation',
          results: [{ card: { text: 'Carta ajena' } }],
        }),
      };
    });

    expect(loaded).toEqual({ number: 2, status: 'conversation' });
    expect(seen).toContain('/api/rooms/AB23CD/round/?token=');
    expect(JSON.stringify(loaded)).not.toContain('Carta ajena');
  });

  it('descarta la carta de una ronda anterior', () => {
    expect(retainCard(2, 1, held.card)).toBeNull();
    expect(retainCard(1, 1, held.card)).toEqual(held);

    const changed = applyPhaseEvent(
      { number: 1, status: 'conversation' },
      held,
      {
        type: 'round.phase_changed',
        payload: {
          number: 2,
          status: 'conversation',
          text: 'No copiar esta carta',
        },
      },
    );

    expect(changed).toEqual({
      kind: 'update',
      phase: { number: 2, status: 'conversation' },
      held: null,
      reload: true,
    });
    expect(JSON.stringify(changed)).not.toContain('No copiar esta carta');
  });

  it('ignora la revelación y solo abre la conversación en esa fase', () => {
    const revealed = applyPhaseEvent(
      { number: 1, status: 'conversation' },
      held,
      {
        type: 'round.revealed',
        payload: { number: 1, card: { text: 'Carta revelada' } },
      },
    );
    const voting = applyPhaseEvent(
      { number: 1, status: 'conversation' },
      held,
      {
        type: 'round.phase_changed',
        payload: { number: 1, status: 'voting', dealt_count: 4 },
      },
    );

    expect(revealed).toEqual({ kind: 'ignore' });
    expect(JSON.stringify(revealed)).not.toContain('Carta revelada');
    expect(voting).toEqual({
      kind: 'update',
      phase: { number: 1, status: 'voting' },
      held,
      reload: false,
    });
    expect(mayOpenConversation('conversation')).toBe(true);
    expect(mayOpenConversation('voting')).toBe(false);
    expect(mayOpenConversation('prepared')).toBe(false);
    expect(mayOpenConversation(null)).toBe(false);
  });
});
