import { evaluateLocalTeam, localTotals, scoreLocalRound } from './score';
import {
  classifyLocalHands,
  missingLocalHandMessage,
  type LocalMatch,
  type LocalTeam,
  type LocalVoteDraft,
} from './round';
import { closedLocalVoteMessage, missingLocalVoteMessage } from './vote';

export const absentLocalResultMessage = 'Todavía no hay un resultado.';

export type LocalResultTeam = {
  situation: number;
  names: readonly string[];
};

export type LocalResultImpostor = {
  situation: number;
  name: string;
};

export type LocalResultRow = {
  playerId: string;
  name: string;
  cardNumber: number;
  cardText?: string;
  action: string;
  roundPoints: number;
  totalPoints: number;
  explanation: string;
};

export type LocalResultView =
  | {
      ok: true;
      teams: readonly LocalResultTeam[];
      impostors: readonly LocalResultImpostor[];
      rows: readonly LocalResultRow[];
    }
  | { ok: false; message: string };

export function openLocalResults(
  match: LocalMatch,
  roundNumber: number,
):
  | { ok: true; match: LocalMatch }
  | { ok: false; match: LocalMatch; message: string } {
  const round = match.rounds.find((item) => item.number === roundNumber);
  if (round === undefined || round.status !== 'voting') {
    return { ok: false, match, message: closedLocalVoteMessage };
  }
  if (match.phase === 'results') {
    return { ok: true, match };
  }
  const scored = scoreLocalRound(match, roundNumber);
  if (!scored.ok) {
    return scored;
  }
  if (scored.match.phase === 'results') {
    return scored;
  }
  return { ok: true, match: { ...scored.match, phase: 'results' } };
}

export function localResultView(
  match: LocalMatch,
  roundNumber: number,
): LocalResultView {
  if (match.phase !== 'results' && match.phase !== 'finished') {
    return { ok: false, message: absentLocalResultMessage };
  }
  const round = match.rounds.find((item) => item.number === roundNumber);
  if (
    round === undefined ||
    (round.status !== 'voting' && round.status !== 'finished') ||
    round.awards === undefined ||
    match.players.some(
      (player) => !round.awards?.some((award) => award.playerId === player.id),
    )
  ) {
    return { ok: false, message: absentLocalResultMessage };
  }
  const classified = classifyLocalHands(
    round.hands.map((hand) => ({
      playerId: hand.playerId,
      situation: hand.number,
    })),
  );
  if (!classified.ok) {
    return classified;
  }
  const names = new Map(
    match.players.map((player) => [player.id, player.name]),
  );
  const drafts = round.drafts ?? [];
  const drafted = new Set(drafts.map((draft) => draft.playerId));
  if (match.players.some((player) => !drafted.has(player.id))) {
    return { ok: false, message: missingLocalVoteMessage };
  }
  const totals = new Map(
    localTotals(match).map((award) => [award.playerId, award.points]),
  );
  const rows: LocalResultRow[] = [];
  for (const player of match.players) {
    const hand = round.hands.find((item) => item.playerId === player.id);
    const draft = drafts.find((item) => item.playerId === player.id);
    const roundPoints = round.awards.find(
      (award) => award.playerId === player.id,
    )?.points;
    const totalPoints = totals.get(player.id);
    if (
      hand === undefined ||
      draft === undefined ||
      roundPoints === undefined ||
      totalPoints === undefined
    ) {
      return { ok: false, message: missingLocalHandMessage };
    }
    const noted = playerExplanation(
      classified.teams,
      classified.impostors.some((item) => item.player === player.id),
      match,
      drafts,
      player.id,
      names,
    );
    if (!noted.ok) {
      return noted;
    }
    const text = match.piles.find((pile) => pile.number === hand.number)?.text;
    rows.push({
      playerId: player.id,
      name: player.name,
      cardNumber: hand.number,
      ...(text === undefined ? {} : { cardText: text }),
      action: recordedAction(draft, names),
      roundPoints,
      totalPoints,
      explanation: noted.explanation,
    });
  }
  return {
    ok: true,
    teams: classified.teams.map((team) => ({
      situation: team.situation,
      names: team.players.map((playerId) => names.get(playerId) ?? playerId),
    })),
    impostors: classified.impostors.map((impostor) => ({
      situation: impostor.situation,
      name: names.get(impostor.player) ?? impostor.player,
    })),
    rows,
  };
}

function playerExplanation(
  teams: readonly LocalTeam[],
  impostor: boolean,
  match: LocalMatch,
  drafts: readonly LocalVoteDraft[],
  playerId: string,
  names: ReadonlyMap<string, string>,
): { ok: true; explanation: string } | { ok: false; message: string } {
  if (impostor) {
    const byPlayer = new Map(drafts.map((draft) => [draft.playerId, draft]));
    return {
      ok: true,
      explanation: explanationLine(
        'Señalado por',
        match.players
          .filter((player) => pointsAt(byPlayer.get(player.id), playerId))
          .map((player) => names.get(player.id) ?? player.id),
      ),
    };
  }
  const evaluation = evaluateLocalTeam(teams, drafts, playerId);
  if (!evaluation.ok) {
    return evaluation;
  }
  return {
    ok: true,
    explanation: explanationLine(
      'Reconocido por',
      evaluation.recognizedBy.map((id) => names.get(id) ?? id),
    ),
  };
}

function explanationLine(label: string, names: readonly string[]): string {
  return names.length > 0 ? `${label}: ${names.join(', ')}` : `${label}: nadie`;
}

function recordedAction(
  draft: LocalVoteDraft,
  names: ReadonlyMap<string, string>,
): string {
  if (draft.gesture === 'fist') {
    return 'Puño';
  }
  if (draft.gesture === 'v') {
    return 'V';
  }
  return `Señaló a ${draft.targets.map((id) => names.get(id) ?? id).join(' y ')}.`;
}

function pointsAt(vote: LocalVoteDraft | undefined, playerId: string): boolean {
  return (
    vote !== undefined &&
    vote.gesture === 'point' &&
    vote.targets.includes(playerId)
  );
}
