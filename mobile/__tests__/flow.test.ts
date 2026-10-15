import { describe, expect, it } from '@jest/globals';

import { RootStackParamList } from '../src/navigation/routes';
import {
  castVote,
  createRoom,
  fetchConversationRound,
  fetchRoundPhase,
  fetchRoundResults,
  fetchScoreboard,
  fetchVoteWindow,
  joinRoom,
  networkMessage,
  parseOwnCard,
  parseScoreboard,
  startRoom,
} from '../src/services/api/rooms';
import {
  acceptGeneration,
  decideAfterClose,
  mayAutoRetry,
} from '../src/services/realtime/connection';
import {
  applyConversationEvent,
  mayCallBasta,
} from '../src/services/realtime/conversation';
import { applyRoomEvent, mayStart } from '../src/services/realtime/lobby';
import {
  applyReveal,
  explanation,
  gameFinished,
  replaceResults,
} from '../src/services/realtime/results';
import {
  applyPhaseEvent,
  mayOpenConversation,
  retainCard,
} from '../src/services/realtime/secretCard';
import {
  loadGuestSession,
  saveGuestSession,
  type SessionStorage,
} from '../src/services/session/guestSession';
import {
  applyVoteEvent,
  confirmBallot,
  controlsLocked,
  doubtBallot,
  nextMark,
} from '../src/services/realtime/voting';
import { visibleWinners } from '../src/services/realtime/scoreboard';

const secret = 'Carta propia';
const foreign = 'Carta ajena';

function memoryStorage(): SessionStorage {
  const items = new Map<string, string>();
  return {
    getItem: async (key) => items.get(key) ?? null,
    setItem: async (key, value) => {
      items.set(key, value);
    },
  };
}

function ok(body: unknown, status = 200) {
  return {
    ok: true,
    status,
    json: async () => body,
  };
}

function roomPayload(
  participants: readonly string[],
  status: string,
  extra: Record<string, unknown> = {},
) {
  return {
    code: 'AB23CD',
    status,
    host: 'Ana',
    participants,
    player_count: participants.length,
    accepting_members: status === 'waiting',
    can_start: participants.length >= 4 && status === 'waiting',
    ...extra,
  };
}

