import type {
  LocalAward,
  LocalCopy,
  LocalHand,
  LocalMatch,
  LocalPile,
  LocalRound,
  LocalVoteDraft,
} from '../rules/round';

export const activeMatchKey = 'ooc.local.match';
export const activeMatchTempKey = 'ooc.local.match.tmp';
export const localMatchSchemaVersion = 1;

const matchStatuses = ['preparing', 'in_progress', 'finished'] as const;
const phases = [
  'setup',
  'viewing',
  'conversation',
  'recording',
  'results',
  'finished',
] as const;
const roundStatuses = [
  'prepared',
  'conversation',
  'voting',
  'finished',
] as const;
const gestures = ['point', 'fist', 'v'] as const;

export type LocalMatchStorage = {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  removeItem(key: string): Promise<void>;
};

export type MatchRead =
  | { ok: true; match: LocalMatch | null }
  | { ok: false; reason: 'read' | 'invalid' | 'version' };

export type MatchWrite = { ok: true } | { ok: false; reason: 'write' };

export type MatchDelete = { ok: true } | { ok: false; reason: 'delete' };

export async function saveActiveMatch(
  match: LocalMatch,
  storage: LocalMatchStorage,
): Promise<MatchWrite> {
  const encoded = JSON.stringify(match);
  try {
    await storage.setItem(activeMatchTempKey, encoded);
  } catch {
    return { ok: false, reason: 'write' };
  }
  try {
    await storage.setItem(activeMatchKey, encoded);
  } catch {
    return { ok: false, reason: 'write' };
  }
  try {
    await storage.removeItem(activeMatchTempKey);
  } catch {
    return { ok: false, reason: 'write' };
  }
  return { ok: true };
}

export async function readActiveMatch(
  storage: LocalMatchStorage,
): Promise<MatchRead> {
  let raw: string | null;
  try {
    raw = await storage.getItem(activeMatchKey);
  } catch {
    return { ok: false, reason: 'read' };
  }
  if (raw === null) {
    return { ok: true, match: null };
  }
  try {
    const parsed: unknown = JSON.parse(raw);
    const match = parseLocalMatch(parsed);
    if (match === 'invalid' || match === 'version') {
      return { ok: false, reason: match };
    }
    return { ok: true, match };
  } catch {
    return { ok: false, reason: 'invalid' };
  }
}

export async function deleteActiveMatch(
  storage: LocalMatchStorage,
): Promise<MatchDelete> {
  try {
    await storage.removeItem(activeMatchKey);
    await storage.removeItem(activeMatchTempKey);
  } catch {
    return { ok: false, reason: 'delete' };
  }
  return { ok: true };
}

function parseLocalMatch(value: unknown): LocalMatch | 'invalid' | 'version' {
  if (!isRecord(value) || !isFiniteNumber(value.version)) {
    return 'invalid';
  }
  if (value.version !== localMatchSchemaVersion) {
    return 'version';
  }
  const status = oneOf(value.status, matchStatuses);
  const phase = oneOf(value.phase, phases);
  if (
    status === null ||
    phase === null ||
    !Array.isArray(value.players) ||
    !Array.isArray(value.piles) ||
    !Array.isArray(value.rounds)
  ) {
    return 'invalid';
  }
  const players: { id: string; name: string }[] = [];
  for (const player of value.players) {
    if (!isRecord(player) || !isText(player.id) || !isText(player.name)) {
      return 'invalid';
    }
    players.push({ id: player.id, name: player.name });
  }
  const piles: LocalPile[] = [];
  for (const pile of value.piles) {
    const parsed = parsePile(pile);
    if (parsed === null) {
      return 'invalid';
    }
    piles.push(parsed);
  }
  const rounds: LocalRound[] = [];
  for (const round of value.rounds) {
    const parsed = parseRound(round);
    if (parsed === null) {
      return 'invalid';
    }
    rounds.push(parsed);
  }
  const match: LocalMatch = {
    version: localMatchSchemaVersion,
    status,
    phase,
    players,
    piles,
    rounds,
  };
  return referencesClose(match) ? match : 'invalid';
}

function referencesClose(match: LocalMatch): boolean {
  const playerIds = new Set<string>();
  const names = new Set<string>();
  for (const player of match.players) {
    if (
      player.id.length === 0 ||
      player.name.length === 0 ||
      playerIds.has(player.id) ||
      names.has(player.name)
    ) {
      return false;
    }
    playerIds.add(player.id);
    names.add(player.name);
  }
  const pileCopies = new Map<number, ReadonlySet<number>>();
  for (const pile of match.piles) {
    if (pileCopies.has(pile.number)) {
      return false;
    }
    pileCopies.set(pile.number, new Set(pile.copies));
  }
  const roundNumbers = new Set<number>();
  for (const round of match.rounds) {
    if (roundNumbers.has(round.number)) {
      return false;
    }
    roundNumbers.add(round.number);
    const dealt = new Set<number>();
    for (const pileNumber of round.piles) {
      if (dealt.has(pileNumber) || !pileCopies.has(pileNumber)) {
        return false;
      }
      dealt.add(pileNumber);
    }
    if (!handsBelong(round, playerIds, pileCopies, dealt)) {
      return false;
    }
    if (!copiesBelong(round.discard, pileCopies, dealt)) {
      return false;
    }
    if (!draftsBelong(round, playerIds)) {
      return false;
    }
    if (!awardsBelong(round, playerIds)) {
      return false;
    }
  }
  return true;
}

