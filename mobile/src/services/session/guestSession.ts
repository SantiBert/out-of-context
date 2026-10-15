export type GuestSession = {
  name: string;
  roomCode: string;
  token: string;
};

export type SessionStorage = {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
};

const storageKey = 'ooc.guest.session';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

export function parseGuestSession(value: unknown): GuestSession | null {
  if (!isRecord(value)) {
    return null;
  }
  const { name, roomCode, token } = value;
  if (
    typeof name !== 'string' ||
    name.length === 0 ||
    typeof roomCode !== 'string' ||
    roomCode.length === 0 ||
    typeof token !== 'string' ||
    token.length === 0
  ) {
    return null;
  }
  return { name, roomCode, token };
}

export async function saveGuestSession(
  session: GuestSession,
  storage: SessionStorage,
): Promise<void> {
  await storage.setItem(storageKey, JSON.stringify(session));
}

export async function loadGuestSession(
  storage: SessionStorage,
): Promise<GuestSession | null> {
  const raw = await storage.getItem(storageKey);
  if (raw === null) {
    return null;
  }
  try {
    return parseGuestSession(JSON.parse(raw) as unknown);
  } catch {
    return null;
  }
}
