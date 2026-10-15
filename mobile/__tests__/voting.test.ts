import { describe, expect, it } from '@jest/globals';

import {
  castVote,
  networkMessage,
  parseVoteChoice,
  parseVoteWindow,
  type VoteChoice,
  type VoteWindow,
} from '../src/services/api/rooms';
import {
  applyVoteEvent,
  confirmBallot,
  controlsLocked,
  doubtBallot,
  nextMark,
  pointTargets,
} from '../src/services/realtime/voting';

const voting: VoteWindow = {
  number: 1,
  status: 'voting',
  voteMark: 3,
  voteOpenedAt: '2026-10-15T12:00:00+00:00',
  voteClosesAt: '2026-10-15T12:00:03+00:00',
};

const pointed: VoteChoice = { gesture: 'point', targets: ['Luis'] };

describe('elecciones', () => {
  it('acepta señalar, el puño y la V', async () => {
    expect(
      parseVoteChoice({ gesture: 'point', targets: ['Luis', 'Nora'] }),
    ).toEqual({ gesture: 'point', targets: ['Luis', 'Nora'] });
    expect(parseVoteChoice({ gesture: 'fist', targets: [] })).toEqual({
      gesture: 'fist',
      targets: [],
    });
    expect(parseVoteChoice({ gesture: 'v', targets: [] })).toEqual({
      gesture: 'v',
      targets: [],
    });
    expect(() => parseVoteChoice({ gesture: 'point', targets: [] })).toThrow();
    expect(() =>
      parseVoteChoice({ gesture: 'fist', targets: ['Luis'] }),
    ).toThrow();
    expect(
      pointTargets(['Ana', 'Luis', 'Ana'], 'Ana', ['Ana', 'Luis', 'Luis']),
    ).toEqual(['Luis']);

    process.env.EXPO_PUBLIC_API_URL = 'http://10.0.2.2:8000';
    let seen = '';
    let body = '';
    const saved = await castVote(
      'AB23CD',
      'token',
      pointed,
      async (url, init) => {
        seen = url;
        body = String(init?.body ?? '');
        return {
          ok: true,
          status: 200,
          json: async () => ({ gesture: 'point', targets: ['Luis'] }),
        };
      },
    );

    expect(saved).toEqual(pointed);
    expect(seen).toContain('/api/rooms/AB23CD/vote/?token=');
    expect(JSON.parse(body)).toEqual({ gesture: 'point', targets: ['Luis'] });
    expect(body).not.toContain('role');
  });

  it('un rechazo no pisa el voto confirmado y la red lo deja en duda', async () => {
    process.env.EXPO_PUBLIC_API_URL = 'http://10.0.2.2:8000';
    const rejected = castVote(
      'AB23CD',
      'token',
      { gesture: 'fist', targets: [] },
      async () => ({
        ok: false,
        status: 409,
        json: async () => ({
          code: 'invalid_vote',
          detail: 'La ronda ya tiene votos distintos.',
        }),
      }),
    );
    await expect(rejected).rejects.toMatchObject({
      code: 'invalid_vote',
      message: 'La ronda ya tiene votos distintos.',
    });
    expect(confirmBallot(pointed, { gesture: 'fist', targets: [] })).toEqual(
      pointed,
    );

    await expect(
      castVote('AB23CD', 'token', { gesture: 'v', targets: [] }, async () => {
        throw new Error('caída');
      }),
    ).rejects.toThrow(networkMessage);
    expect(doubtBallot(null, { gesture: 'v', targets: [] })).toEqual({
      gesture: 'v',
      targets: [],
    });
    expect(doubtBallot(pointed, { gesture: 'v', targets: [] })).toBeNull();
  });
});

describe('cierre de la votación', () => {
  it('la marca 0 bloquea y una marca tardía no reabre', () => {
    const closed = applyVoteEvent(voting, {
      type: 'round.countdown',
      payload: {
        code: 'AB23CD',
        number: 1,
        mark: 0,
        opened_at: voting.voteOpenedAt,
        closes_at: voting.voteClosesAt,
        text: 'No copiar esta carta',
      },
    });
    const late = applyVoteEvent(closed.window, {
      type: 'round.countdown',
      payload: { code: 'AB23CD', number: 1, mark: 3 },
    });

    expect(closed.window?.voteMark).toBe(0);
    expect(closed.reveal).toBe(false);
    expect(controlsLocked(closed.window, false, false)).toBe(true);
    expect(late.window?.voteMark).toBe(0);
    expect(nextMark(0, 3)).toBe(0);
    expect(JSON.stringify(closed)).not.toContain('No copiar esta carta');
  });

  it('la revelación cierra sin guardar cartas ni gestos ajenos', () => {
    const revealed = applyVoteEvent(voting, {
      type: 'round.revealed',
      payload: {
        code: 'AB23CD',
        number: 1,
        results: [
          {
            name: 'Luis',
            card: { number: 9, text: 'Carta ajena' },
            gesture: 'point',
            points: 2,
          },
        ],
      },
    });
    const parsed = parseVoteWindow({
      ...voting,
      vote_mark: 0,
      vote_opened_at: voting.voteOpenedAt,
      vote_closes_at: voting.voteClosesAt,
      results: [{ card: { text: 'Carta ajena' }, gesture: 'fist' }],
    });

    expect(revealed.reveal).toBe(true);
    expect(revealed.window?.status).toBe('finished');
    expect(JSON.stringify(revealed)).not.toContain('Carta ajena');
    expect(JSON.stringify(revealed)).not.toContain('point');
    expect(parsed).toEqual({ ...voting, voteMark: 0 });
    expect(JSON.stringify(parsed)).not.toContain('Carta ajena');
    expect(JSON.stringify(parsed)).not.toContain('fist');
  });
});