function handsBelong(
  round: LocalRound,
  playerIds: ReadonlySet<string>,
  pileCopies: ReadonlyMap<number, ReadonlySet<number>>,
  dealt: ReadonlySet<number>,
): boolean {
  const seen = new Set<string>();
  for (const hand of round.hands) {
    if (seen.has(hand.playerId) || !playerIds.has(hand.playerId)) {
      return false;
    }
    seen.add(hand.playerId);
    if (!copyBelongs(pileCopies, dealt, hand.number, hand.copy)) {
      return false;
    }
  }
  return true;
}

function copiesBelong(
  copies: readonly LocalCopy[],
  pileCopies: ReadonlyMap<number, ReadonlySet<number>>,
  dealt: ReadonlySet<number>,
): boolean {
  for (const copy of copies) {
    if (!copyBelongs(pileCopies, dealt, copy.number, copy.copy)) {
      return false;
    }
  }
  return true;
}

function copyBelongs(
  pileCopies: ReadonlyMap<number, ReadonlySet<number>>,
  dealt: ReadonlySet<number>,
  number: number,
  copy: number,
): boolean {
  return dealt.has(number) && (pileCopies.get(number)?.has(copy) ?? false);
}

function draftsBelong(
  round: LocalRound,
  playerIds: ReadonlySet<string>,
): boolean {
  const seen = new Set<string>();
  for (const draft of round.drafts ?? []) {
    if (seen.has(draft.playerId) || !playerIds.has(draft.playerId)) {
      return false;
    }
    seen.add(draft.playerId);
    for (const target of draft.targets) {
      if (!playerIds.has(target)) {
        return false;
      }
    }
  }
  return true;
}

function awardsBelong(
  round: LocalRound,
  playerIds: ReadonlySet<string>,
): boolean {
  const seen = new Set<string>();
  for (const award of round.awards ?? []) {
    if (seen.has(award.playerId) || !playerIds.has(award.playerId)) {
      return false;
    }
    seen.add(award.playerId);
  }
  return true;
}

function parsePile(value: unknown): LocalPile | null {
  if (!isRecord(value) || !isFiniteNumber(value.number)) {
    return null;
  }
  const copies = parseNumberList(value.copies);
  const text = optionalText(value.text);
  if (copies === null || text === null) {
    return null;
  }
  return text === undefined
    ? { number: value.number, copies }
    : { number: value.number, copies, text };
}

function parseRound(value: unknown): LocalRound | null {
  if (!isRecord(value) || !isFiniteNumber(value.number)) {
    return null;
  }
  const status = oneOf(value.status, roundStatuses);
  const piles = parseNumberList(value.piles);
  if (
    status === null ||
    piles === null ||
    !Array.isArray(value.hands) ||
    !Array.isArray(value.discard)
  ) {
    return null;
  }
  const hands: LocalHand[] = [];
  for (const hand of value.hands) {
    const parsed = parseHand(hand);
    if (parsed === null) {
      return null;
    }
    hands.push(parsed);
  }
  const discard: LocalCopy[] = [];
  for (const copy of value.discard) {
    const parsed = parseCopy(copy);
    if (parsed === null) {
      return null;
    }
    discard.push(parsed);
  }
  const drafts = optionalList(value.drafts, parseDraft);
  const awards = optionalList(value.awards, parseAward);
  if (drafts === null || awards === null) {
    return null;
  }
  return {
    number: value.number,
    status,
    piles,
    hands,
    discard,
    ...(drafts === undefined ? {} : { drafts }),
    ...(awards === undefined ? {} : { awards }),
  };
}

function parseHand(value: unknown): LocalHand | null {
  if (
    !isRecord(value) ||
    !isText(value.playerId) ||
    !isFiniteNumber(value.number) ||
    !isFiniteNumber(value.copy)
  ) {
    return null;
  }
  return { playerId: value.playerId, number: value.number, copy: value.copy };
}

function parseCopy(value: unknown): LocalCopy | null {
  if (
    !isRecord(value) ||
    !isFiniteNumber(value.number) ||
    !isFiniteNumber(value.copy)
  ) {
    return null;
  }
  return { number: value.number, copy: value.copy };
}

function parseDraft(value: unknown): LocalVoteDraft | null {
  if (!isRecord(value) || !isText(value.playerId)) {
    return null;
  }
  const gesture = oneOf(value.gesture, gestures);
  const targets = parseTextList(value.targets);
  if (gesture === null || targets === null) {
    return null;
  }
  return { playerId: value.playerId, gesture, targets };
}

function parseAward(value: unknown): LocalAward | null {
  if (
    !isRecord(value) ||
    !isText(value.playerId) ||
    !isFiniteNumber(value.points)
  ) {
    return null;
  }
  return { playerId: value.playerId, points: value.points };
}

function optionalList<T>(
  value: unknown,
  parseItem: (item: unknown) => T | null,
): readonly T[] | undefined | null {
  if (value === undefined) {
    return undefined;
  }
  if (!Array.isArray(value)) {
    return null;
  }
  const items: T[] = [];
  for (const item of value) {
    const parsed = parseItem(item);
    if (parsed === null) {
      return null;
    }
    items.push(parsed);
  }
  return items;
}

function optionalText(value: unknown): string | undefined | null {
  if (value === undefined) {
    return undefined;
  }
  return isText(value) ? value : null;
}

function parseTextList(value: unknown): readonly string[] | null {
  if (!Array.isArray(value) || !value.every(isText)) {
    return null;
  }
  return value;
}

function parseNumberList(value: unknown): readonly number[] | null {
  if (!Array.isArray(value) || !value.every(isFiniteNumber)) {
    return null;
  }
  return value;
}

function oneOf<T extends string>(
  value: unknown,
  allowed: readonly T[],
): T | null {
  if (typeof value !== 'string') {
    return null;
  }
  for (const item of allowed) {
    if (item === value) {
      return item;
    }
  }
  return null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isText(value: unknown): value is string {
  return typeof value === 'string';
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}
