export const invalidLocalPlayerCountMessage =
  'La partida admite entre 4 y 8 jugadores.';
export const distinctLocalPilesMessage =
  'Las pilas deben ser cartas distintas.';
export const threeLocalCopiesMessage =
  'Cada pila tiene tres copias de la misma carta.';
export const localPilesAlreadyStoredMessage = 'La partida ya tiene sus pilas.';
export const roundStillOpenMessage = 'La ronda anterior sigue abierta.';
export const insufficientLocalPilesMessage =
  'No quedan pilas suficientes para otra ronda.';
export const localGameFinishedMessage = 'La partida ya terminó.';
export const insufficientLocalCardsMessage =
  'No hay cartas suficientes para repartir.';
export const missingLocalHandMessage = 'Falta la mano de un jugador.';
export const duplicateLocalClassificationMessage =
  'Un jugador no puede clasificarse dos veces.';
export const invalidLocalSituationCountMessage =
  'Una situación repartida debe aparecer una, dos o tres veces.';

const minPlayers = 4;
const maxPlayers = 8;
const smallGameMaxPlayers = 6;
const smallGamePiles = 15;
const smallGamePilesPerRound = 3;
const smallGameMaxRounds = 5;
const largeGamePiles = 16;
const largeGamePilesPerRound = 4;
const largeGameMaxRounds = 4;
const copiesPerCard = 3;

export type LocalDeckConfig = {
  pileCount: number;
  copiesPerPile: number;
  pilesPerRound: number;
  maxRounds: number;
};

export type LocalSituation = {
  number: number;
  copies: readonly number[];
  text?: string;
};

export type LocalPile = {
  number: number;
  copies: readonly number[];
  text?: string;
};

export type LocalCopy = {
  number: number;
  copy: number;
};

export type LocalHand = {
  playerId: string;
  number: number;
  copy: number;
};

export type LocalVoteGesture = 'point' | 'fist' | 'v';

export type LocalVoteDraft = {
  playerId: string;
  gesture: LocalVoteGesture;
  targets: readonly string[];
};

export type LocalAward = {
  playerId: string;
  points: number;
};

export type LocalRound = {
  number: number;
  status: 'prepared' | 'conversation' | 'voting' | 'finished';
  piles: readonly number[];
  hands: readonly LocalHand[];
  discard: readonly LocalCopy[];
  drafts?: readonly LocalVoteDraft[];
  awards?: readonly LocalAward[];
};

export type LocalMatch = {
  version: 1;
  status: 'preparing' | 'in_progress' | 'finished';
  phase:
    'setup' | 'viewing' | 'conversation' | 'recording' | 'results' | 'finished';
  players: readonly { id: string; name: string }[];
  piles: readonly LocalPile[];
  rounds: readonly LocalRound[];
};

export type RoundChange =
  | { ok: true; match: LocalMatch }
  | { ok: false; match: LocalMatch; message: string };

export type LocalRng = {
  sample: <T>(items: readonly T[], count: number) => readonly T[];
  shuffle: <T>(items: readonly T[]) => readonly T[];
};

export function localPileCountMessage(pileCount: number): string {
  return `Esta partida necesita ${pileCount} pilas distintas.`;
}

export function localDeckConfig(
  playerCount: number,
): { ok: true; config: LocalDeckConfig } | { ok: false; message: string } {
  if (
    !Number.isInteger(playerCount) ||
    playerCount < minPlayers ||
    playerCount > maxPlayers
  ) {
    return { ok: false, message: invalidLocalPlayerCountMessage };
  }
  if (playerCount <= smallGameMaxPlayers) {
    return {
      ok: true,
      config: {
        pileCount: smallGamePiles,
        copiesPerPile: copiesPerCard,
        pilesPerRound: smallGamePilesPerRound,
        maxRounds: smallGameMaxRounds,
      },
    };
  }
  return {
    ok: true,
    config: {
      pileCount: largeGamePiles,
      copiesPerPile: copiesPerCard,
      pilesPerRound: largeGamePilesPerRound,
      maxRounds: largeGameMaxRounds,
    },
  };
}

export function createLocalPiles(
  match: LocalMatch,
  situations: readonly LocalSituation[],
): RoundChange {
  const config = localDeckConfig(match.players.length);
  if (!config.ok) {
    return { ok: false, match, message: config.message };
  }
  if (match.piles.length > 0) {
    return { ok: false, match, message: localPilesAlreadyStoredMessage };
  }
  if (situations.length !== config.config.pileCount) {
    return {
      ok: false,
      match,
      message: localPileCountMessage(config.config.pileCount),
    };
  }
  const numbers = situations.map((situation) => situation.number);
  if (new Set(numbers).size !== numbers.length) {
    return { ok: false, match, message: distinctLocalPilesMessage };
  }
  if (
    situations.some(
      (situation) => situation.copies.length !== config.config.copiesPerPile,
    )
  ) {
    return { ok: false, match, message: threeLocalCopiesMessage };
  }
  return {
    ok: true,
    match: {
      ...match,
      piles: situations.map((situation) => ({
        number: situation.number,
        copies: [...situation.copies],
        ...(situation.text === undefined ? {} : { text: situation.text }),
      })),
    },
  };
}

