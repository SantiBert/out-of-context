import { describe, expect, it } from '@jest/globals';

import { appTitle } from '../src/screens/HomeScreen';

describe('HomeScreen', () => {
  it('identifica la aplicación', () => {
    expect(appTitle).toBe('Out Of Context');
  });
});
