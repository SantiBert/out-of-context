const missingApiUrlMessage =
  'Falta EXPO_PUBLIC_API_URL. Copia mobile/.env.example a mobile/.env y reinicia Metro.';

export function parseApiBaseUrl(value: string | undefined): string {
  const url = value?.trim() ?? '';
  if (!url) {
    throw new Error(missingApiUrlMessage);
  }

  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    throw new Error('EXPO_PUBLIC_API_URL no es una URL válida.');
  }

  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    throw new Error('EXPO_PUBLIC_API_URL debe usar http o https.');
  }

  return url.replace(/\/$/, '');
}

export function getApiBaseUrl(): string {
  return parseApiBaseUrl(process.env.EXPO_PUBLIC_API_URL);
}
