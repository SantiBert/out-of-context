import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';

import { getApiBaseUrl } from '../config/env';
import {
  fetchRoom,
  networkMessage,
  type RoomState,
} from '../services/api/rooms';
import {
  acceptGeneration,
  decideAfterClose,
} from '../services/realtime/connection';
import {
  applyRoomEvent,
  roomSocketUrl,
  type LobbyConnection,
} from '../services/realtime/lobby';
import { useGuestSession } from './GuestSessionProvider';

export type RoomSocketEvent =
  | { kind: 'live'; generation: number }
  | { kind: 'message'; message: unknown; generation: number };

type RoomListener = (event: RoomSocketEvent) => void;

type SendResult = 'sent' | 'unavailable';

type RoomCommand = {
  type: string;
  payload: Record<string, never>;
};

type RoomConnectionValue = {
  connection: LobbyConnection;
  notice: string | undefined;
  room: RoomState | null;
  generation: number;
  retry: () => void;
  send: (command: RoomCommand) => SendResult;
  subscribe: (listener: RoomListener) => () => void;
};

const RoomConnectionContext = createContext<RoomConnectionValue | null>(null);

export function RoomConnectionProvider({ children }: { children: ReactNode }) {
  const { session } = useGuestSession();
  const [connection, setConnection] = useState<LobbyConnection>('connecting');
  const [notice, setNotice] = useState<string | undefined>();
  const [room, setRoom] = useState<RoomState | null>(null);
  const [generation, setGeneration] = useState(0);
  const listeners = useRef(new Set<RoomListener>());
  const retryRef = useRef(() => undefined);
  const sendRef = useRef<(command: RoomCommand) => SendResult>(
    () => 'unavailable',
  );

  const [seenSession, setSeenSession] = useState(session);
  if (session !== seenSession) {
    setSeenSession(session);
    setConnection('connecting');
    setNotice(undefined);
    setRoom(null);
    setGeneration(0);
  }

  const subscribe = useCallback((listener: RoomListener) => {
    listeners.current.add(listener);
    return () => {
      listeners.current.delete(listener);
    };
  }, []);

  useEffect(() => {
    if (!session) {
      return;
    }
    const current = session;
    let socket: WebSocket | null = null;
    let opened = false;
    let failures = 0;
    let fatal = false;
    let stopped = false;
    let activeGeneration = 0;
    let phase: LobbyConnection = 'connecting';
    let timer: ReturnType<typeof setTimeout> | null = null;

    function emit(event: RoomSocketEvent) {
      listeners.current.forEach((listener) => {
        listener(event);
      });
    }

    function connect(next: LobbyConnection) {
      if (timer !== null) {
        clearTimeout(timer);
        timer = null;
      }
      const previous = socket;
      activeGeneration += 1;
      const socketGeneration = activeGeneration;
      opened = false;
      phase = next;
      setGeneration(socketGeneration);
      setConnection(next);
      if (!fatal) {
        setNotice(undefined);
      }
      socket = new WebSocket(
        roomSocketUrl(getApiBaseUrl(), current.roomCode, current.token),
      );
      sendRef.current = (command) => {
        if (
          phase !== 'live' ||
          socket === null ||
          socket.readyState !== WebSocket.OPEN
        ) {
          return 'unavailable';
        }
        try {
          socket.send(JSON.stringify(command));
          return 'sent';
        } catch {
          return 'unavailable';
        }
      };
      socket.onopen = () => {
        if (!acceptGeneration(activeGeneration, socketGeneration) || stopped) {
          return;
        }
        opened = true;
        failures = 0;
        phase = 'live';
        setConnection('live');
        emit({ kind: 'live', generation: socketGeneration });
        fetchRoom(current.roomCode)
          .then((loaded) => {
            if (
              !acceptGeneration(activeGeneration, socketGeneration) ||
              stopped
            ) {
              return;
            }
            setRoom(loaded);
          })
          .catch((error: unknown) => {
            if (
              !acceptGeneration(activeGeneration, socketGeneration) ||
              stopped
            ) {
              return;
            }
            setNotice(error instanceof Error ? error.message : networkMessage);
          });
      };
      socket.onmessage = (event) => {
        if (!acceptGeneration(activeGeneration, socketGeneration) || stopped) {
          return;
        }
        const message = parseMessage(event.data);
        const applied = applyRoomEvent(null, message);
        if (applied.fatal) {
          fatal = true;
          phase = 'error';
          setConnection('error');
          setNotice(applied.fatal.detail);
          socket?.close();
          return;
        }
        if (applied.room) {
          setRoom(applied.room);
        }
        emit({ kind: 'message', message, generation: socketGeneration });
      };
      socket.onclose = () => {
        if (!acceptGeneration(activeGeneration, socketGeneration) || stopped) {
          return;
        }
        const decision = decideAfterClose({ opened, failures, fatal });
        failures = decision.failures;
        if (decision.kind === 'stop') {
          phase = 'error';
          setConnection('error');
          return;
        }
        phase = 'reconnecting';
        setConnection('reconnecting');
        timer = setTimeout(() => {
          if (!stopped) {
            connect('reconnecting');
          }
        }, decision.delayMs);
      };
      previous?.close();
    }

    retryRef.current = () => {
      if (stopped) {
        return;
      }
      fatal = false;
      failures = 0;
      connect('connecting');
    };
    connect('connecting');

    return () => {
      stopped = true;
      if (timer !== null) {
        clearTimeout(timer);
      }
      sendRef.current = () => 'unavailable';
      socket?.close();
    };
  }, [session]);

  const value = useMemo<RoomConnectionValue>(
    () => ({
      connection,
      notice,
      room,
      generation,
      retry: () => {
        retryRef.current();
      },
      send: (command) => sendRef.current(command),
      subscribe,
    }),
    [connection, generation, notice, room, subscribe],
  );

  return (
    <RoomConnectionContext.Provider value={value}>
      {children}
    </RoomConnectionContext.Provider>
  );
}

export function useRoomConnection(): RoomConnectionValue {
  const value = useContext(RoomConnectionContext);
  if (value === null) {
    throw new Error(
      'useRoomConnection debe usarse dentro de RoomConnectionProvider.',
    );
  }
  return value;
}

export function useRoomEvents(
  onLive: () => void,
  onMessage: (message: unknown) => void,
) {
  const { subscribe, connection } = useRoomConnection();
  const liveRef = useRef(onLive);
  const messageRef = useRef(onMessage);
  const connectionRef = useRef(connection);

  useEffect(() => {
    liveRef.current = onLive;
    messageRef.current = onMessage;
    connectionRef.current = connection;
  });

  useEffect(() => {
    if (connectionRef.current === 'live') {
      liveRef.current();
    }
    return subscribe((event) => {
      if (event.kind === 'live') {
        liveRef.current();
      }
      if (event.kind === 'message') {
        messageRef.current(event.message);
      }
    });
  }, [subscribe]);
}

function parseMessage(data: unknown): unknown {
  if (typeof data !== 'string') {
    return null;
  }
  try {
    return JSON.parse(data) as unknown;
  } catch {
    return null;
  }
}
