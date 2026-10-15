import { getApiBaseUrl } from '../../config/env';

export const NAME_MAX_LENGTH = 80;

export const emptyNameMessage = 'El nombre no puede estar vacío.';
export const longNameMessage = 'El nombre admite como máximo 80 caracteres.';
export const emptyCodeMessage = 'No existe una sala con ese código.';
export const invalidResponseMessage = 'La respuesta no es válida.';
export const networkMessage = 'No se pudo contactar al servidor.';
export const unknownRoomErrorMessage = 'No se pudo completar la operación.';

const knownRoomErrors = new Set([
  'invalid_room',
  'room_not_found',
  'room_closed',
  'room_full',
  'duplicate_member',
  'unauthorized',
  'not_host',
  'invalid_player_count',
  'card_unavailable',
  'round_unavailable',
  'not_ready',
  'invalid_round',
  'invalid_vote',
  'results_unavailable',
]);

export class NameValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'NameValidationError';
  }
}

export class RoomRequestError extends Error {
  readonly status: number;
  readonly code: string;

  constructor(status: number, code: string, detail: string) {
    super(detail);
    this.name = 'RoomRequestError';
    this.status = status;
    this.code = code;
  }
}

export type RoomState = {
  code: string;
  status: string;
  host: string;
  participants: readonly string[];
  playerCount: number;
  acceptingMembers: boolean;
  canStart: boolean;
};

export type RoomAccess = RoomState & {
  token: string;
};

export type OwnCard = {
  number: number;
  text: string;
};

export type RoundPhase = {
  number: number;
  status: string;
};

export type ConversationRound = {
  number: number;
  status: string;
  ready: readonly string[];
  readyCount: number;
};

export type VoteGesture = 'point' | 'fist' | 'v';

export type VoteChoice = {
  gesture: VoteGesture;
  targets: readonly string[];
};

export type VoteWindow = {
  number: number;
  status: string;
  voteMark: number | null;
  voteOpenedAt: string | null;
  voteClosesAt: string | null;
};

export type RoundResult = {
  name: string;
  card: OwnCard;
  gesture: string | null;
  targets: readonly string[];
  points: number;
  recognizedBy?: readonly string[];
  pointedBy?: readonly string[];
};

export type Standing = {
  name: string;
  points: number;
};

export type Scoreboard = {
  status: string;
  standings: readonly Standing[];
  winners?: readonly string[];
};

type FetchLike = (
  input: string,
  init?: RequestInit,
) => Promise<Pick<Response, 'ok' | 'status' | 'json'>>;

export function cleanPlayerName(value: string): string {
  const cleaned = value.trim();
  if (!cleaned) {
    throw new NameValidationError(emptyNameMessage);
  }
  if (cleaned.length > NAME_MAX_LENGTH) {
    throw new NameValidationError(longNameMessage);
  }
  return cleaned;
}

