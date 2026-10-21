import { beforeEach, describe, expect, it } from '@jest/globals';

import {
  installLocalMatchStorage,
  localMatchSaveError,
} from '../src/features/local/match/autosave';
import {
  localMatchResumeError,
  localRecoveryPresentation,
  recoverActiveMatch,
} from '../src/features/local/match/resume';
import {
  activeMatchKey,
  type LocalMatchStorage,
} from '../src/features/local/match/storage';
import {
  holdLocalMatch,
  localCardView,
  readLocalMatch,
  resumedLocalPass,
  revealLocalCard,
  startLocalPass,
} from '../src/features/local/match/viewing';
import { localResultView } from '../src/features/local/rules/reveal';
import type {
  LocalMatch,
  LocalVoteDraft,
} from '../src/features/local/rules/round';

const players = [
  { id: 'A', name: 'Ana' },
  { id: 'B', name: 'Luis' },
  { id: 'I', name: 'Iván' },
] as const;

const piles = [
  { number: 1, copies: [1, 2, 3], text: 'Lenguaje' },
  { number: 2, copies: [1, 2, 3], text: 'Dieta' },
] as const;

const hands = [
  { playerId: 'A', number: 1, copy: 1 },
  { playerId: 'B', number: 1, copy: 2 },
  { playerId: 'I', number: 2, copy: 1 },
] as const;

const ballot: readonly LocalVoteDraft[] = [
  { playerId: 'A', gesture: 'point', targets: ['B'] },
  { playerId: 'B', gesture: 'point', targets: ['A'] },
  { playerId: 'I', gesture: 'v', targets: [] },
];

const awards = [
  { playerId: 'A', points: 7 },
  { playerId: 'B', points: 0 },
  { playerId: 'I', points: 1 },
] as const;

function dealtMatch(phase: LocalMatch['phase']): LocalMatch {
  return {
    version: 1,
    status: 'preparing',
    phase,
    players: [...players],
    piles: piles.map((pile) => ({ ...pile, copies: [...pile.copies] })),
    rounds: [
      {
        number: 1,
        status:
          phase === 'recording' || phase === 'results'
            ? 'voting'
            : 'conversation',
        piles: [1, 2],
        hands: hands.map((hand) => ({ ...hand })),
        discard: [{ number: 2, copy: 3 }],
        ...(phase === 'recording' || phase === 'results'
          ? {
              drafts: ballot.map((draft) => ({
                ...draft,
                targets: [...draft.targets],
              })),
            }
          : {}),
        ...(phase === 'results'
          ? { awards: awards.map((award) => ({ ...award })) }
          : {}),
      },
    ],
  };
}

function memoryStorage(): LocalMatchStorage & { writes(): number } {
  const items = new Map<string, string>();
  let writes = 0;
  return {
    writes: () => writes,
    getItem: async (key) => items.get(key) ?? null,
    setItem: async (key, value) => {
      writes += 1;
      items.set(key, value);
    },
    removeItem: async (key) => {
      items.delete(key);
    },
  };
}

async function recover(match: LocalMatch) {
  const storage = memoryStorage();
  installLocalMatchStorage(storage);
  holdLocalMatch(null);
  await storage.setItem(activeMatchKey, JSON.stringify(match));
  const writes = storage.writes();
  const recovery = await recoverActiveMatch();
  return {
    writes,
    recovery,
    held: readLocalMatch(),
    storedWrites: storage.writes(),
  };
}