export function prepareLocalRound(
  match: LocalMatch,
  rng: LocalRng,
): RoundChange {
  if (match.status === 'finished') {
    return { ok: false, match, message: localGameFinishedMessage };
  }
  if (match.rounds.some((round) => round.status !== 'finished')) {
    return { ok: false, match, message: roundStillOpenMessage };
  }
  const remain = localPilesRemain(match);
  if (!remain.ok) {
    return { ok: false, match, message: remain.message };
  }
  if (!remain.another) {
    return {
      ok: false,
      match: { ...match, status: 'finished' },
      message: insufficientLocalPilesMessage,
    };
  }
  const available = availablePiles(match);
  const chosen = [...rng.sample(available, remain.config.pilesPerRound)];
  const copies = [...rng.shuffle(roundCopies(chosen))];
  if (copies.length < match.players.length) {
    return { ok: false, match, message: insufficientLocalCardsMessage };
  }
  return {
    ok: true,
    match: {
      ...match,
      phase: 'viewing',
      rounds: [
        ...match.rounds,
        {
          number: match.rounds.length + 1,
          status: 'conversation',
          piles: chosen.map((pile) => pile.number),
          hands: match.players.map((player, index) => ({
            playerId: player.id,
            number: copies[index].number,
            copy: copies[index].copy,
          })),
          discard: copies.slice(match.players.length),
          drafts: [],
        },
      ],
    },
  };
}

export function localPilesRemain(
  match: LocalMatch,
):
  | { ok: false; message: string }
  | { ok: true; another: boolean; config: LocalDeckConfig } {
  const config = localDeckConfig(match.players.length);
  if (!config.ok) {
    return config;
  }
  if (match.piles.length !== config.config.pileCount) {
    return {
      ok: false,
      message: localPileCountMessage(config.config.pileCount),
    };
  }
  return {
    ok: true,
    another:
      match.rounds.length < config.config.maxRounds &&
      availablePiles(match).length >= config.config.pilesPerRound,
    config: config.config,
  };
}

function availablePiles(match: LocalMatch): LocalPile[] {
  const used = new Set(match.rounds.flatMap((round) => [...round.piles]));
  return match.piles
    .filter((pile) => !used.has(pile.number))
    .sort((left, right) => left.number - right.number);
}

export type LocalRoundPublic = {
  number: number;
  status: LocalRound['status'];
  playerIds: readonly string[];
  dealtCount: number;
  discardCount: number;
};

export function localRoundPublic(
  match: LocalMatch,
  round: LocalRound,
): LocalRoundPublic {
  return {
    number: round.number,
    status: round.status,
    playerIds: match.players.map((player) => player.id),
    dealtCount: round.hands.length,
    discardCount: round.discard.length,
  };
}

export function ownLocalCard(
  round: LocalRound,
  playerId: string,
): { ok: true; number: number; copy: number } | { ok: false; message: string } {
  const hands = round.hands.filter((hand) => hand.playerId === playerId);
  if (hands.length === 0) {
    return { ok: false, message: missingLocalHandMessage };
  }
  const hand = hands[0];
  if (hands.length > 1 || hand === undefined) {
    return { ok: false, message: duplicateLocalClassificationMessage };
  }
  return { ok: true, number: hand.number, copy: hand.copy };
}

export type LocalAssignment = {
  playerId: string;
  situation: number;
};

export type LocalTeam = {
  situation: number;
  players: readonly string[];
};

export type LocalImpostor = {
  situation: number;
  player: string;
};

export function classifyLocalHands(assignments: readonly LocalAssignment[]):
  | {
      ok: true;
      teams: readonly LocalTeam[];
      impostors: readonly LocalImpostor[];
    }
  | { ok: false; message: string } {
  const seen = new Set<string>();
  const grouped = new Map<number, string[]>();
  for (const assignment of assignments) {
    if (seen.has(assignment.playerId)) {
      return { ok: false, message: duplicateLocalClassificationMessage };
    }
    seen.add(assignment.playerId);
    const players = grouped.get(assignment.situation) ?? [];
    players.push(assignment.playerId);
    grouped.set(assignment.situation, players);
  }

  const teams: LocalTeam[] = [];
  const impostors: LocalImpostor[] = [];
  for (const [situation, players] of grouped) {
    const ordered = [...players].sort(compareText);
    if (ordered.length === 1) {
      impostors.push({ situation, player: ordered[0] });
    } else if (ordered.length === 2 || ordered.length === 3) {
      teams.push({ situation, players: ordered });
    } else {
      return { ok: false, message: invalidLocalSituationCountMessage };
    }
  }
  teams.sort((left, right) => left.situation - right.situation);
  impostors.sort(
    (left, right) =>
      left.situation - right.situation ||
      compareText(left.player, right.player),
  );
  return { ok: true, teams, impostors };
}

function compareText(left: string, right: string): number {
  if (left < right) {
    return -1;
  }
  if (left > right) {
    return 1;
  }
  return 0;
}

function roundCopies(piles: readonly LocalPile[]): LocalCopy[] {
  return piles
    .flatMap((pile) =>
      pile.copies.map((copy) => ({ number: pile.number, copy })),
    )
    .sort(
      (left, right) => left.number - right.number || left.copy - right.copy,
    );
}