export function cleanRoomCode(value: string): string {
  const cleaned = value.trim().toUpperCase();
  if (!cleaned) {
    throw new NameValidationError(emptyCodeMessage);
  }
  return cleaned;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

export function parseRoomState(value: unknown): RoomState {
  if (!isRecord(value)) {
    throw new Error(invalidResponseMessage);
  }

  const { code, status, host, participants } = value;
  const playerCount = value.player_count;
  const acceptingMembers = value.accepting_members;
  const canStart = value.can_start;
  const participantsAreNames =
    Array.isArray(participants) &&
    participants.every((item) => typeof item === 'string');

  if (
    typeof code !== 'string' ||
    code.length === 0 ||
    typeof status !== 'string' ||
    typeof host !== 'string' ||
    !participantsAreNames ||
    typeof playerCount !== 'number' ||
    typeof acceptingMembers !== 'boolean' ||
    typeof canStart !== 'boolean'
  ) {
    throw new Error(invalidResponseMessage);
  }

  return {
    code,
    status,
    host,
    participants,
    playerCount,
    acceptingMembers,
    canStart,
  };
}

export function parseOwnCard(value: unknown): OwnCard {
  if (!isRecord(value)) {
    throw new Error(invalidResponseMessage);
  }
  const { number, text } = value;
  if (
    typeof number !== 'number' ||
    !Number.isInteger(number) ||
    typeof text !== 'string' ||
    text.trim().length === 0
  ) {
    throw new Error(invalidResponseMessage);
  }
  return { number, text };
}

export function parseRoundPhase(value: unknown): RoundPhase {
  if (!isRecord(value)) {
    throw new Error(invalidResponseMessage);
  }
  const { number, status } = value;
  if (
    typeof number !== 'number' ||
    !Number.isInteger(number) ||
    typeof status !== 'string' ||
    status.length === 0
  ) {
    throw new Error(invalidResponseMessage);
  }
  return { number, status };
}

export function parseConversationRound(value: unknown): ConversationRound {
  if (!isRecord(value)) {
    throw new Error(invalidResponseMessage);
  }
  const { number, status, ready } = value;
  const readyCount = value.ready_count;
  const names =
    Array.isArray(ready) && ready.every((item) => typeof item === 'string');
  if (
    typeof number !== 'number' ||
    !Number.isInteger(number) ||
    typeof status !== 'string' ||
    status.length === 0 ||
    !names ||
    typeof readyCount !== 'number' ||
    !Number.isInteger(readyCount)
  ) {
    throw new Error(invalidResponseMessage);
  }
  return { number, status, ready: [...ready], readyCount };
}

const voteGestures = new Set<VoteGesture>(['point', 'fist', 'v']);

export function parseVoteChoice(value: unknown): VoteChoice {
  if (!isRecord(value)) {
    throw new Error(invalidResponseMessage);
  }
  const { gesture, targets } = value;
  const names =
    Array.isArray(targets) &&
    targets.every((item) => typeof item === 'string' && item.length > 0);
  if (
    typeof gesture !== 'string' ||
    !voteGestures.has(gesture as VoteGesture) ||
    !names ||
    new Set(targets).size !== targets.length
  ) {
    throw new Error(invalidResponseMessage);
  }
  if (gesture === 'point' && targets.length === 0) {
    throw new Error(invalidResponseMessage);
  }
  if (gesture !== 'point' && targets.length > 0) {
    throw new Error(invalidResponseMessage);
  }
  return { gesture: gesture as VoteGesture, targets: [...targets] };
}

export function parseVoteWindow(value: unknown): VoteWindow {
  if (!isRecord(value)) {
    throw new Error(invalidResponseMessage);
  }
  const { number, status } = value;
  const voteMark = value.vote_mark;
  const voteOpenedAt = value.vote_opened_at;
  const voteClosesAt = value.vote_closes_at;
  const markIsValid =
    voteMark === null ||
    (typeof voteMark === 'number' && Number.isInteger(voteMark));
  const openedIsValid =
    voteOpenedAt === null || typeof voteOpenedAt === 'string';
  const closesIsValid =
    voteClosesAt === null || typeof voteClosesAt === 'string';
  if (
    typeof number !== 'number' ||
    !Number.isInteger(number) ||
    typeof status !== 'string' ||
    status.length === 0 ||
    !markIsValid ||
    !openedIsValid ||
    !closesIsValid
  ) {
    throw new Error(invalidResponseMessage);
  }
  return {
    number,
    status,
    voteMark,
    voteOpenedAt,
    voteClosesAt,
  };
}

export function parseRoundResults(value: unknown): RoundResult[] {
  if (!Array.isArray(value)) {
    throw new Error(invalidResponseMessage);
  }
  return value.map(parseRoundResult);
}

export function parseScoreboard(value: unknown): Scoreboard {
  if (!isRecord(value) || !Array.isArray(value.standings)) {
    throw new Error(invalidResponseMessage);
  }
  const { status } = value;
  if (typeof status !== 'string' || status.length === 0) {
    throw new Error(invalidResponseMessage);
  }
  const standings = value.standings.map(parseStanding);
  const board: Scoreboard = { status, standings };
  if (value.winners !== undefined) {
    if (
      !Array.isArray(value.winners) ||
      !value.winners.every(
        (item) => typeof item === 'string' && item.length > 0,
      )
    ) {
      throw new Error(invalidResponseMessage);
    }
    board.winners = [...value.winners];
  }
  return board;
}

function parseStanding(value: unknown): Standing {
  if (
    !isRecord(value) ||
    typeof value.name !== 'string' ||
    value.name.length === 0 ||
    typeof value.points !== 'number' ||
    !Number.isInteger(value.points) ||
    value.points < 0
  ) {
    throw new Error(invalidResponseMessage);
  }
  return { name: value.name, points: value.points };
}

function parseRoundResult(value: unknown): RoundResult {
  if (
    !isRecord(value) ||
    typeof value.name !== 'string' ||
    value.name.length === 0
  ) {
    throw new Error(invalidResponseMessage);
  }
  const targets = value.targets;
  const names =
    Array.isArray(targets) &&
    targets.every((item) => typeof item === 'string' && item.length > 0);
  const gesture = value.gesture;
  const points = value.points;
  const gestureIsValid =
    gesture === null || (typeof gesture === 'string' && gesture.length > 0);
  if (
    !names ||
    !gestureIsValid ||
    typeof points !== 'number' ||
    !Number.isInteger(points) ||
    points < 0
  ) {
    throw new Error(invalidResponseMessage);
  }
  const recognizedBy = nameList(value.recognized_by);
  const pointedBy = nameList(value.pointed_by);
  if ((recognizedBy === null) === (pointedBy === null)) {
    throw new Error(invalidResponseMessage);
  }
  const row: RoundResult = {
    name: value.name,
    card: parseOwnCard(value.card),
    gesture,
    targets: [...targets],
    points,
  };
  if (recognizedBy !== null) {
    row.recognizedBy = recognizedBy;
  }
  if (pointedBy !== null) {
    row.pointedBy = pointedBy;
  }
  return row;
}

function nameList(value: unknown): string[] | null {
  if (value === undefined) {
    return null;
  }
  if (
    !Array.isArray(value) ||
    !value.every((item) => typeof item === 'string' && item.length > 0)
  ) {
    throw new Error(invalidResponseMessage);
  }
  return [...value];
}

export function parseRoomAccess(value: unknown): RoomAccess {
  const room = parseRoomState(value);
  if (!isRecord(value) || typeof value.token !== 'string' || !value.token) {
    throw new Error(invalidResponseMessage);
  }
  return { ...room, token: value.token };
}

export function roomErrorMessage(code: string, detail: string): string {
  if (knownRoomErrors.has(code) && detail.trim().length > 0) {
    return detail;
  }
  return unknownRoomErrorMessage;
}

function readError(body: unknown): { code: string; detail: string } {
  if (
    isRecord(body) &&
    typeof body.code === 'string' &&
    body.code.length > 0 &&
    typeof body.detail === 'string' &&
    body.detail.length > 0
  ) {
    return { code: body.code, detail: body.detail };
  }
  return { code: 'invalid_response', detail: invalidResponseMessage };
}

async function requestJson(
  url: string,
  init: RequestInit,
  fetchImpl: FetchLike,
): Promise<unknown> {
  let response: Pick<Response, 'ok' | 'status' | 'json'>;
  try {
    response = await fetchImpl(url, init);
  } catch {
    throw new Error(networkMessage);
  }

  let body: unknown;
  try {
    body = await response.json();
  } catch {
    throw new Error(invalidResponseMessage);
  }

  if (!response.ok) {
    const error = readError(body);
    throw new RoomRequestError(
      response.status,
      error.code,
      roomErrorMessage(error.code, error.detail),
    );
  }
  return body;
}

async function postName(
  path: string,
  name: string,
  fetchImpl: FetchLike,
): Promise<RoomAccess> {
  const body = await requestJson(
    `${getApiBaseUrl()}${path}`,
    {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ name }),
    },
    fetchImpl,
  );
  return parseRoomAccess(body);
}

