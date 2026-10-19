import { dealLocalMatch } from '../catalog/deal';
import type { CatalogSituation } from '../catalog/situations';
import type { LocalMatch, LocalRng, RoundChange } from '../rules/round';
import { localRosterMutable } from './setup';

export const localRestartNotStartedMessage =
  'La partida todavía no empezó. No hay nada que reiniciar.';

export function restartLocalMatch(
  match: LocalMatch,
  catalog: readonly CatalogSituation[],
  rng: LocalRng,
): RoundChange {
  if (localRosterMutable(match)) {
    return { ok: false, match, message: localRestartNotStartedMessage };
  }
  const fresh: LocalMatch = {
    version: 1,
    status: 'preparing',
    phase: 'setup',
    players: match.players.map((player) => ({
      id: player.id,
      name: player.name,
    })),
    piles: [],
    rounds: [],
  };
  const dealt = dealLocalMatch(fresh, catalog, rng);
  if (!dealt.ok) {
    return { ok: false, match, message: dealt.message };
  }
  return dealt;
}
