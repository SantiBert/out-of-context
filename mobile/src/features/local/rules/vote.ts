import type { LocalMatch, LocalVoteDraft, LocalVoteGesture } from './round';

export const invalidLocalGestureMessage = 'El gesto no está permitido.';
export const outsideLocalVotePlayerMessage =
  'El jugador no pertenece a la ronda.';
export const repeatedLocalTargetMessage =
  'El señalamiento no admite objetivos repetidos.';
export const selfLocalTargetMessage =
  'Un jugador no puede señalarse a sí mismo.';
export const outsideLocalTargetMessage = 'El objetivo no pertenece a la ronda.';
export const emptyLocalPointMessage =
  'El gesto de señalar exige al menos un jugador.';
export const gesturedLocalTargetMessage =
  'El puño y la V no señalan jugadores.';
export const closedLocalVoteMessage = 'La ronda no admite votos.';
export const missingLocalVoteMessage = 'Falta el voto de un jugador.';
export const voteAlreadyClosedMessage = 'La votación ya cerró.';

const gestures = new Set<LocalVoteGesture>(['point', 'fist', 'v']);

export type LocalVoteChange =
  | { ok: true; match: LocalMatch }
  | { ok: false; match: LocalMatch; message: string };

export type LocalVoteRow = {
  playerId: string;
  name: string;
  registered: boolean;
};

export type LocalVoteForm = {
  playerName: string;
  others: readonly { id: string; name: string }[];
  draft: LocalVoteDraft | null;
};

export type LocalVoteReview =
  | { registered: false; name: string }
  | {
      registered: true;
      name: string;
      gesture: LocalVoteGesture;
      targetNames: readonly string[];
    };

export type LocalVoteSummary = {
  playerId: string;
  name: string;
  registered: boolean;
  action: string | null;
};

export function localVoteRoster(
  match: LocalMatch,
  roundNumber: number,
): readonly LocalVoteRow[] {
  const round = findRound(match, roundNumber);
  const drafted = new Set((round?.drafts ?? []).map((draft) => draft.playerId));
  return match.players.map((player) => ({
    playerId: player.id,
    name: player.name,
    registered: drafted.has(player.id),
  }));
}

export function localVoteForm(
  match: LocalMatch,
  roundNumber: number,
  playerId: string,
): LocalVoteForm | undefined {
  const player = match.players.find((item) => item.id === playerId);
  if (player === undefined) {
    return undefined;
  }
  const round = findRound(match, roundNumber);
  return {
    playerName: player.name,
    others: match.players
      .filter((item) => item.id !== playerId)
      .map((item) => ({ id: item.id, name: item.name })),
    draft: round?.drafts?.find((draft) => draft.playerId === playerId) ?? null,
  };
}

export function reviewLocalVote(
  match: LocalMatch,
  roundNumber: number,
  playerId: string,
): LocalVoteReview | undefined {
  const player = match.players.find((item) => item.id === playerId);
  if (player === undefined) {
    return undefined;
  }
  const draft = findRound(match, roundNumber)?.drafts?.find(
    (item) => item.playerId === playerId,
  );
  if (draft === undefined) {
    return { registered: false, name: player.name };
  }
  const names = new Map(match.players.map((item) => [item.id, item.name]));
  return {
    registered: true,
    name: player.name,
    gesture: draft.gesture,
    targetNames: draft.targets.map((id) => names.get(id) ?? id),
  };
}

export function localVoteSummary(
  match: LocalMatch,
  roundNumber: number,
): readonly LocalVoteSummary[] {
  return match.players.map((player) => {
    const review = reviewLocalVote(match, roundNumber, player.id);
    if (review === undefined || !review.registered) {
      return {
        playerId: player.id,
        name: player.name,
        registered: false,
        action: null,
      };
    }
    return {
      playerId: player.id,
      name: player.name,
      registered: true,
      action: recordedAction(review),
    };
  });
}

export function confirmLocalVotes(
  match: LocalMatch,
  roundNumber: number,
): LocalVoteChange {
  const round = match.rounds.find(
    (item) => item.number === roundNumber && item.status !== 'finished',
  );
  if (round === undefined) {
    return { ok: false, match, message: closedLocalVoteMessage };
  }
  const drafted = new Set((round.drafts ?? []).map((draft) => draft.playerId));
  if (match.players.some((player) => !drafted.has(player.id))) {
    return { ok: false, match, message: missingLocalVoteMessage };
  }
  return { ok: true, match };
}