export function fetchRoom(
  code: string,
  fetchImpl: FetchLike = fetch,
): Promise<RoomState> {
  const roomCode = cleanRoomCode(code);
  return requestJson(
    `${getApiBaseUrl()}/api/rooms/${encodeURIComponent(roomCode)}/`,
    { method: 'GET', headers: { Accept: 'application/json' } },
    fetchImpl,
  ).then(parseRoomState);
}

export function fetchOwnCard(
  code: string,
  token: string,
  fetchImpl: FetchLike = fetch,
): Promise<OwnCard> {
  return requestJson(
    memberUrl(code, token, 'card'),
    { method: 'GET', headers: { Accept: 'application/json' } },
    fetchImpl,
  ).then(parseOwnCard);
}

export function fetchConversationRound(
  code: string,
  token: string,
  fetchImpl: FetchLike = fetch,
): Promise<ConversationRound> {
  return requestJson(
    memberUrl(code, token, 'round'),
    { method: 'GET', headers: { Accept: 'application/json' } },
    fetchImpl,
  ).then(parseConversationRound);
}

export function fetchRoundPhase(
  code: string,
  token: string,
  fetchImpl: FetchLike = fetch,
): Promise<RoundPhase> {
  return requestJson(
    memberUrl(code, token, 'round'),
    { method: 'GET', headers: { Accept: 'application/json' } },
    fetchImpl,
  ).then(parseRoundPhase);
}

