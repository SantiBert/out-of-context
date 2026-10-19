export const appRoutes = [
  'Home',
  'ModeSelect',
  'OnlineEntry',
  'CreateRoom',
  'JoinRoom',
  'Lobby',
  'SecretCard',
  'Conversation',
  'Voting',
  'Results',
  'Scoreboard',
  'Catalog',
  'LocalSetup',
  'LocalMatchConfig',
  'LocalCard',
  'LocalTable',
  'LocalRecord',
  'LocalResults',
] as const;

export type AppRoute = (typeof appRoutes)[number];

export type RootStackParamList = {
  Home: undefined;
  ModeSelect: undefined;
  OnlineEntry: undefined;
  CreateRoom: undefined;
  JoinRoom: undefined;
  Lobby: undefined;
  SecretCard: undefined;
  Conversation: undefined;
  Voting: undefined;
  Results: undefined;
  Scoreboard: undefined;
  Catalog: undefined;
  LocalSetup: undefined;
  LocalMatchConfig: undefined;
  LocalCard: undefined;
  LocalTable: undefined;
  LocalRecord: undefined;
  LocalResults: undefined;
};

export const homeRoute: AppRoute = 'Home';

const knownRoutes: ReadonlySet<string> = new Set(appRoutes);

export function isAppRoute(value: string): value is AppRoute {
  return knownRoutes.has(value);
}

export function shouldResetToHome(state: unknown): boolean {
  if (typeof state !== 'object' || state === null || !('routes' in state)) {
    return true;
  }
  const routes = state.routes;
  if (!Array.isArray(routes) || routes.length === 0) {
    return true;
  }
  return routes.some((route) => {
    if (typeof route !== 'object' || route === null || !('name' in route)) {
      return true;
    }
    return typeof route.name !== 'string' || !isAppRoute(route.name);
  });
}
