import { describe, expect, it } from '@jest/globals';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import {
  HomeButton,
  homeButtonAccessibilityLabel,
  homeButtonLabel,
} from '../src/components/HomeButton';

describe('HomeButton OOC-020.11', () => {
  it('exporta label e accessibilityLabel unificados', () => {
    expect(typeof HomeButton).toBe('function');
    expect(homeButtonLabel).toBe('Inicio');
    expect(homeButtonAccessibilityLabel).toBe('Volver al inicio');
  });

  it('las pantallas migradas no definen HomeButton local', () => {
    const screens = [
      'LocalCardScreen.tsx',
      'LocalTableScreen.tsx',
      'LocalRecordScreen.tsx',
      'LocalResultsScreen.tsx',
      'LocalSetupScreen.tsx',
      'CreateRoomScreen.tsx',
      'JoinRoomScreen.tsx',
      'LobbyScreen.tsx',
    ];
    for (const file of screens) {
      const source = readFileSync(
        join(__dirname, '../src/screens', file),
        'utf8',
      );
      expect(source).toContain("from '../components/HomeButton'");
      expect(source).not.toMatch(/function HomeButton\b/);
      expect(source).not.toContain('accessibilityLabel="Volver al inicio"');
    }
  });
});
