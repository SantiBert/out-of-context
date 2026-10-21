import { useEffect, useRef } from 'react';

import { homeRoute } from '../navigation/routes';
import { useAppNavigation } from './useAppNavigation';

/** Acciones de Atrás / pop que deben redirigir a Home. */
const BACK_ACTION_TYPES = new Set(['GO_BACK', 'POP', 'POP_TO_TOP']);

/**
 * True si la acción de `beforeRemove` es un Atrás del usuario (no un reset entre fases).
 */
export function isExitToHomeBackAction(actionType: string): boolean {
  return BACK_ACTION_TYPES.has(actionType);
}

/**
 * En pantallas con stack de una sola ruta, el Atrás de Android sale de la app.
 * Aquí se iguala a Inicio: reset a Home sin abandonar la partida.
 * `RESET` / `NAVIGATE` / `REPLACE` entre fases locales no se interceptan.
 */
export function useExitToHomeOnBack() {
  const navigation = useAppNavigation();
  const allowingExit = useRef(false);

  useEffect(() => {
    const unsubscribe = navigation.addListener('beforeRemove', (event) => {
      if (allowingExit.current) {
        return;
      }
      const actionType = event.data.action.type;
      if (!isExitToHomeBackAction(actionType)) {
        return;
      }
      event.preventDefault();
      allowingExit.current = true;
      navigation.reset({ index: 0, routes: [{ name: homeRoute }] });
    });
    return unsubscribe;
  }, [navigation]);
}
