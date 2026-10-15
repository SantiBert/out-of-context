import { describe, expect, it } from '@jest/globals';

import {
  fetchConversationRound,
  parseConversationRound,
  type ConversationRound,
} from '../src/services/api/rooms';
import {
  applyConversationEvent,
  bastaCommand,
  mayCallBasta,
  mayRaiseHand,
  raiseHandCommand,
  type ConversationUpdate,
} from '../src/services/realtime/conversation';

const talking: ConversationRound = {
  number: 1,
  status: 'conversation',
  ready: ['Ana'],
  readyCount: 1,
};

function hand(name: string, readyCount: number): ConversationUpdate {
  return applyConversationEvent(talking, {
    type: 'round.hand_raised',
    payload: {
      code: 'AB23CD',
      number: 1,
      name,
      ready_count: readyCount,
      player_count: 4,
    },
  });
}

describe('manos de la conversación', () => {
  it('no duplica una mano repetida', () => {
    const raised = hand('Luis', 2);
    const repeated = applyConversationEvent(raised.round, {
      type: 'round.hand_raised',
      payload: {
        code: 'AB23CD',
        number: 1,
        name: 'Luis',
        ready_count: 2,
        player_count: 4,
      },
    });

    expect(raised.round?.ready).toEqual(['Ana', 'Luis']);
    expect(repeated.round?.ready).toEqual(['Ana', 'Luis']);
    expect(repeated.vote).toBe(false);
    expect(
      mayRaiseHand('conversation', repeated.round?.ready ?? [], 'Luis'),
    ).toBe(false);
    expect(
      mayRaiseHand('conversation', repeated.round?.ready ?? [], 'Nora'),
    ).toBe(true);
    expect(raiseHandCommand).toEqual({
      type: 'round.raise_hand',
      payload: {},
    });
  });

  it('un rechazo no abre la votación', () => {
    const rejected = applyConversationEvent(talking, {
      type: 'connection.error',
      payload: {
        code: 'not_ready',
        detail: 'Todavía no hay mayoría para cerrar la conversación.',
      },
    });

    expect(rejected.vote).toBe(false);
    expect(rejected.fatal).toBe(false);
    expect(rejected.round?.status).toBe('conversation');
    expect(rejected.notice).toBe(
      'Todavía no hay mayoría para cerrar la conversación.',
    );
    expect(mayCallBasta('conversation')).toBe(true);
    expect(mayCallBasta('voting')).toBe(false);
    expect(bastaCommand).toEqual({ type: 'round.basta', payload: {} });
  });

  it('pasa a votación solo con el cambio de fase y descarta las cartas', () => {
    const voting = applyConversationEvent(talking, {
      type: 'round.phase_changed',
      payload: {
        code: 'AB23CD',
        number: 1,
        status: 'voting',
        dealt_count: 4,
        discard_count: 8,
        text: 'No copiar esta carta',
      },
    });
    const stillTalking = applyConversationEvent(talking, {
      type: 'round.phase_changed',
      payload: { code: 'AB23CD', number: 1, status: 'conversation' },
    });
    const revealed = applyConversationEvent(talking, {
      type: 'round.revealed',
      payload: {
        code: 'AB23CD',
        number: 1,
        results: [{ name: 'Luis', card: { number: 9, text: 'Carta ajena' } }],
      },
    });

    expect(voting.vote).toBe(true);
    expect(voting.round?.status).toBe('voting');
    expect(voting.round?.ready).toEqual(['Ana']);
    expect(JSON.stringify(voting)).not.toContain('No copiar esta carta');
    expect(stillTalking.vote).toBe(false);
    expect(stillTalking.round?.status).toBe('conversation');
    expect(revealed.vote).toBe(false);
    expect(revealed.round).toBe(talking);
    expect(JSON.stringify(revealed)).not.toContain('Carta ajena');
  });

  it('el GET se queda con las manos y deja fuera las cartas', async () => {
    const parsed = parseConversationRound({
      number: 1,
      status: 'conversation',
      participant_ids: [4, 5],
      ready: ['Ana', 'Luis'],
      ready_count: 2,
      results: [{ card: { text: 'Carta ajena' } }],
    });

    expect(parsed).toEqual({
      number: 1,
      status: 'conversation',
      ready: ['Ana', 'Luis'],
      readyCount: 2,
    });
    expect(JSON.stringify(parsed)).not.toContain('Carta ajena');

    process.env.EXPO_PUBLIC_API_URL = 'http://10.0.2.2:8000';
    let seen = '';
    const loaded = await fetchConversationRound(
      'AB23CD',
      'token',
      async (url) => {
        seen = url;
        return {
          ok: true,
          status: 200,
          json: async () => ({
            number: 1,
            status: 'conversation',
            ready: ['Ana'],
            ready_count: 1,
            results: [{ card: { text: 'Carta ajena' } }],
          }),
        };
      },
    );

    expect(loaded.ready).toEqual(['Ana']);
    expect(seen).toContain('/api/rooms/AB23CD/round/?token=');
    expect(JSON.stringify(loaded)).not.toContain('Carta ajena');
  });
});
