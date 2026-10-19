import { describe, expect, it } from '@jest/globals';

import { dealLocalMatch } from '../src/features/local/catalog/deal';
import { localCatalogSituations } from '../src/features/local/catalog/situations';
import {
  localPileCountMessage,
  localPilesAlreadyStoredMessage,
  type LocalMatch,
  type LocalRng,
} from '../src/features/local/rules/round';

const fixedRng: LocalRng = {
  sample(items, count) {
    return items.slice(0, count);
  },
  shuffle(items) {
    return [...items].reverse();
  },
};

const firstCardText =
  'Estás realmente orgulloso de tu don con el lenguaje. Disfrutás mucho las palabras sofisiticadas.';

function setupMatch(playerCount: number): LocalMatch {
  return {
    version: 1,
    status: 'preparing',
    phase: 'setup',
    players: Array.from({ length: playerCount }, (_, index) => ({
      id: String(index + 1),
      name: `Jugador ${index + 1}`,
    })),
    piles: [],
    rounds: [],
  };
}

describe('mazo presencial', () => {
  it('con 4 jugadores toma 15 pilas del archivo y reparte', () => {
    const catalog = localCatalogSituations();
    expect(catalog).toHaveLength(36);
    expect(catalog[0]).toEqual({ number: 1, text: firstCardText });

    const dealt = dealLocalMatch(setupMatch(4), catalog, fixedRng);

    expect(dealt.ok).toBe(true);
    if (!dealt.ok) {
      return;
    }
    expect(dealt.match.phase).toBe('viewing');
    expect(dealt.match.piles).toHaveLength(15);
    expect(dealt.match.rounds).toHaveLength(1);
    expect(dealt.match.rounds[0]?.hands).toHaveLength(4);
    expect(dealt.match.piles.map((pile) => pile.number)).toEqual(
      catalog.slice(0, 15).map((situation) => situation.number),
    );
    for (const pile of dealt.match.piles) {
      expect(pile.copies).toEqual([1, 2, 3]);
      expect(pile.text).toBe(
        catalog.find((situation) => situation.number === pile.number)?.text,
      );
    }
  });

  it('con 8 jugadores toma 16 pilas', () => {
    const catalog = localCatalogSituations();
    const dealt = dealLocalMatch(setupMatch(8), catalog, fixedRng);

    expect(dealt.ok).toBe(true);
    if (!dealt.ok) {
      return;
    }
    expect(dealt.match.piles).toHaveLength(16);
    expect(dealt.match.rounds[0]?.hands).toHaveLength(8);
    expect(dealt.match.piles.map((pile) => pile.number)).toEqual(
      catalog.slice(0, 16).map((situation) => situation.number),
    );
  });

  it('no reparte si el catálogo no alcanza o la partida ya tiene pilas', () => {
    const short = dealLocalMatch(
      setupMatch(4),
      localCatalogSituations().slice(0, 10),
      fixedRng,
    );
    expect(short).toEqual({
      ok: false,
      match: setupMatch(4),
      message: localPileCountMessage(15),
    });

    const dealt = dealLocalMatch(
      setupMatch(4),
      localCatalogSituations(),
      fixedRng,
    );
    expect(dealt.ok).toBe(true);
    if (!dealt.ok) {
      return;
    }
    expect(
      dealLocalMatch(dealt.match, localCatalogSituations(), fixedRng),
    ).toEqual({
      ok: false,
      match: dealt.match,
      message: localPilesAlreadyStoredMessage,
    });
  });
});
