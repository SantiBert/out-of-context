import { useEffect, useRef } from 'react';

import { homeRoute } from '../navigation/routes';
import { useAppNavigation } from './useAppNavigation';

/**
 * En pantallas con stack de una sola ruta, el Atrás de Android sale de la app.
 * Aquí se iguala a Inicio: reset a Home sin abandonar la partida.
 */
export function useExitToHomeOnBack() {
  const navigation = useAppNavigation();
  const allowingExit = useRef(false);

  useEffect(() => {
    const unsubscribe = navigation.addListener('beforeRemove', (event) => {
      if (allowingExit.current) {
        return;
      }
      event.preventDefault();
      allowingExit.current = true;
      navigation.reset({ index: 0, routes: [{ name: homeRoute }] });
    });
    return unsubscribe;
  }, [navigation]);
}