describe('privacidad al recuperar la partida', () => {
  beforeEach(() => {
    installLocalMatchStorage(memoryStorage());
    holdLocalMatch(null);
  });

  it('después del reparto la carta queda oculta y las manos no cambian', async () => {
    const match = dealtMatch('viewing');
    const visible = revealLocalCard(startLocalPass());
    const resumed = localCardView(match, resumedLocalPass(visible));
    expect(resumed).toEqual({
      kind: 'covered',
      playerName: 'Ana',
      nextPlayerName: 'Luis',
      canContinue: false,
      canGoBack: false,
    });
    expect(JSON.stringify(resumed)).not.toContain('Lenguaje');
    expect(JSON.stringify(resumed)).not.toContain('Dieta');

    const shown = localRecoveryPresentation(match);
    expect(shown).toEqual({
      phase: 'viewing',
      playerName: 'Ana',
      covered: true,
    });
    expect(JSON.stringify(shown)).not.toContain('Lenguaje');
    expect(JSON.stringify(shown)).not.toContain('Dieta');
    expect(JSON.stringify(shown)).not.toContain('roundPoints');

    const restored = await recover(match);
    expect(restored.recovery).toEqual({ status: 'ready', route: 'LocalCard' });
    expect(restored.held?.rounds[0]?.hands).toEqual(match.rounds[0]?.hands);
    expect(restored.storedWrites).toBe(restored.writes);
  });

  it('después de la conversación no hay número ni texto', async () => {
    const match = dealtMatch('conversation');
    const shown = localRecoveryPresentation(match);
    expect(shown).toEqual({ phase: 'conversation' });
    expect(JSON.stringify(shown)).not.toContain('Lenguaje');
    expect(JSON.stringify(shown)).not.toContain('Dieta');

    const restored = await recover(match);
    expect(restored.recovery).toEqual({ status: 'ready', route: 'LocalTable' });
    expect(restored.held?.rounds[0]?.hands).toEqual(match.rounds[0]?.hands);
    expect(restored.storedWrites).toBe(restored.writes);
  });

  it('después de la votación conserva los gestos y no muestra carta ni puntos', async () => {
    const match = dealtMatch('recording');
    const shown = localRecoveryPresentation(match);
    expect(shown).toEqual({
      phase: 'recording',
      rows: [
        { name: 'Ana', action: 'Señaló a Luis.' },
        { name: 'Luis', action: 'Señaló a Ana.' },
        { name: 'Iván', action: 'V' },
      ],
    });
    expect(JSON.stringify(shown)).not.toContain('Lenguaje');
    expect(JSON.stringify(shown)).not.toContain('Dieta');
    expect(JSON.stringify(shown)).not.toContain('roundPoints');
    expect(JSON.stringify(shown)).not.toContain('cardNumber');

    const restored = await recover(match);
    expect(restored.recovery).toEqual({
      status: 'ready',
      route: 'LocalRecord',
    });
    expect(restored.held?.rounds[0]?.drafts).toEqual(match.rounds[0]?.drafts);
    expect(restored.held?.rounds[0]?.awards).toBeUndefined();
    expect(restored.storedWrites).toBe(restored.writes);
  });

  it('después de los resultados conserva los puntos ya guardados', async () => {
    const match = dealtMatch('results');
    const before = JSON.stringify(match.rounds[0]?.awards);
    const shown = localRecoveryPresentation(match);
    expect(shown).toEqual({
      phase: 'results',
      rows: [
        { name: 'Ana', cardNumber: 1, roundPoints: 7, totalPoints: 7 },
        { name: 'Luis', cardNumber: 1, roundPoints: 0, totalPoints: 0 },
        { name: 'Iván', cardNumber: 2, roundPoints: 1, totalPoints: 1 },
      ],
    });
    expect(JSON.stringify(match.rounds[0]?.awards)).toBe(before);

    const restored = await recover(match);
    expect(restored.recovery).toEqual({
      status: 'ready',
      route: 'LocalResults',
    });
    expect(restored.held?.rounds[0]?.awards).toEqual(match.rounds[0]?.awards);
    expect(restored.held?.rounds).toHaveLength(1);
    expect(restored.storedWrites).toBe(restored.writes);
  });

  it('una pasada visible no conserva el número al reanudarse', () => {
    const match = dealtMatch('viewing');
    const visible = revealLocalCard(startLocalPass());
    const shown = localCardView(match, visible);
    expect(shown.kind).toBe('visible');
    const resumed = resumedLocalPass(visible);
    expect(resumed.visible).toBe(false);
    const covered = localCardView(match, resumed);
    expect(covered).toEqual({
      kind: 'covered',
      playerName: 'Ana',
      nextPlayerName: 'Luis',
      canContinue: false,
      canGoBack: false,
    });
    expect(covered).not.toHaveProperty('number');
    expect(covered).not.toHaveProperty('text');
    expect(JSON.stringify(covered)).not.toContain('Lenguaje');
  });

  it('la mesa y la carga no traen la carta, y el resultado anterior no trae filas', () => {
    const table = localRecoveryPresentation(dealtMatch('conversation'));
    const recording = localRecoveryPresentation(dealtMatch('recording'));
    expect(JSON.stringify(table)).not.toContain('cardNumber');
    expect(JSON.stringify(recording)).not.toContain('cardNumber');
    expect(JSON.stringify(table)).not.toContain('Lenguaje');
    expect(JSON.stringify(recording)).not.toContain('Lenguaje');
    const early = localResultView(dealtMatch('recording'), 1);
    expect(early.ok).toBe(false);
    expect(early).not.toHaveProperty('rows');
  });

  it('los errores de guardado y reanudación no incluyen el texto de la carta', () => {
    expect(localMatchSaveError).not.toContain('Lenguaje');
    expect(localMatchResumeError).not.toContain('Lenguaje');
  });

  it('una fase anterior al resultado no trae filas ni puntuación', () => {
    const shown = localRecoveryPresentation(dealtMatch('viewing'));
    expect(shown.phase).toBe('viewing');
    expect(shown).not.toHaveProperty('rows');
    expect(JSON.stringify(shown)).not.toContain('roundPoints');
  });
});
