import type { AppRoute } from './routes';

/** Fases locales donde Atrás = Inicio (sin abandonar). */
export const exitToHomeRoutes = [
  'LocalCard',
  'LocalTable',
  'LocalRecord',
  'LocalResults',
] as const satisfies readonly AppRoute[];

export type ExitToHomeRoute = (typeof exitToHomeRoutes)[number];

export function isExitToHomeRoute(route: string): route is ExitToHomeRoute {
  return (exitToHomeRoutes as readonly string[]).includes(route);
}
