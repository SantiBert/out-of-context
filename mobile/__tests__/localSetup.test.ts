import { describe, expect, it } from '@jest/globals';

import { dealLocalMatch } from '../src/features/local/catalog/deal';
import { localCatalogSituations } from '../src/features/local/catalog/situations';
import {
  commitLocalMatch,
  installLocalMatchStorage,
} from '../src/features/local/match/autosave';
import { recoverActiveMatch } from '../src/features/local/match/resume';
import { emptyNameMessage, longNameMessage } from '../src/services/api/rooms';
import {
  addPlayer,
  cancelSetupReview,
  confirmPendingSetup,
  confirmSetupReview,
  continueSetup,
  createSetupMatch,
  duplicateLocalNameMessage,
  fullLocalMatchMessage,
  initializeLocalMatch,
  localPlayerCountText,
  localRosterMutable,
  openSetupReview,
  removePlayer,
  renamePlayer,
  returnToEdit,
  startedLocalRosterMessage,
  tooFewLocalPlayersMessage,
  type LocalSetupMatch,
} from '../src/features/local/match/setup';
import {
  activeMatchKey,
  type LocalMatchStorage,
} from '../src/features/local/match/storage';
import {
  holdLocalMatch,
  readLocalMatch,
} from '../src/features/local/match/viewing';
import type { LocalRng } from '../src/features/local/rules/round';

function accepted(match: LocalSetupMatch, rawName: string): LocalSetupMatch {
  const result = addPlayer(match, rawName);
  if (!result.ok) {
    throw new Error(result.message);
  }
  return result.match;
}