export function closeLocalVote(
  match: LocalMatch,
  roundNumber: number,
): LocalVoteChange {
  const round = match.rounds.find((item) => item.number === roundNumber);
  if (round === undefined || round.status === 'finished') {
    return { ok: false, match, message: closedLocalVoteMessage };
  }
  if (round.status === 'voting') {
    return { ok: true, match };
  }
  const drafts = round.drafts ?? [];
  const drafted = new Set(drafts.map((draft) => draft.playerId));
  if (match.players.some((player) => !drafted.has(player.id))) {
    return { ok: false, match, message: missingLocalVoteMessage };
  }
  const playerIds = match.players.map((player) => player.id);
  for (const draft of drafts) {
    const checked = validateLocalVote(playerIds, draft);
    if (!checked.ok) {
      return { ok: false, match, message: checked.message };
    }
  }
  return {
    ok: true,
    match: {
      ...match,
      rounds: match.rounds.map((item) =>
        item.number === roundNumber ? { ...item, status: 'voting' } : item,
      ),
    },
  };
}

export function saveLocalVote(
  match: LocalMatch,
  roundNumber: number,
  draft: LocalVoteDraft,
): LocalVoteChange {
  const round = match.rounds.find((item) => item.number === roundNumber);
  if (round === undefined || round.status === 'finished') {
    return { ok: false, match, message: closedLocalVoteMessage };
  }
  if (round.status === 'voting') {
    return { ok: false, match, message: voteAlreadyClosedMessage };
  }
  const checked = validateLocalVote(
    match.players.map((player) => player.id),
    draft,
  );
  if (!checked.ok) {
    return { ok: false, match, message: checked.message };
  }
  return {
    ok: true,
    match: {
      ...match,
      rounds: match.rounds.map((item) =>
        item.number === roundNumber
          ? {
              ...item,
              drafts: [
                ...(item.drafts ?? []).filter(
                  (current) => current.playerId !== checked.draft.playerId,
                ),
                checked.draft,
              ],
            }
          : item,
      ),
    },
  };
}

export function openLocalRecording(match: LocalMatch): LocalVoteChange {
  if (match.phase !== 'conversation') {
    return { ok: false, match, message: closedLocalVoteMessage };
  }
  if (!match.rounds.some((round) => round.status !== 'finished')) {
    return { ok: false, match, message: closedLocalVoteMessage };
  }
  return { ok: true, match: { ...match, phase: 'recording' } };
}

function recordedAction(
  review: Extract<LocalVoteReview, { registered: true }>,
): string {
  if (review.gesture === 'fist') {
    return 'Puño';
  }
  if (review.gesture === 'v') {
    return 'V';
  }
  return `Señaló a ${review.targetNames.join(' y ')}.`;
}

function findRound(match: LocalMatch, roundNumber: number) {
  return match.rounds.find((round) => round.number === roundNumber);
}

function validateLocalVote(
  playerIds: readonly string[],
  draft: LocalVoteDraft,
): { ok: true; draft: LocalVoteDraft } | { ok: false; message: string } {
  const players = new Set(playerIds);
  if (!gestures.has(draft.gesture)) {
    return { ok: false, message: invalidLocalGestureMessage };
  }
  if (!players.has(draft.playerId)) {
    return { ok: false, message: outsideLocalVotePlayerMessage };
  }
  if (new Set(draft.targets).size !== draft.targets.length) {
    return { ok: false, message: repeatedLocalTargetMessage };
  }
  for (const target of draft.targets) {
    if (target === draft.playerId) {
      return { ok: false, message: selfLocalTargetMessage };
    }
    if (!players.has(target)) {
      return { ok: false, message: outsideLocalTargetMessage };
    }
  }
  if (draft.gesture === 'point' && draft.targets.length === 0) {
    return { ok: false, message: emptyLocalPointMessage };
  }
  if (draft.gesture !== 'point' && draft.targets.length > 0) {
    return { ok: false, message: gesturedLocalTargetMessage };
  }
  return {
    ok: true,
    draft: {
      playerId: draft.playerId,
      gesture: draft.gesture,
      targets: [...draft.targets],
    },
  };
}