describe('flujo de la partida', () => {
  it('sigue el estado del servidor y no adelanta cartas ni votos', async () => {
    process.env.EXPO_PUBLIC_API_URL = 'http://10.0.2.2:8000';
    const calls: { url: string; body?: string }[] = [];
    const fetchImpl = async (url: string, init?: RequestInit) => {
      calls.push({
        url,
        ...(typeof init?.body === 'string' ? { body: init.body } : {}),
      });
      if (url.endsWith('/api/rooms/') && init?.method === 'POST') {
        return ok(
          { ...roomPayload(['Ana'], 'waiting'), token: 'token-ana' },
          201,
        );
      }
      if (url.endsWith('/members/')) {
        return ok(
          {
            ...roomPayload(['Ana', 'Luis', 'Nora', 'Otto'], 'waiting'),
            token: 'token-luis',
          },
          201,
        );
      }
      if (url.includes('/start/')) {
        return ok(roomPayload(['Ana', 'Luis', 'Nora', 'Otto'], 'started'));
      }
      if (url.includes('/card/')) {
        return ok({ number: 4, text: secret, role: 'impostor' });
      }
      if (url.includes('/round/') && url.includes('token-ana')) {
        return ok({
          number: 1,
          status: 'conversation',
          ready: ['Ana'],
          ready_count: 1,
          results: [{ card: { text: foreign } }],
        });
      }
      if (url.includes('/vote/')) {
        return ok({ gesture: 'point', targets: ['Luis'] });
      }
      if (url.includes('/results/')) {
        return ok([
          {
            name: 'Ana',
            card: { number: 4, text: secret },
            gesture: 'point',
            targets: ['Luis'],
            points: 1,
            recognized_by: ['Luis'],
          },
          {
            name: 'Luis',
            card: { number: 9, text: foreign },
            gesture: 'v',
            targets: [],
            points: 0,
            pointed_by: ['Ana'],
          },
        ]);
      }
      if (url.includes('/score/')) {
        return ok({
          status: 'preparing',
          standings: [
            { name: 'Ana', points: 3 },
            { name: 'Luis', points: 1 },
            { name: 'Nora', points: 3 },
            { name: 'Otto', points: 0 },
          ],
          winners: ['Nora', 'Ana'],
        });
      }
      return ok({
        number: 1,
        status: 'voting',
        vote_mark: 1,
        vote_opened_at: '2026-10-15T12:00:00+00:00',
        vote_closes_at: '2026-10-15T12:00:03+00:00',
        results: [{ card: { text: foreign } }],
      });
    };

    const created = await createRoom(' Ana ', fetchImpl);
    const joined = await joinRoom('ab23cd', ' Luis ', fetchImpl);
    expect(joined.participants).toEqual(['Ana', 'Luis', 'Nora', 'Otto']);
    expect(calls.map((call) => call.body)).toEqual([
      JSON.stringify({ name: 'Ana' }),
      JSON.stringify({ name: 'Luis' }),
    ]);
    const storage = memoryStorage();
    await saveGuestSession(
      { name: created.host, roomCode: created.code, token: created.token },
      storage,
    );
    const session = await loadGuestSession(storage);
    const routes: RootStackParamList = {
      Home: undefined,
      CreateRoom: undefined,
      JoinRoom: undefined,
      Lobby: undefined,
      SecretCard: undefined,
      Conversation: undefined,
      Voting: undefined,
      Results: undefined,
      Scoreboard: undefined,
      Catalog: undefined,
    };
    expect(session?.token).toBe('token-ana');
    expect(Object.values(routes).every((value) => value === undefined)).toBe(
      true,
    );
    expect(JSON.stringify(routes)).not.toContain('token-ana');

    let room = applyRoomEvent(null, {
      type: 'room.snapshot',
      payload: roomPayload(['Ana'], 'waiting'),
    }).room;
    room = applyRoomEvent(room, {
      type: 'room.player_joined',
      payload: {
        ...roomPayload(['Ana', 'Luis', 'Nora', 'Otto'], 'waiting'),
        name: 'Otto',
      },
    }).room;
    const repeated = applyRoomEvent(room, {
      type: 'room.player_joined',
      payload: {
        ...roomPayload(['Ana', 'Luis', 'Nora', 'Otto'], 'waiting'),
        name: 'Otto',
      },
    });
    expect(repeated.room?.participants).toEqual([
      'Ana',
      'Luis',
      'Nora',
      'Otto',
    ]);
    expect(mayStart('Ana', repeated.room!)).toBe(true);
    expect(mayStart('Luis', repeated.room!)).toBe(false);
    const started = await startRoom(created.code, created.token, fetchImpl);
    const began = applyRoomEvent(repeated.room, {
      type: 'game.started',
      payload: roomPayload(started.participants, 'started'),
    });
    expect(began.started).toBe(true);
    expect(began.room?.status).toBe('started');
    expect(JSON.stringify(began.room)).not.toContain(foreign);

    const phase = await fetchRoundPhase(created.code, created.token, fetchImpl);
    const conversation = await fetchConversationRound(
      created.code,
      created.token,
      fetchImpl,
    );
    const card = parseOwnCard({ number: 4, text: secret, role: 'impostor' });
    const held = retainCard(phase.number, phase.number, card);
    expect(phase).toEqual({ number: 1, status: 'conversation' });
    expect(conversation.ready).toEqual(['Ana']);
    expect(JSON.stringify(phase)).not.toContain(foreign);
    expect(JSON.stringify(conversation)).not.toContain(foreign);
    expect(JSON.stringify(held)).not.toContain('impostor');
    expect(mayOpenConversation('prepared')).toBe(false);
    expect(mayOpenConversation(phase.status)).toBe(true);
    const revealedEarly = applyPhaseEvent(phase, held, {
      type: 'round.revealed',
      payload: { number: 1, results: [{ card: { text: foreign } }] },
    });
    expect(revealedEarly.kind).toBe('ignore');
    expect(JSON.stringify(revealedEarly)).not.toContain(foreign);

    const raised = applyConversationEvent(conversation, {
      type: 'round.hand_raised',
      payload: { number: 1, name: 'Ana', ready_count: 1 },
    });
    const again = applyConversationEvent(raised.round, {
      type: 'round.hand_raised',
      payload: { number: 1, name: 'Ana', ready_count: 1 },
    });
    const rejected = applyConversationEvent(again.round, {
      type: 'connection.error',
      payload: { code: 'not_ready', detail: 'Todavía no hay mayoría.' },
    });
    const voting = applyConversationEvent(rejected.round, {
      type: 'round.phase_changed',
      payload: { number: 1, status: 'voting', text: foreign },
    });
    expect(again.round?.ready).toEqual(['Ana']);
    expect(rejected.vote).toBe(false);
    expect(rejected.round?.status).toBe('conversation');
    expect(mayCallBasta('prepared')).toBe(false);
    expect(voting.vote).toBe(true);
    expect(JSON.stringify(voting)).not.toContain(foreign);

    const windowState = await fetchVoteWindow(
      created.code,
      'token-vote',
      fetchImpl,
    );
    expect(windowState.status).toBe('voting');
    expect(JSON.stringify(windowState)).not.toContain(foreign);
    expect(nextMark(windowState.voteMark, 3)).toBe(1);
    const sent = { gesture: 'point' as const, targets: ['Luis'] };
    await expect(
      castVote(created.code, created.token, sent, async () => {
        throw new Error('fallo de red');
      }),
    ).rejects.toThrow(networkMessage);
    expect(doubtBallot(null, sent)).toEqual(sent);
    expect(mayAutoRetry('vote')).toBe(false);
    expect(mayAutoRetry('basta')).toBe(false);
    const saved = await castVote(created.code, created.token, sent, fetchImpl);
    const confirmed = confirmBallot(null, saved);
    const voteCall = calls.filter((call) => call.url.includes('/vote/'));
    expect(voteCall).toHaveLength(1);
    expect(voteCall[0]?.body).toBe(JSON.stringify(sent));
    expect(doubtBallot(confirmed, sent)).toBeNull();
    const closed = {
      ...windowState,
      voteMark: nextMark(windowState.voteMark, 0),
    };
    expect(controlsLocked(closed, false, false)).toBe(true);
    const revealedVote = applyVoteEvent(windowState, {
      type: 'round.revealed',
      payload: { number: 1, results: [{ card: { text: foreign } }] },
    });
    expect(revealedVote.reveal).toBe(true);
    expect(JSON.stringify(revealedVote.window)).not.toContain(foreign);

    const rows = replaceResults(
      await fetchRoundResults(created.code, created.token, fetchImpl),
    );
    const repeatedRows = replaceResults(rows);
    const revealed = applyReveal(null, {
      type: 'round.revealed',
      payload: {
        number: 1,
        results: [
          {
            name: 'Ana',
            card: { number: 4, text: secret },
            gesture: 'point',
            targets: ['Luis'],
            points: 1,
            recognized_by: ['Luis'],
          },
        ],
      },
    });
    expect(explanation(rows[0]!)).toEqual({
      label: 'Reconocido por',
      names: ['Luis'],
    });
    expect(explanation(rows[1]!)).toEqual({
      label: 'Señalado por',
      names: ['Ana'],
    });
    expect(repeatedRows.map((row) => row.points)).toEqual(
      rows.map((row) => row.points),
    );
    expect(revealed.results?.[0]?.card.text).toBe(secret);
    expect(gameFinished('started', 'finished')).toBe(false);

    const playing = await fetchScoreboard(
      created.code,
      created.token,
      fetchImpl,
    );
    expect(visibleWinners(playing)).toEqual([]);
    expect(playing.standings.map((row) => row.name)).toEqual([
      'Ana',
      'Luis',
      'Nora',
      'Otto',
    ]);
    const finished = parseScoreboard({
      ...{
        status: 'finished',
        standings: playing.standings,
        winners: ['Ana', 'Nora'],
      },
    });
    expect(visibleWinners(finished)).toEqual(['Ana', 'Nora']);

    const stale = applyRoomEvent(began.room, {
      type: 'room.snapshot',
      payload: roomPayload(['Ana'], 'waiting'),
    });
    const kept = acceptGeneration(2, 1) ? stale.room : began.room;
    expect(kept?.participants).toHaveLength(4);
    expect(
      decideAfterClose({ opened: true, failures: 0, fatal: true }).kind,
    ).toBe('stop');
    expect(
      applyRoomEvent(began.room, {
        type: 'connection.error',
        payload: {
          code: 'unauthorized',
          detail: 'La conexión no está autorizada.',
        },
      }).fatal?.code,
    ).toBe('unauthorized');
  });
});
