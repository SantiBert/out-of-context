import { describe, expect, it } from '@jest/globals';

import {
  commitLocalMatch,
  installLocalMatchStorage,
} from '../src/features/local/match/autosave';
import {
  localRecoveryPresentation,
  recoverActiveMatch,
} from '../src/features/local/match/resume';
import {
  addPlayer,
  confirmPendingSetup,
  createSetupMatch,
} from '../src/features/local/match/setup';
import {
  activeMatchKey,
  activeMatchTempKey,
  deleteActiveMatch,
  readActiveMatch,
  type LocalMatchStorage,
} from '../src/features/local/match/storage';
import {
  closeLocalDeal,
  hideLocalCard,
  holdLocalMatch,
  readLocalMatch,
  resumedLocalPass,
  revealLocalCard,
  startLocalPass,
} from '../src/features/local/match/viewing';
import {
  localScoreboard,
  settleLocalRound,
} from '../src/features/local/rules/board';
import {
  localResultView,
  openLocalResults,
} from '../src/features/local/rules/reveal';
import {
  createLocalPiles,
  localDeckConfig,
  localPilesRemain,
  prepareLocalRound,
  type LocalMatch,
  type LocalRng,
  type LocalSituation,
} from '../src/features/local/rules/round';
import {
  localTotals,
  scoreLocalRound,
} from '../src/features/local/rules/score';
import {
  closeLocalVote,
  confirmLocalVotes,
  missingLocalVoteMessage,
  openLocalRecording,
  saveLocalVote,
} from '../src/features/local/rules/vote';

// Cortes cubiertos: configuración, reparto, conversación, votos parciales,
// votos confirmados, resultados, paso de ronda y final. También un reemplazo
// cortado, un JSON ilegible y otra versión.
//
// Sigue sin contrato, y estas pruebas no lo cierran:
// - Descartar un archivo inválido sigue pendiente. Abandonar y reiniciar tienen
//   sus propias pruebas. El borrado de abajo ejercita solo el puerto.
// - La partida finished sigue siendo el documento activo. No hay historial.
// - El puerto instalado es memoria: cerrar el proceso no conserva el archivo.
// - La pasada visible no forma parte del documento.

