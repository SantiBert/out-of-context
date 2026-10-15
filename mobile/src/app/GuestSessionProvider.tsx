import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

import {
  loadGuestSession,
  saveGuestSession,
  type GuestSession,
  type SessionStorage,
} from '../services/session/guestSession';
import { secureSessionStorage } from '../services/session/secureStore';

type GuestSessionContextValue = {
  session: GuestSession | null;
  ready: boolean;
  saveSession: (session: GuestSession) => Promise<void>;
};

const GuestSessionContext = createContext<GuestSessionContextValue | null>(
  null,
);

type GuestSessionProviderProps = {
  children: ReactNode;
  storage?: SessionStorage;
};

export function GuestSessionProvider({
  children,
  storage = secureSessionStorage,
}: GuestSessionProviderProps) {
  const [session, setSession] = useState<GuestSession | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let active = true;
    loadGuestSession(storage)
      .then((stored) => {
        if (active) {
          setSession(stored);
        }
      })
      .finally(() => {
        if (active) {
          setReady(true);
        }
      });
    return () => {
      active = false;
    };
  }, [storage]);

  const value = useMemo<GuestSessionContextValue>(
    () => ({
      session,
      ready,
      saveSession: async (next) => {
        await saveGuestSession(next, storage);
        setSession(next);
      },
    }),
    [ready, session, storage],
  );

  return (
    <GuestSessionContext.Provider value={value}>
      {children}
    </GuestSessionContext.Provider>
  );
}

export function useGuestSession(): GuestSessionContextValue {
  const value = useContext(GuestSessionContext);
  if (value === null) {
    throw new Error(
      'useGuestSession debe usarse dentro de GuestSessionProvider.',
    );
  }
  return value;
}
