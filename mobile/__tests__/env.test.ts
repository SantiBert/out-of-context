import { describe, expect, it } from '@jest/globals';

import { getApiBaseUrl, parseApiBaseUrl } from '../src/config/env';

describe('configuración del cliente', () => {
  it('rechaza una URL ausente', () => {
    expect(() => parseApiBaseUrl('  ')).toThrow(
      'Falta EXPO_PUBLIC_API_URL. Copia mobile/.env.example a mobile/.env y reinicia Metro.',
    );
  });

  it('rechaza una URL inválida', () => {
    expect(() => parseApiBaseUrl('no-es-una-url')).toThrow(
      'EXPO_PUBLIC_API_URL no es una URL válida.',
    );
    expect(() => parseApiBaseUrl('ftp://10.0.2.2:8000')).toThrow(
      'EXPO_PUBLIC_API_URL debe usar http o https.',
    );
  });

  it('acepta la URL pública del backend', () => {
    expect(parseApiBaseUrl('http://10.0.2.2:8000/')).toBe(
      'http://10.0.2.2:8000',
    );
  });

  it('lee EXPO_PUBLIC_API_URL', () => {
    const previous = process.env.EXPO_PUBLIC_API_URL;
    process.env.EXPO_PUBLIC_API_URL = 'https://api.example.test';

    expect(getApiBaseUrl()).toBe('https://api.example.test');

    if (previous === undefined) {
      delete process.env.EXPO_PUBLIC_API_URL;
    } else {
      process.env.EXPO_PUBLIC_API_URL = previous;
    }
  });
});
