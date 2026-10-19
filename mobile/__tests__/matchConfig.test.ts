import { describe, expect, it } from '@jest/globals';

import {
  matchConfigSummary,
  matchConfigTitle,
  startMatchLabel,
} from '../src/features/local/match/matchConfigPresentation';

describe('matchConfig OOC-020.7', () => {
  it('expone copy de confirmación sin opciones inventadas', () => {
    expect(matchConfigTitle).toBe('Antes de empezar');
    expect(startMatchLabel).toBe('Comenzar partida');
  });

  it('resume pilas y rondas para 4–6 jugadores (15 pilas)', () => {
    const summary = matchConfigSummary(4);
    expect(summary).not.toBeNull();
    if (summary === null) {
      return;
    }
    expect(summary.pileCountLabel).toContain('15');
    expect(summary.pilesPerRoundLabel).toContain('3');
    expect(summary.maxRoundsLabel).toContain('5');
  });

  it('resume pilas y rondas para 7–8 jugadores (16 pilas)', () => {
    const summary = matchConfigSummary(8);
    expect(summary).not.toBeNull();
    if (summary === null) {
      return;
    }
    expect(summary.pileCountLabel).toContain('16');
    expect(summary.pilesPerRoundLabel).toContain('4');
    expect(summary.maxRoundsLabel).toContain('4');
  });

  it('rechaza conteos fuera de 4–8', () => {
    expect(matchConfigSummary(3)).toBeNull();
    expect(matchConfigSummary(9)).toBeNull();
  });
});
