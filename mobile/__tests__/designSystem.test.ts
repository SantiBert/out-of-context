import { describe, expect, it } from '@jest/globals';

import { Button } from '../src/components/Button';
import { ConfirmAction } from '../src/components/ConfirmAction';
import { ProgressIndicator } from '../src/components/ProgressIndicator';
import { ScreenHeader } from '../src/components/ScreenHeader';
import { SelectableOption } from '../src/components/SelectableOption';
import { TextField } from '../src/components/TextField';
import { useAppFonts } from '../src/theme/fonts';

describe('design system components', () => {
  it('exporta primitivos y compuestos del design system', () => {
    expect(typeof Button).toBe('function');
    expect(typeof TextField).toBe('function');
    expect(typeof ConfirmAction).toBe('function');
    expect(typeof SelectableOption).toBe('function');
    expect(typeof ScreenHeader).toBe('function');
    expect(typeof ProgressIndicator).toBe('function');
  });

  it('carga fuentes en tests mediante mock', () => {
    expect(useAppFonts()).toBe(true);
  });
});
