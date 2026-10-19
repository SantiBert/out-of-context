import {
  classifyLocalHands,
  missingLocalHandMessage,
  type LocalAward,
  type LocalImpostor,
  type LocalMatch,
  type LocalTeam,
  type LocalVoteDraft,
} from './round';
import { closedLocalVoteMessage, missingLocalVoteMessage } from './vote';

export const notALocalTeammateMessage = 'Ese jugador no pertenece a un equipo.';
export const duplicateLocalVoteMessage = 'Un jugador no puede votar dos veces.';

export type LocalTeamScore = {
  playerId: string;
  points: number;
};

export type LocalTeamScoreResult =
  | { ok: true; scores: readonly LocalTeamScore[] }
  | { ok: false; message: string };

export type LocalTeamEvaluation =
  | {
      ok: true;
      correct: boolean;
      teammates: readonly string[];
      recognizedBy: readonly string[];
    }
  | { ok: false; message: string };

export function evaluateLocalTeam(
  teams: readonly LocalTeam[],
  votes: readonly LocalVoteDraft[],
  playerId: string,
): LocalTeamEvaluation {
  const team = teams.find((item) => item.players.includes(playerId));
  if (team === undefined) {
    return { ok: false, message: notALocalTeammateMessage };
  }
  const teammates = team.players
    .filter((id) => id !== playerId)
    .sort(compareText);
  const byPlayer = new Map(votes.map((vote) => [vote.playerId, vote]));
  const choice = byPlayer.get(playerId);
  const correct =
    choice !== undefined &&
    choice.gesture === 'point' &&
    sameSet(choice.targets, teammates);
  return {
    ok: true,
    correct,
    teammates,
    recognizedBy: teammates.filter((teammate) =>
      pointsAt(byPlayer.get(teammate), playerId),
    ),
  };
}

export function scoreLocalTeams(
  match: LocalMatch,
  roundNumber: number,
): LocalTeamScoreResult {
  const ballot = readVotingRound(match, roundNumber);
  if (!ballot.ok) {
    return ballot;
  }
  const scores: LocalTeamScore[] = [];
  const teamPlayers = ballot.teams
    .flatMap((team) => [...team.players])
    .sort(compareText);
  for (const playerId of teamPlayers) {
    const evaluation = evaluateLocalTeam(ballot.teams, ballot.drafts, playerId);
    if (!evaluation.ok) {
      return evaluation;
    }
    scores.push({
      playerId,
      points: evaluation.correct ? evaluation.recognizedBy.length : 0,
    });
  }
  return { ok: true, scores };
}

export function scoreLocalImpostors(
  match: LocalMatch,
  roundNumber: number,
): LocalTeamScoreResult {
  const ballot = readVotingRound(match, roundNumber);
  if (!ballot.ok) {
    return ballot;
  }
  const byPlayer = new Map(
    ballot.drafts.map((draft) => [draft.playerId, draft]),
  );
  return {
    ok: true,
    scores: ballot.impostors.map((impostor) => ({
      playerId: impostor.player,
      points: impostorPoints(
        byPlayer.get(impostor.player),
        receivedPointers(ballot.drafts, impostor.player),
      ),
    })),
  };
}

export type LocalRoundScoreChange =
  | { ok: true; match: LocalMatch }
  | { ok: false; match: LocalMatch; message: string };

export function scoreLocalRound(
  match: LocalMatch,
  roundNumber: number,
): LocalRoundScoreChange {
  const round = match.rounds.find((item) => item.number === roundNumber);
  if (round?.awards !== undefined) {
    return { ok: true, match };
  }
  const teams = scoreLocalTeams(match, roundNumber);
  if (!teams.ok) {
    return { ok: false, match, message: teams.message };
  }
  const impostors = scoreLocalImpostors(match, roundNumber);
  if (!impostors.ok) {
    return { ok: false, match, message: impostors.message };
  }
  const points = new Map<string, number>();
  for (const score of [...teams.scores, ...impostors.scores]) {
    points.set(score.playerId, score.points);
  }
  const awards = match.players.map((player) => ({
    playerId: player.id,
    points: points.get(player.id) ?? 0,
  }));
  return {
    ok: true,
    match: {
      ...match,
      rounds: match.rounds.map((item) =>
        item.number === roundNumber ? { ...item, awards } : item,
      ),
    },
  };
}

export function localRoundAwards(
  match: LocalMatch,
  roundNumber: number,
): readonly LocalAward[] {
  return (
    match.rounds.find((round) => round.number === roundNumber)?.awards ?? []
  );
}

export function localTotals(match: LocalMatch): readonly LocalAward[] {
  return match.players.map((player) => ({
    playerId: player.id,
    points: match.rounds.reduce((total, round) => {
      const award = round.awards?.find((item) => item.playerId === player.id);
      return total + (award?.points ?? 0);
    }, 0),
  }));
}

function readVotingRound(
  match: LocalMatch,
  roundNumber: number,
):
  | {
      ok: true;
      drafts: readonly LocalVoteDraft[];
      teams: readonly LocalTeam[];
      impostors: readonly LocalImpostor[];
    }
  | { ok: false; message: string } {
  const round = match.rounds.find((item) => item.number === roundNumber);
  if (round === undefined || round.status !== 'voting') {
    return { ok: false, message: closedLocalVoteMessage };
  }
  const drafts = round.drafts ?? [];
  const drafted = new Set<string>();
  for (const draft of drafts) {
    if (drafted.has(draft.playerId)) {
      return { ok: false, message: duplicateLocalVoteMessage };
    }
    drafted.add(draft.playerId);
  }
  if (match.players.some((player) => !drafted.has(player.id))) {
    return { ok: false, message: missingLocalVoteMessage };
  }
  const dealt = new Set(round.hands.map((hand) => hand.playerId));
  if (match.players.some((player) => !dealt.has(player.id))) {
    return { ok: false, message: missingLocalHandMessage };
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
  return {
    ok: true,
    drafts,
    teams: classified.teams,
    impostors: classified.impostors,
  };
}

function receivedPointers(
  drafts: readonly LocalVoteDraft[],
  playerId: string,
): number {
  return new Set(
    drafts
      .filter((draft) => pointsAt(draft, playerId))
      .map((draft) => draft.playerId),
  ).size;
}

function impostorPoints(
  choice: LocalVoteDraft | undefined,
  received: number,
): number {
  if (choice?.gesture === 'fist') {
    return 1;
  }
  if (choice?.gesture === 'v' && received > 0) {
    return 1 + received;
  }
  return 0;
}

function pointsAt(vote: LocalVoteDraft | undefined, playerId: string): boolean {
  return (
    vote !== undefined &&
    vote.gesture === 'point' &&
    vote.targets.includes(playerId)
  );
}

function sameSet(left: readonly string[], right: readonly string[]): boolean {
  const seen = new Set(left);
  return seen.size === right.length && right.every((item) => seen.has(item));
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