describe('configuración presencial', () => {
  it('agrega nombres al final y conserva el orden', () => {
    const first = accepted(createSetupMatch(), ' Ana ');
    const second = accepted(first, 'Luis');
    expect(second.players.map((player) => player.name)).toEqual([
      'Ana',
      'Luis',
    ]);
    expect(second.phase).toBe('setup');
    expect(second.piles).toEqual([]);
    expect(second.rounds).toEqual([]);
    expect(localPlayerCountText(second.players.length)).toBe('2 jugadores');
  });

  it('edita el nombre sin mover al jugador', () => {
    const match = accepted(accepted(createSetupMatch(), 'Ana'), 'Luis');
    const luis = match.players[1];
    const renamed = renamePlayer(match, luis.id, ' Nora ');
    expect(renamed.ok).toBe(true);
    if (!renamed.ok) {
      return;
    }
    expect(renamed.match.players.map((player) => player.id)).toEqual(
      match.players.map((player) => player.id),
    );
    expect(renamed.match.players.map((player) => player.name)).toEqual([
      'Ana',
      'Nora',
    ]);
  });

  it('quita un jugador y no reutiliza su identificador', () => {
    const match = ['Ana', 'Luis', 'Nora', 'Otto', 'Paz'].reduce(
      (current, name) => accepted(current, name),
      createSetupMatch(),
    );
    const removed = removePlayer(match, match.players[1].id);
    if (!removed.ok) {
      throw new Error(removed.message);
    }
    expect(removed.match.players.map((player) => player.name)).toEqual([
      'Ana',
      'Nora',
      'Otto',
      'Paz',
    ]);
    const added = accepted(removed.match, 'Quique');
    expect(added.players.map((player) => player.id)).toEqual([
      '1',
      '3',
      '4',
      '5',
      '6',
    ]);
  });

  it('no quita si quedarían menos de 4', () => {
    const match = ['Ana', 'Luis', 'Nora', 'Otto'].reduce(
      (current, name) => accepted(current, name),
      createSetupMatch(),
    );
    const removed = removePlayer(match, match.players[0].id);
    expect(removed).toEqual({
      ok: false,
      match,
      message: tooFewLocalPlayersMessage,
    });
  });

  it('rechaza vacío, largo, repetido y el noveno sin cambiar la lista', () => {
    let match = createSetupMatch();
    for (const name of [
      'Ana',
      'Luis',
      'Nora',
      'Otto',
      'Paz',
      'Quique',
      'Rita',
      'Sol',
    ]) {
      match = accepted(match, name);
    }
    const empty = addPlayer(match, '   ');
    const long = addPlayer(match, 'a'.repeat(81));
    const duplicate = addPlayer(match, ' Ana ');
    const ninth = addPlayer(match, 'Teo');
    expect(empty).toEqual({ ok: false, match, message: emptyNameMessage });
    expect(long).toEqual({ ok: false, match, message: longNameMessage });
    expect(duplicate).toEqual({
      ok: false,
      match,
      message: duplicateLocalNameMessage,
    });
    expect(ninth).toEqual({
      ok: false,
      match,
      message: fullLocalMatchMessage,
    });
  });

  it('acepta un nombre que solo cambia las mayúsculas', () => {
    const match = accepted(createSetupMatch(), 'Ana');
    const added = addPlayer(match, 'ana');
    expect(added.ok).toBe(true);
  });

  it('guardar el mismo nombre lo deja en su lugar', () => {
    const match = accepted(createSetupMatch(), 'Ana');
    const renamed = renamePlayer(match, match.players[0].id, 'Ana');
    expect(renamed.ok).toBe(true);
    if (!renamed.ok) {
      return;
    }
    expect(renamed.match.players).toEqual([{ id: '1', name: 'Ana' }]);
  });

  it('no cambia la lista si el nombre editado ya está', () => {
    const match = accepted(accepted(createSetupMatch(), 'Ana'), 'Luis');
    const renamed = renamePlayer(match, match.players[1].id, 'Ana');
    expect(renamed).toEqual({
      ok: false,
      match,
      message: duplicateLocalNameMessage,
    });
  });

  it('quitar un jugador ausente deja el documento igual', () => {
    const match = accepted(createSetupMatch(), 'Ana');
    const removed = removePlayer(match, '9');
    expect(removed).toEqual({ ok: true, match });
    expect(localPlayerCountText(1)).toBe('1 jugador');
  });

  it('continuar exige entre 4 y 8 jugadores y no reparte', () => {
    const three = ['Ana', 'Luis', 'Nora'].reduce(
      (match, name) => accepted(match, name),
      createSetupMatch(),
    );
    expect(continueSetup(three)).toEqual({
      ok: false,
      match: three,
      message: tooFewLocalPlayersMessage,
    });

    const four = accepted(three, 'Otto');
    const continued = continueSetup(four);
    expect(continued).toEqual({ ok: true, match: four });
    expect(four.phase).toBe('setup');
    expect(four.piles).toEqual([]);
    expect(four.rounds).toEqual([]);

    const eight = ['Paz', 'Quique', 'Rita', 'Sol'].reduce(
      (match, name) => accepted(match, name),
      four,
    );
    expect(continueSetup(eight)).toEqual({ ok: true, match: eight });
    const nine: LocalSetupMatch = {
      ...eight,
      players: [...eight.players, { id: '9', name: 'Teo' }],
    };
    expect(continueSetup(nine)).toEqual({
      ok: false,
      match: nine,
      message: fullLocalMatchMessage,
    });
  });

  it('continuar vuelve a rechazar un nombre vacío guardado', () => {
    const four = ['Ana', 'Luis', 'Nora', 'Otto'].reduce(
      (match, name) => accepted(match, name),
      createSetupMatch(),
    );
    const blank: LocalSetupMatch = {
      ...four,
      players: [{ ...four.players[0], name: '   ' }, ...four.players.slice(1)],
    };
    expect(continueSetup(blank)).toEqual({
      ok: false,
      match: blank,
      message: emptyNameMessage,
    });
  });

  it('inicializa la partida válida y no crea otra al repetir', () => {
    const four = ['Ana', 'Luis', 'Nora', 'Otto'].reduce(
      (match, name) => accepted(match, name),
      createSetupMatch(),
    );
    const first = initializeLocalMatch(four);
    expect(first).toEqual({ ok: true, match: four });
    if (!first.ok) {
      return;
    }
    expect(first.match.status).toBe('preparing');
    expect(first.match.phase).toBe('setup');
    expect(first.match.piles).toEqual([]);
    expect(first.match.rounds).toEqual([]);
    expect(first.match.players.map((player) => player.name)).toEqual([
      'Ana',
      'Luis',
      'Nora',
      'Otto',
    ]);
    expect(first.match.players.map((player) => player.id)).toEqual([
      '1',
      '2',
      '3',
      '4',
    ]);
    const second = initializeLocalMatch(first.match);
    expect(second.ok).toBe(true);
    if (second.ok) {
      expect(second.match).toBe(first.match);
    }
  });

  it('no inicializa nombres repetidos y sí distingue las mayúsculas', () => {
    const four = ['Ana', 'Luis', 'Nora', 'Otto'].reduce(
      (match, name) => accepted(match, name),
      createSetupMatch(),
    );
    const duplicated: LocalSetupMatch = {
      ...four,
      players: [
        four.players[0],
        { id: '5', name: 'Ana' },
        ...four.players.slice(1),
      ],
    };
    expect(initializeLocalMatch(duplicated)).toEqual({
      ok: false,
      match: duplicated,
      message: duplicateLocalNameMessage,
    });
    const distinct = ['Ana', 'ana', 'Luis', 'Nora'].reduce(
      (match, name) => accepted(match, name),
      createSetupMatch(),
    );
    expect(initializeLocalMatch(distinct).ok).toBe(true);
  });

  it('revisa, vuelve y cancela sin perder los nombres', () => {
    const four = ['Ana', 'Luis', 'Nora', 'Otto'].reduce(
      (match, name) => accepted(match, name),
      createSetupMatch(),
    );
    const opened = openSetupReview(four);
    expect(opened).toEqual({ reviewing: true, match: four });
    expect(returnToEdit(four)).toBe(four);
    expect(cancelSetupReview(four)).toBe(four);
    expect(four.players.map((player) => player.name)).toEqual([
      'Ana',
      'Luis',
      'Nora',
      'Otto',
    ]);
  });

  it('confirmar vuelve a validar y no reemplaza una lista inválida', () => {
    const four = ['Ana', 'Luis', 'Nora', 'Otto'].reduce(
      (match, name) => accepted(match, name),
      createSetupMatch(),
    );
    const confirmed = confirmSetupReview(four);
    expect(confirmed).toEqual({ ok: true, match: four });
    if (confirmed.ok) {
      expect(confirmSetupReview(confirmed.match).match).toBe(confirmed.match);
    }
    const three = ['Ana', 'Luis', 'Nora'].reduce(
      (match, name) => accepted(match, name),
      createSetupMatch(),
    );
    const rejected = confirmSetupReview(three);
    expect(rejected).toEqual({
      ok: false,
      match: three,
      message: tooFewLocalPlayersMessage,
    });
    expect(openSetupReview(three)).toEqual({
      reviewing: false,
      match: three,
      message: tooFewLocalPlayersMessage,
    });
  });

  it('inicializa de 4 a 8 jugadores sin repartir', () => {
    const names = [
      'Ana',
      'Luis',
      'Nora',
      'Otto',
      'Paz',
      'Quique',
      'Rita',
      'Sol',
    ];
    for (const count of [4, 5, 6, 7, 8]) {
      const match = names
        .slice(0, count)
        .reduce((current, name) => accepted(current, name), createSetupMatch());
      const first = initializeLocalMatch(match);
      expect(first).toEqual({ ok: true, match });
      expect(match.status).toBe('preparing');
      expect(match.phase).toBe('setup');
      expect(match.piles).toEqual([]);
      expect(match.rounds).toEqual([]);
      expect(match.players.map((player) => player.name)).toEqual(
        names.slice(0, count),
      );
      const second = initializeLocalMatch(match);
      expect(second.ok).toBe(true);
      if (second.ok) {
        expect(second.match).toBe(match);
      }
    }
  });

  it('cancelar deja confirmar otra vez el mismo documento', () => {
    const four = ['Ana', 'Luis', 'Nora', 'Otto'].reduce(
      (match, name) => accepted(match, name),
      createSetupMatch(),
    );
    const opened = openSetupReview(four);
    expect(opened.reviewing).toBe(true);
    const cancelled = cancelSetupReview(four);
    expect(cancelled).toBe(four);
    const confirmed = confirmSetupReview(cancelled);
    expect(confirmed).toEqual({ ok: true, match: four });
  });

  it('una confirmación ya aceptada no produce otro documento', () => {
    const four = ['Ana', 'Luis', 'Nora', 'Otto'].reduce(
      (match, name) => accepted(match, name),
      createSetupMatch(),
    );
    const first = confirmPendingSetup(four, false);
    expect(first).toEqual({ entered: true, ok: true, match: four });
    const second = confirmPendingSetup(four, true);
    expect(second).toEqual({ entered: false, match: four });
    expect(second.match).toBe(four);
  });

  it('una partida repartida no pierde jugadores', () => {
    const four = ['Ana', 'Luis', 'Nora', 'Otto'].reduce(
      (match, name) => accepted(match, name),
      createSetupMatch(),
    );
    const dealt = dealLocalMatch(four, localCatalogSituations(), fixedRng);
    expect(dealt.ok).toBe(true);
    if (!dealt.ok) {
      return;
    }
    expect(localRosterMutable(dealt.match)).toBe(false);
    const names = dealt.match.players.map((player) => player.name);
    const ids = dealt.match.players.map((player) => player.id);
    const changes = [
      addPlayer(dealt.match, 'Paz'),
      renamePlayer(dealt.match, dealt.match.players[0].id, 'Otro'),
      removePlayer(dealt.match, dealt.match.players[0].id),
    ];
    for (const change of changes) {
      expect(change).toEqual({
        ok: false,
        match: dealt.match,
        message: startedLocalRosterMessage,
      });
    }
    expect(dealt.match.players.map((player) => player.name)).toEqual(names);
    expect(dealt.match.players.map((player) => player.id)).toEqual(ids);
  });

  it('un alta, una edición y una baja se recuperan con los mismos identificadores', async () => {
    const storage = memoryStorage();
    installLocalMatchStorage(storage);
    holdLocalMatch(null);
    const listed = ['Ana', 'Luis', 'Nora', 'Otto', 'Paz'].reduce(
      (current, name) => accepted(current, name),
      createSetupMatch(),
    );
    const renamed = renamePlayer(listed, listed.players[0].id, 'Nara');
    if (!renamed.ok) {
      throw new Error(renamed.message);
    }
    const removed = removePlayer(renamed.match, renamed.match.players[1].id);
    if (!removed.ok) {
      throw new Error('baja rechazada');
    }
    const added = addPlayer(removed.match, 'Quique');
    if (!added.ok) {
      throw new Error(added.message);
    }
    expect(added.match.players).toEqual([
      { id: '1', name: 'Nara' },
      { id: '3', name: 'Nora' },
      { id: '4', name: 'Otto' },
      { id: '5', name: 'Paz' },
      { id: '6', name: 'Quique' },
    ]);
    expect(await commitLocalMatch(added.match)).toEqual({ ok: true });
    const saved = storage.raw(activeMatchKey);
    const restarted = memoryStorage();
    installLocalMatchStorage(restarted);
    holdLocalMatch(null);
    if (saved === null) {
      throw new Error('no se guardó');
    }
    await restarted.setItem(activeMatchKey, saved);
    expect(await recoverActiveMatch()).toEqual({
      status: 'ready',
      route: 'LocalSetup',
    });
    expect(readLocalMatch()?.players).toEqual([
      { id: '1', name: 'Nara' },
      { id: '3', name: 'Nora' },
      { id: '4', name: 'Otto' },
      { id: '5', name: 'Paz' },
      { id: '6', name: 'Quique' },
    ]);
  });
});

const fixedRng: LocalRng = {
  sample(items, count) {
    return items.slice(0, count);
  },
  shuffle(items) {
    return [...items].reverse();
  },
};

function memoryStorage(): LocalMatchStorage & {
  raw(key: string): string | null;
} {
  const items = new Map<string, string>();
  return {
    raw: (key) => items.get(key) ?? null,
    getItem: async (key) => items.get(key) ?? null,
    setItem: async (key, value) => {
      items.set(key, value);
    },
    removeItem: async (key) => {
      items.delete(key);
    },
  };
}
