import { describe, expect, it } from '@jest/globals';

import { ResultPlayerCard } from '../src/components/ResultPlayerCard';
import { StandingRow } from '../src/components/StandingRow';
import {
  localChangePlayersLabel,
  localNextRoundLabel,
  localPlayAgainLabel,
  localResultsCopy,
  localTeamsLabel,
} from '../src/features/local/match/copy';
import {
  celebrationKind,
  presentLocalResults,
} from '../src/features/local/match/resultsPresentation';
import { localScoreboard } from '../src/features/local/rules/board';
import {
  localResultView,
  openLocalResults,
} from '../src/features/local/rules/reveal';
import type {
  LocalMatch,
  LocalVoteDraft,
} from '../src/features/local/rules/round';

function playedMatch(
  drafts: readonly LocalVoteDraft[],
  phase: LocalMatch['phase'] = 'recording',
): LocalMatch {
  return {
    version: 1,
    status: 'preparing',
    phase,
    players: [
      { id: 'A', name: 'Ana' },
      { id: 'B', name: 'Luis' },
      { id: 'I', name: 'Iván' },
    ],
    piles: [
      { number: 1, copies: [1, 2, 3], text: 'En la mesa' },
      { number: 2, copies: [1, 2, 3] },
    ],
    rounds: [
      {
        number: 1,
        status: 'finished',
        piles: [],
        hands: [],
        discard: [],
        awards: [
          { playerId: 'A', points: 2 },
          { playerId: 'B', points: 2 },
          { playerId: 'I', points: 4 },
        ],
      },
      {
        number: 2,
        status: 'voting',
        piles: [],
        hands: [
          { playerId: 'A', number: 1, copy: 1 },
          { playerId: 'B', number: 1, copy: 1 },
          { playerId: 'I', number: 2, copy: 1 },
        ],
        discard: [{ number: 9, copy: 1 }],
        drafts,
      },
    ],
  };
}

const ballot: readonly LocalVoteDraft[] = [
  { playerId: 'A', gesture: 'point', targets: ['B'] },
  { playerId: 'B', gesture: 'point', targets: ['A'] },
  { playerId: 'I', gesture: 'v', targets: [] },
];

describe('localResults UI OOC-020.10', () => {
  it('exporta tarjetas de resultado y clasificación', () => {
    expect(typeof ResultPlayerCard).toBe('function');
    expect(typeof StandingRow).toBe('function');
    expect(localTeamsLabel).toBe('Equipos');
  });

  it('CTAs de navegación según mid-match o marcador', () => {
    expect(localResultsCopy(false)).toEqual({
      title: 'Resultados',
      message: 'Quedan pilas. Estos puntos ya quedaron guardados.',
    });
    expect(localResultsCopy(true).title).toBe('Marcador');
    expect(localNextRoundLabel).toBe('Siguiente ronda');
    expect(localPlayAgainLabel).toBe('Volver a jugar');
    expect(localChangePlayersLabel).toBe('Cambiar jugadores');
  });

  it('no revela resultados antes del cierre de votación', () => {
    const view = localResultView(playedMatch(ballot, 'recording'), 2);
    expect(view.ok).toBe(false);
  });

  it('presenta ganadores y celebración en marcador sin recalcular puntos', () => {
    const opened = openLocalResults(playedMatch(ballot), 2);
    expect(opened.ok).toBe(true);
    if (!opened.ok) {
      return;
    }
    const finished: LocalMatch = {
      ...opened.match,
      status: 'finished',
      phase: 'finished',
    };
    const view = localResultView(finished, 2);
    expect(view.ok).toBe(true);
    if (!view.ok) {
      return;
    }
    const board = localScoreboard(finished);
    const presented = presentLocalResults(finished, view, board, 2, true);
    expect(presented.winnersLine).toBeDefined();
    expect(presented.celebration).toBe(celebrationKind(true, board.winners));
    expect(presented.rows.map((row) => row.roundPoints)).toEqual(
      view.rows.map((row) => row.roundPoints),
    );
    expect(presented.rows.map((row) => row.totalPoints)).toEqual(
      view.rows.map((row) => row.totalPoints),
    );
    expect(presented.standings.every((row, index) => row.rank === index + 1)).toBe(
      true,
    );
  });
});