const historyKey = 'ooc.local.history';
const guestKey = 'ooc.guest.session';
const cardText = 'Lenguaje';

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
  keys(): string[];
  writes(): number;
} {
  const items = new Map<string, string>();
  let writes = 0;
  return {
    raw: (key) => items.get(key) ?? null,
    keys: () => [...items.keys()],
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

function taken(
  result: { ok: true; match: LocalMatch } | { ok: false },
): LocalMatch {
  expect(result.ok).toBe(true);
  if (!result.ok) {
    throw new Error('transición rechazada');
  }
  return result.match;
}

function acceptedNames(): LocalMatch {
  let match = createSetupMatch();
  for (const name of ['Ana', 'Luis', 'Nora', 'Otto']) {
    const added = addPlayer(match, name);
    expect(added.ok).toBe(true);
    if (!added.ok) {
      return match;
    }
    match = added.match;
  }
  const confirmed = confirmPendingSetup(match, false);
  expect(confirmed).toEqual({ entered: true, ok: true, match });
  return match;
}

function situations(count: number): LocalSituation[] {
  return Array.from({ length: count }, (_, index) => ({
    number: index + 1,
    copies: [1, 2, 3],
    ...(index === 0 ? { text: cardText } : {}),
  }));
}

function storedPiles(match: LocalMatch): LocalMatch {
  const config = localDeckConfig(match.players.length);
  expect(config.ok).toBe(true);
  if (!config.ok) {
    return match;
  }
  return taken(createLocalPiles(match, situations(config.config.pileCount)));
}

function dealt(): LocalMatch {
  return taken(prepareLocalRound(storedPiles(acceptedNames()), fixedRng));
}

function concealed(match: LocalMatch): LocalMatch {
  let pass = startLocalPass();
  for (let index = 0; index < match.players.length; index += 1) {
    pass = hideLocalCard(revealLocalCard(pass), match.players.length);
  }
  return taken(closeLocalDeal(match, pass));
}

function talked(): LocalMatch {
  return concealed(dealt());
}

function partialVotes(): LocalMatch {
  const match = taken(openLocalRecording(talked()));
  const playerId = match.players[0]?.id ?? '';
  const first = taken(
    saveLocalVote(match, 1, { playerId, gesture: 'fist', targets: [] }),
  );
  return taken(
    saveLocalVote(first, 1, { playerId, gesture: 'fist', targets: [] }),
  );
}

function confirmedVotes(): LocalMatch {
  let match = taken(openLocalRecording(talked()));
  const roundNumber = match.rounds[0]?.number ?? 1;
  for (const player of match.players) {
    match = taken(
      saveLocalVote(match, roundNumber, {
        playerId: player.id,
        gesture: 'fist',
        targets: [],
      }),
    );
  }
  match = taken(confirmLocalVotes(match, roundNumber));
  return taken(closeLocalVote(match, roundNumber));
}

function evaluated(): LocalMatch {
  const match = confirmedVotes();
  const roundNumber = match.rounds[0]?.number ?? 1;
  return taken(openLocalResults(match, roundNumber));
}

function betweenRounds(): LocalMatch {
  const match = evaluated();
  const roundNumber = match.rounds[0]?.number ?? 1;
  return taken(settleLocalRound(match, roundNumber));
}

function finishedMatch(): LocalMatch {
  let match = storedPiles(acceptedNames());
  for (let step = 0; step < 40 && match.status !== 'finished'; step += 1) {
    const open = match.rounds.find((round) => round.status !== 'finished');
    if (open === undefined) {
      match = taken(prepareLocalRound(match, fixedRng));
      continue;
    }
    if (match.phase === 'viewing') {
      match = concealed(match);
      continue;
    }
    if (match.phase === 'conversation') {
      match = taken(openLocalRecording(match));
      continue;
    }
    if (open.status !== 'voting') {
      for (const player of match.players) {
        match = taken(
          saveLocalVote(match, open.number, {
            playerId: player.id,
            gesture: 'fist',
            targets: [],
          }),
        );
      }
      match = taken(confirmLocalVotes(match, open.number));
      match = taken(closeLocalVote(match, open.number));
      continue;
    }
    if (match.phase !== 'results') {
      match = taken(openLocalResults(match, open.number));
      continue;
    }
    match = taken(settleLocalRound(match, open.number));
  }
  return match;
}

async function restartFrom(match: LocalMatch) {
  const origin = memoryStorage();
  installLocalMatchStorage(origin);
  holdLocalMatch(null);
  expect(await commitLocalMatch(match)).toEqual({ ok: true });
  const raw = origin.raw(activeMatchKey);
  expect(raw).toBe(JSON.stringify(match));
  expect(origin.raw(activeMatchTempKey)).toBeNull();
  expect(origin.keys()).toEqual([activeMatchKey]);

  const restarted = memoryStorage();
  installLocalMatchStorage(restarted);
  holdLocalMatch(null);
  await restarted.setItem(guestKey, 'token-online');
  if (raw !== null) {
    await restarted.setItem(activeMatchKey, raw);
  }
  const writes = restarted.writes();
  const recovery = await recoverActiveMatch();
  return {
    recovery,
    held: readLocalMatch(),
    restarted,
    writes,
    raw,
  };
}

function awardCounts(match: LocalMatch): number[] {
  return match.rounds.map((round) => round.awards?.length ?? 0);
}

describe('recuperación y consistencia de la partida presencial', () => {
  it('después de los nombres restaura la lista y no reparte', async () => {
    const match = acceptedNames();
    const { recovery, held, restarted, writes } = await restartFrom(match);

    expect(recovery).toEqual({ status: 'ready', route: 'LocalSetup' });
    expect(held).toEqual(match);
    expect(held?.piles).toEqual([]);
    expect(held?.rounds).toEqual([]);
    expect(localRecoveryPresentation(match)).toEqual({
      phase: 'setup',
      names: ['Ana', 'Luis', 'Nora', 'Otto'],
    });
    expect(restarted.writes()).toBe(writes);
    expect(restarted.raw(guestKey)).toBe('token-online');
    expect(restarted.keys()).not.toContain(historyKey);
  });

  it('después del reparto conserva manos y descarte, y la carta sigue oculta', async () => {
    const match = dealt();
    const round = match.rounds[0];
    const { recovery, held } = await restartFrom(match);
    const pass = resumedLocalPass({ index: 2, visible: true, done: false });

    expect(recovery).toEqual({ status: 'ready', route: 'LocalCard' });
    expect(held).toEqual(match);
    expect(held?.rounds).toHaveLength(1);
    expect(held?.rounds[0]?.hands).toEqual(round?.hands);
    expect(held?.rounds[0]?.discard).toEqual(round?.discard);
    expect(held?.rounds[0]?.piles).toEqual(round?.piles);
    expect(pass).toEqual({ index: 0, visible: false, done: false });
    expect(localRecoveryPresentation(match)).toEqual({
      phase: 'viewing',
      playerName: 'Ana',
      covered: true,
    });
    expect(JSON.stringify(localRecoveryPresentation(match))).not.toContain(
      cardText,
    );
    expect(JSON.stringify(held)).toContain(cardText);
  });

  it('después de la conversación no agrega votos', async () => {
    const match = talked();
    const { recovery, held } = await restartFrom(match);

    expect(recovery).toEqual({ status: 'ready', route: 'LocalTable' });
    expect(held).toEqual(match);
    expect(held?.phase).toBe('conversation');
    expect(held?.rounds).toHaveLength(1);
    expect(held?.rounds[0]?.drafts).toEqual([]);
    expect(held?.rounds[0]?.awards).toBeUndefined();
    expect(localRecoveryPresentation(match)).toEqual({ phase: 'conversation' });
  });

  it('después de un voto parcial conserva solo ese borrador', async () => {
    const match = partialVotes();
    const playerId = match.players[0]?.id;
    const { recovery, held } = await restartFrom(match);
    const presentation = localRecoveryPresentation(match);

    expect(recovery).toEqual({ status: 'ready', route: 'LocalRecord' });
    expect(held).toEqual(match);
    expect(held?.rounds[0]?.status).not.toBe('voting');
    expect(held?.rounds[0]?.drafts).toEqual([
      { playerId, gesture: 'fist', targets: [] },
    ]);
    expect(held?.rounds[0]?.awards).toBeUndefined();
    expect(confirmLocalVotes(match, 1)).toMatchObject({
      ok: false,
      message: missingLocalVoteMessage,
    });
    expect(presentation.phase).toBe('recording');
    if (presentation.phase === 'recording') {
      expect(presentation.rows.filter((row) => row.action !== null)).toEqual([
        { name: 'Ana', action: 'Puño' },
      ]);
      expect(presentation.rows).not.toHaveProperty('cardNumber');
    }
  });

  it('después de confirmar los votos no escribe puntos', async () => {
    const match = confirmedVotes();
    const { recovery, held } = await restartFrom(match);
    const presentation = localRecoveryPresentation(match);

    expect(recovery).toEqual({ status: 'ready', route: 'LocalRecord' });
    expect(held).toEqual(match);
    expect(held?.rounds[0]?.status).toBe('voting');
    expect(held?.rounds[0]?.drafts).toHaveLength(match.players.length);
    expect(
      new Set(held?.rounds[0]?.drafts?.map((draft) => draft.playerId)).size,
    ).toBe(match.players.length);
    expect(held?.rounds[0]?.awards).toBeUndefined();
    expect(localResultView(match, 1).ok).toBe(false);
    expect(presentation.phase).toBe('recording');
    if (presentation.phase === 'recording') {
      expect(presentation.rows.every((row) => row.action === 'Puño')).toBe(
        true,
      );
    }
  });

  it('después de evaluar conserva los puntos ya escritos', async () => {
    const match = evaluated();
    const roundNumber = match.rounds[0]?.number ?? 1;
    const awards = match.rounds[0]?.awards;
    const { recovery, held } = await restartFrom(match);
    const again = scoreLocalRound(match, roundNumber);

    expect(recovery).toEqual({ status: 'ready', route: 'LocalResults' });
    expect(held).toEqual(match);
    expect(awards).toHaveLength(match.players.length);
    expect(again.match).toBe(match);
    expect(held?.rounds[0]?.awards).toEqual(awards);
    expect(localTotals(match)).toHaveLength(match.players.length);
    expect(localScoreboard(match).winners).toEqual([]);
    const presentation = localRecoveryPresentation(match);
    expect(presentation.phase).toBe('results');
    if (presentation.phase === 'results') {
      expect(presentation.rows.map((row) => row.roundPoints)).toEqual(
        awards?.map((award) => award.points),
      );
    }
  });

  it('entre rondas no reparte al restaurar', async () => {
    const match = betweenRounds();
    const used = match.rounds[0]?.piles;
    const remain = localPilesRemain(match);
    const { recovery, held } = await restartFrom(match);

    expect(remain).toMatchObject({ ok: true, another: true });
    expect(recovery).toEqual({ status: 'ready', route: 'LocalResults' });
    expect(held).toEqual(match);
    expect(held?.status).toBe('preparing');
    expect(held?.phase).toBe('results');
    expect(held?.rounds).toHaveLength(1);
    expect(held?.rounds[0]?.status).toBe('finished');
    expect(held?.rounds[0]?.piles).toEqual(used);
    expect(held?.piles).toHaveLength(match.piles.length);
  });

  it('al finalizar restaura el marcador y no archiva otra partida', async () => {
    const match = finishedMatch();
    const { recovery, held, restarted } = await restartFrom(match);
    const board = localScoreboard(match);

    expect(match.status).toBe('finished');
    expect(match.phase).toBe('finished');
    expect(match.rounds.length).toBeGreaterThan(1);
    expect(recovery).toEqual({ status: 'ready', route: 'LocalResults' });
    expect(held).toEqual(match);
    expect(awardCounts(match)).toEqual(
      match.rounds.map(() => match.players.length),
    );
    expect(localTotals(match)).toHaveLength(match.players.length);
    expect(board.standings).toHaveLength(match.players.length);
    expect(board.winners.length).toBeGreaterThan(0);
    expect(restarted.keys()).toEqual([guestKey, activeMatchKey]);
    expect(restarted.raw(historyKey)).toBeNull();
  });

  it('un reemplazo cortado deja el último documento activo', async () => {
    const previous = acceptedNames();
    const newer = dealt();
    const storage = memoryStorage();
    installLocalMatchStorage(storage);
    holdLocalMatch(null);
    await storage.setItem(activeMatchKey, JSON.stringify(previous));
    await storage.setItem(activeMatchTempKey, JSON.stringify(newer));

    expect(await recoverActiveMatch()).toEqual({
      status: 'ready',
      route: 'LocalSetup',
    });
    expect(readLocalMatch()).toEqual(previous);
    expect(storage.raw(activeMatchKey)).toBe(JSON.stringify(previous));
    expect(storage.raw(activeMatchTempKey)).toBe(JSON.stringify(newer));
    expect(readLocalMatch()?.rounds).toEqual([]);
  });

  it('una clave temporal sola no se promueve a partida activa', async () => {
    const storage = memoryStorage();
    installLocalMatchStorage(storage);
    holdLocalMatch(null);
    await storage.setItem(activeMatchTempKey, JSON.stringify(dealt()));

    expect(await recoverActiveMatch()).toEqual({ status: 'absent' });
    expect(readLocalMatch()).toBeNull();
    expect(storage.raw(activeMatchKey)).toBeNull();
    expect(storage.raw(activeMatchTempKey)).toContain(cardText);
  });

  it('un JSON cortado o de otra versión queda guardado y no se reanuda', async () => {
    const broken = memoryStorage();
    installLocalMatchStorage(broken);
    holdLocalMatch(null);
    await broken.setItem(activeMatchKey, '{');

    expect(await recoverActiveMatch()).toEqual({ status: 'unavailable' });
    expect(readLocalMatch()).toBeNull();
    expect(broken.raw(activeMatchKey)).toBe('{');
    expect(await readActiveMatch(broken)).toEqual({
      ok: false,
      reason: 'invalid',
    });

    const foreign = memoryStorage();
    installLocalMatchStorage(foreign);
    holdLocalMatch(null);
    const raw = JSON.stringify({ ...dealt(), version: 2 });
    await foreign.setItem(activeMatchKey, raw);

    expect(await recoverActiveMatch()).toEqual({ status: 'unavailable' });
    expect(readLocalMatch()).toBeNull();
    expect(foreign.raw(activeMatchKey)).toBe(raw);
    expect(await readActiveMatch(foreign)).toEqual({
      ok: false,
      reason: 'version',
    });
    expect(JSON.stringify({ reason: 'version' })).not.toContain('Ana');
  });

  it('borrar el puerto deja la lectura ausente y no crea historial', async () => {
    const storage = memoryStorage();
    installLocalMatchStorage(storage);
    holdLocalMatch(null);
    expect(await commitLocalMatch(acceptedNames())).toEqual({ ok: true });

    expect(await deleteActiveMatch(storage)).toEqual({ ok: true });
    // El puerto no vacía la copia en memoria: las pantallas no abandonan.
    holdLocalMatch(null);
    expect(await readActiveMatch(storage)).toEqual({ ok: true, match: null });
    expect(await recoverActiveMatch()).toEqual({ status: 'absent' });
    expect(readLocalMatch()).toBeNull();
    expect(storage.raw(activeMatchKey)).toBeNull();
    expect(storage.raw(activeMatchTempKey)).toBeNull();
    expect(storage.keys()).not.toContain(historyKey);
  });
});
