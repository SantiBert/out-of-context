import { ownLocalCard, type LocalMatch, type LocalRound } from '../rules/round';

export type LocalPass = {
  index: number;
  visible: boolean;
  /** Reveló la carta al menos una vez en este turno (permite Continuar). */
  seen: boolean;
  done: boolean;
};

export type LocalCardView =
  | {
      kind: 'covered';
      playerName: string;
      /** Destino del teléfono tras Continuar; null si es el último. */
      nextPlayerName: string | null;
      canContinue: boolean;
      canGoBack: boolean;
    }
  | {
      kind: 'visible';
      playerName: string;
      nextPlayerName: string | null;
      number: number;
      text?: string;
      canContinue: boolean;
      canGoBack: boolean;
    }
  | { kind: 'complete' };

export const pendingLocalViewersMessage = 'Falta que alguien mire su carta.';

export type LocalDealClose =
  | { ok: true; match: LocalMatch }
  | { ok: false; match: LocalMatch; message: string };

let heldMatch: LocalMatch | null = null;

export function readLocalMatch(): LocalMatch | null {
  return heldMatch;
}

export function holdLocalMatch(match: LocalMatch | null): void {
  heldMatch = match;
}

export function startLocalPass(): LocalPass {
  return { index: 0, visible: false, seen: false, done: false };
}

export function resumedLocalPass(pass?: LocalPass): LocalPass {
  void pass;
  return startLocalPass();
}

export function revealLocalCard(pass: LocalPass): LocalPass {
  if (pass.done || pass.visible) {
    return pass;
  }
  return { ...pass, visible: true, seen: true };
}

export function coverLocalCard(pass: LocalPass): LocalPass {
  if (!pass.visible || pass.done) {
    return pass;
  }
  return { ...pass, visible: false };
}

export function advanceLocalPass(pass: LocalPass): LocalPass {
  return pass;
}

export function retreatLocalPass(pass: LocalPass): LocalPass {
  if (pass.done || pass.index <= 0) {
    return pass;
  }
  return {
    index: pass.index - 1,
    visible: false,
    seen: false,
    done: false,
  };
}

export function closeLocalDeal(
  match: LocalMatch,
  pass: LocalPass,
): LocalDealClose {
  if (!pass.done) {
    return { ok: false, match, message: pendingLocalViewersMessage };
  }
  if (match.phase === 'conversation') {
    return { ok: true, match };
  }
  return { ok: true, match: { ...match, phase: 'conversation' } };
}

/**
 * Avanza al siguiente jugador tras haber mirado la carta (`seen`).
 * Cubre siempre al avanzar (no deja la carta visible).
 */
export function hideLocalCard(pass: LocalPass, playerCount: number): LocalPass {
  if (!pass.seen || pass.done) {
    return pass;
  }
  if (pass.index + 1 >= playerCount) {
    return { index: pass.index, visible: false, seen: false, done: true };
  }
  return {
    index: pass.index + 1,
    visible: false,
    seen: false,
    done: false,
  };
}

export function localCardView(
  match: LocalMatch,
  pass: LocalPass,
): LocalCardView {
  if (pass.done) {
    return { kind: 'complete' };
  }
  const player = match.players[pass.index];
  if (player === undefined) {
    return { kind: 'complete' };
  }
  const canContinue = pass.seen;
  const canGoBack = pass.index > 0;
  const next = match.players[pass.index + 1];
  const nextPlayerName = next === undefined ? null : next.name;
  if (!pass.visible) {
    return {
      kind: 'covered',
      playerName: player.name,
      nextPlayerName,
      canContinue,
      canGoBack,
    };
  }
  const round = dealtRound(match);
  const card = round ? ownLocalCard(round, player.id) : { ok: false as const };
  if (!card.ok) {
    return {
      kind: 'covered',
      playerName: player.name,
      nextPlayerName,
      canContinue,
      canGoBack,
    };
  }
  const text = match.piles.find((pile) => pile.number === card.number)?.text;
  return {
    kind: 'visible',
    playerName: player.name,
    nextPlayerName,
    number: card.number,
    canContinue,
    canGoBack,
    ...(text === undefined ? {} : { text }),
  };
}

function dealtRound(match: LocalMatch): LocalRound | undefined {
  return match.rounds.find(
    (round) => round.status !== 'finished' && round.hands.length > 0,
  );
}
