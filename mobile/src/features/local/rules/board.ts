import { localTotals } from './score';
import { absentLocalResultMessage } from './reveal';
import { localPilesRemain, type LocalMatch, type LocalRound } from './round';

export type LocalStanding = {
  playerId: string;
  name: string;
  points: number;
};

export type LocalScoreboard = {
  standings: readonly LocalStanding[];
  winners: readonly string[];
};

export type LocalSettle =
  | { ok: true; match: LocalMatch }
  | { ok: false; match: LocalMatch; message: string };

export function settleLocalRound(
  match: LocalMatch,
  roundNumber: number,
): LocalSettle {
  const round = match.rounds.find((item) => item.number === roundNumber);
  if (
    round !== undefined &&
    round.status === 'finished' &&
    awardsReady(match, round)
  ) {
    return { ok: true, match };
  }
  if (
    round === undefined ||
    match.phase !== 'results' ||
    round.status !== 'voting' ||
    !awardsReady(match, round)
  ) {
    return { ok: false, match, message: absentLocalResultMessage };
  }
  const remain = localPilesRemain(match);
  if (!remain.ok) {
    return { ok: false, match, message: remain.message };
  }
  const closed: LocalMatch = {
    ...match,
    rounds: match.rounds.map((item) =>
      item.number === roundNumber ? { ...item, status: 'finished' } : item,
    ),
  };
  if (remain.another) {
    return { ok: true, match: closed };
  }
  return {
    ok: true,
    match: { ...closed, status: 'finished', phase: 'finished' },
  };
}

export function localScoreboard(match: LocalMatch): LocalScoreboard {
  const names = new Map(
    match.players.map((player) => [player.id, player.name]),
  );
  const standings = localTotals(match).map((award) => ({
    playerId: award.playerId,
    name: names.get(award.playerId) ?? award.playerId,
    points: award.points,
  }));
  if (match.status !== 'finished' || standings.length === 0) {
    return { standings, winners: [] };
  }
  const highest = Math.max(...standings.map((row) => row.points));
  return {
    standings,
    winners: standings
      .filter((row) => row.points === highest)
      .map((row) => row.name),
  };
}

function awardsReady(match: LocalMatch, round: LocalRound): boolean {
  return (
    round.awards !== undefined &&
    match.players.every((player) =>
      round.awards?.some((award) => award.playerId === player.id),
    )
  );
}
