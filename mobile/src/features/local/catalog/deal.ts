import type { CatalogSituation } from './situations';
import {
  createLocalPiles,
  localDeckConfig,
  localPileCountMessage,
  prepareLocalRound,
  type LocalMatch,
  type LocalRng,
  type RoundChange,
} from '../rules/round';

const copies = [1, 2, 3] as const;

export function dealLocalMatch(
  match: LocalMatch,
  catalog: readonly CatalogSituation[],
  rng: LocalRng,
): RoundChange {
  const config = localDeckConfig(match.players.length);
  if (!config.ok) {
    return { ok: false, match, message: config.message };
  }
  if (catalog.length < config.config.pileCount) {
    return {
      ok: false,
      match,
      message: localPileCountMessage(config.config.pileCount),
    };
  }
  const stored = createLocalPiles(
    match,
    rng.sample(catalog, config.config.pileCount).map((situation) => ({
      number: situation.number,
      copies,
      text: situation.text,
    })),
  );
  if (!stored.ok) {
    return stored;
  }
  return prepareLocalRound(stored.match, rng);
}