export function fetchVoteWindow(
  code: string,
  token: string,
  fetchImpl: FetchLike = fetch,
): Promise<VoteWindow> {
  return requestJson(
    memberUrl(code, token, 'round'),
    { method: 'GET', headers: { Accept: 'application/json' } },
    fetchImpl,
  ).then(parseVoteWindow);
}

export function fetchRoundResults(
  code: string,
  token: string,
  fetchImpl: FetchLike = fetch,
): Promise<RoundResult[]> {
  return requestJson(
    memberUrl(code, token, 'results'),
    { method: 'GET', headers: { Accept: 'application/json' } },
    fetchImpl,
  ).then(parseRoundResults);
}

export function fetchScoreboard(
  code: string,
  token: string,
  fetchImpl: FetchLike = fetch,
): Promise<Scoreboard> {
  return requestJson(
    memberUrl(code, token, 'score'),
    { method: 'GET', headers: { Accept: 'application/json' } },
    fetchImpl,
  ).then(parseScoreboard);
}

export function castVote(
  code: string,
  token: string,
  choice: VoteChoice,
  fetchImpl: FetchLike = fetch,
): Promise<VoteChoice> {
  const ballot = parseVoteChoice(choice);
  return requestJson(
    memberUrl(code, token, 'vote'),
    {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        gesture: ballot.gesture,
        targets: ballot.targets,
      }),
    },
    fetchImpl,
  ).then(parseVoteChoice);
}

function memberUrl(
  code: string,
  token: string,
  path: 'card' | 'round' | 'vote' | 'results' | 'score',
): string {
  const roomCode = cleanRoomCode(code);
  const query = `token=${encodeURIComponent(token)}`;
  return `${getApiBaseUrl()}/api/rooms/${encodeURIComponent(roomCode)}/${path}/?${query}`;
}

export function startRoom(
  code: string,
  token: string,
  fetchImpl: FetchLike = fetch,
): Promise<RoomState> {
  const roomCode = cleanRoomCode(code);
  const query = `token=${encodeURIComponent(token)}`;
  return requestJson(
    `${getApiBaseUrl()}/api/rooms/${encodeURIComponent(roomCode)}/start/?${query}`,
    { method: 'POST', headers: { Accept: 'application/json' } },
    fetchImpl,
  ).then(parseRoomState);
}

export function createRoom(
  name: string,
  fetchImpl: FetchLike = fetch,
): Promise<RoomAccess> {
  return postName('/api/rooms/', cleanPlayerName(name), fetchImpl);
}

export function joinRoom(
  code: string,
  name: string,
  fetchImpl: FetchLike = fetch,
): Promise<RoomAccess> {
  const roomCode = cleanRoomCode(code);
  return postName(
    `/api/rooms/${encodeURIComponent(roomCode)}/members/`,
    cleanPlayerName(name),
    fetchImpl,
  );
}
