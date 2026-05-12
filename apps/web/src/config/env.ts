const requireEnv = (value: string | undefined, fallback: string): string =>
  typeof value === 'string' && value.trim().length > 0 ? value : fallback;

export const appEnv = {
  appName: requireEnv(
    process.env.NEXT_PUBLIC_APP_NAME,
    'The Mosaical Hololith',
  ),
  apiBaseUrl: requireEnv(
    process.env.NEXT_PUBLIC_API_BASE_URL,
    'http://localhost:3000/api/v1',
  ),
} as const;
