import { describe, expect, it } from '@jest/globals';

import { applyConversationEvent } from '../src/services/realtime/conversation';
import {
  acceptGeneration,
  acceptRoundStatus,
  automaticRetries,
  decideAfterClose,
  markBastaUncertain,
  mayAutoRetry,
} from '../src/services/realtime/connection';
import { applyRoomEvent } from '../src/services/realtime/lobby';
import { nextMark } from '../src/services/realtime/voting';
import type { RoomState } from '../src/services/api/rooms';

const room: RoomState = {
  code: 'AB23CD',
  status: 'started',
  host: 'Ana',
  participants: ['Ana', 'Luis', 'Nora', 'Otto'],
  playerCount: 4,
  acceptingMembers: false,
  canStart: false,
};

describe('reintentos de la conexión', () => {
  it('espera 1, 2 y 4 segundos y se detiene al cuarto corte', () => {
    let failures = 0;
    const opened = false;
    const delays: number[] = [];
    for (let attempt = 0; attempt < 3; attempt += 1) {
      const decision = decideAfterClose({ opened, failures, fatal: false });
      expect(decision.kind).toBe('retry');
      if (decision.kind === 'retry') {
        delays.push(decision.delayMs);
        failures = decision.failures;
      }
    }
    expect(delays).toEqual([1000, 2000, 4000]);
    expect(decideAfterClose({ opened, failures, fatal: false })).toEqual({
      kind: 'stop',
      failures: 4,
    });
  });

  it('al abrir de nuevo el contador vuelve a cero y un cierre fatal no reintenta', () => {
    const again = decideAfterClose({ opened: true, failures: 3, fatal: false });
    const fatal = decideAfterClose({ opened: true, failures: 0, fatal: true });

    expect(again).toEqual({ kind: 'retry', delayMs: 1000, failures: 1 });
    expect(fatal).toEqual({ kind: 'stop', failures: 0 });
  });
});

describe('reconciliación', () => {
  it('una generación cerrada no pisa el snapshot nuevo', () => {
    const stale = {
      type: 'room.snapshot',
      payload: {
        code: 'AB23CD',
        status: 'waiting',
        host: 'Ana',
        participants: ['Ana'],
        player_count: 1,
        accepting_members: true,
        can_start: false,
      },
    };

    expect(acceptGeneration(2, 1)).toBe(false);
    const kept = acceptGeneration(2, 1)
      ? applyRoomEvent(room, stale).room
      : room;
    expect(kept?.participants).toEqual(['Ana', 'Luis', 'Nora', 'Otto']);
    expect(acceptGeneration(2, 2)).toBe(true);
  });

  it('no retrocede la fase ni acepta una mano con menos cuentas', () => {
    const voting = applyConversationEvent(
      {
        number: 1,
        status: 'conversation',
        ready: ['Ana'],
        readyCount: 1,
      },
      {
        type: 'round.phase_changed',
        payload: { number: 1, status: 'voting' },
      },
    );
    const late = applyConversationEvent(voting.round, {
      type: 'round.phase_changed',
      payload: { number: 1, status: 'conversation' },
    });
    const olderRound = applyConversationEvent(voting.round, {
      type: 'round.phase_changed',
      payload: { number: 0, status: 'finished' },
    });
    const duplicated = applyConversationEvent(
      {
        number: 1,
        status: 'conversation',
        ready: ['Ana', 'Luis'],
        readyCount: 2,
      },
      {
        type: 'round.hand_raised',
        payload: { number: 1, name: 'Luis', ready_count: 1 },
      },
    );

    expect(
      acceptRoundStatus(
        { number: 1, status: 'voting' },
        { number: 1, status: 'conversation' },
      ),
    ).toBe('ignore');
    expect(late.round?.status).toBe('voting');
    expect(olderRound.round?.status).toBe('voting');
    expect(duplicated.round?.ready).toEqual(['Ana', 'Luis']);
    expect(duplicated.round?.readyCount).toBe(2);
    expect(nextMark(1, 3)).toBe(1);
  });
});

describe('acciones inciertas', () => {
  it('solo reintenta lecturas y deja en duda un ¡Basta! sin confirmar', () => {
    expect(automaticRetries()).toEqual(['read']);
    expect(mayAutoRetry('vote')).toBe(false);
    expect(mayAutoRetry('basta')).toBe(false);
    expect(mayAutoRetry('raise_hand')).toBe(false);
    expect(mayAutoRetry('start')).toBe(false);
    expect(markBastaUncertain(true, false)).toBe(true);
    expect(markBastaUncertain(true, true)).toBe(false);
    expect(markBastaUncertain(false, false)).toBe(false);
  });
});
