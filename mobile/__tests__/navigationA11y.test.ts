import { describe, expect, it } from '@jest/globals';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { abandonConfirmVariant } from '../src/components/LocalAbandonControl';
import {
  exitToHomeRoutes,
  isExitToHomeRoute,
} from '../src/navigation/exitToHomeRoutes';
import { stackScreenAnimation } from '../src/navigation/stackAnimation';

describe('navigation a11y OOC-020.11', () => {
  it('Atrás a Home solo en fases locales de partida', () => {
    expect(exitToHomeRoutes).toEqual([
      'LocalCard',
      'LocalTable',
      'LocalRecord',
      'LocalResults',
    ]);
    expect(isExitToHomeRoute('LocalCard')).toBe(true);
    expect(isExitToHomeRoute('Lobby')).toBe(false);
    expect(isExitToHomeRoute('LocalSetup')).toBe(false);
  });

  it('stack animation respeta reduce-motion', () => {
    expect(stackScreenAnimation(false)).toBe('fade');
    expect(stackScreenAnimation(true)).toBe('none');
  });

  it('Abandon confirma con variante destructive', () => {
    expect(abandonConfirmVariant).toBe('destructive');
  });

  it('LocalCard no anima el revelado privado', () => {
    const source = readFileSync(
      join(__dirname, '../src/screens/LocalCardScreen.tsx'),
      'utf8',
    );
    expect(source).not.toMatch(/\bAnimated\b/);
    expect(source).not.toMatch(/\bLayoutAnimation\b/);
    expect(source).toContain('useExitToHomeOnBack');
  });

  it('Create y Join usan KeyboardAvoidingView', () => {
    for (const file of ['CreateRoomScreen.tsx', 'JoinRoomScreen.tsx']) {
      const source = readFileSync(
        join(__dirname, '../src/screens', file),
        'utf8',
      );
      expect(source).toContain('KeyboardAvoidingView');
    }
  });
});
