import type { LocalScoreboard, LocalStanding } from '../rules/board';
import type { LocalResultRow, LocalResultView } from '../rules/reveal';
import type { LocalMatch } from '../rules/round';
import {
  localCardLabel,
  localImpostorRoleLabel,
  localTeamRoleLabel,
  localWinnersLine,
} from './copy';

export type LocalResultRole = 'team' | 'impostor';

export type LocalPresentedRow = {
  playerId: string;
  name: string;
  role: LocalResultRole;
  roleLabel: string;
  cardLabel: string;
  cardText?: string;
  action: string;
  explanation: string;
  roundPoints: number;
  totalPoints: number;
  accessibilityLabel: string;
};

export type LocalPresentedStanding = {
  playerId: string;
  name: string;
  points: number;
  accessibilityLabel: string;
};

export type LocalResultsPresentation = {
  roundNumber: number;
  finished: boolean;
  rows: readonly LocalPresentedRow[];
  standings: readonly LocalPresentedStanding[];
  winnersLine: string | undefined;
};

export function presentLocalResults(
  match: LocalMatch,
  view: Extract<LocalResultView, { ok: true }>,
  board: LocalScoreboard,
  roundNumber: number,
  finished: boolean,
): LocalResultsPresentation {
  const impostorKeys = new Set(
    view.impostors.map((item) => `${item.situation}:${item.name}`),
  );
  const rosterIndex = new Map(
    match.players.map((player, index) => [player.id, index]),
  );

  const rows = view.rows.map((row) =>
    presentRow(row, impostorKeys.has(`${row.cardNumber}:${row.name}`)),
  );

  const standings = sortStandings(board.standings, rosterIndex).map(
    (standing) => ({
      playerId: standing.playerId,
      name: standing.name,
      points: standing.points,
      accessibilityLabel: `${standing.name}, ${standing.points} puntos`,
    }),
  );

  return {
    roundNumber,
    finished,
    rows,
    standings,
    winnersLine: finished ? localWinnersLine(board.winners) : undefined,
  };
}

function presentRow(row: LocalResultRow, impostor: boolean): LocalPresentedRow {
  const role: LocalResultRole = impostor ? 'impostor' : 'team';
  const roleLabel = impostor ? localImpostorRoleLabel : localTeamRoleLabel;
  const cardLabel = localCardLabel(row.cardNumber);
  return {
    playerId: row.playerId,
    name: row.name,
    role,
    roleLabel,
    cardLabel,
    ...(row.cardText === undefined ? {} : { cardText: row.cardText }),
    action: row.action,
    explanation: row.explanation,
    roundPoints: row.roundPoints,
    totalPoints: row.totalPoints,
    accessibilityLabel: [
      row.name,
      roleLabel,
      cardLabel,
      `Puntos de la ronda ${row.roundPoints}`,
      `Total de la partida ${row.totalPoints}`,
    ].join(', '),
  };
}

export function sortStandings(
  standings: readonly LocalStanding[],
  rosterIndex: ReadonlyMap<string, number>,
): readonly LocalStanding[] {
  return [...standings].sort((left, right) => {
    if (right.points !== left.points) {
      return right.points - left.points;
    }
    return (
      (rosterIndex.get(left.playerId) ?? 0) -
      (rosterIndex.get(right.playerId) ?? 0)
    );
  });
}
