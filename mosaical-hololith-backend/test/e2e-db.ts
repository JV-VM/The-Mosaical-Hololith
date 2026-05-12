const E2E_ALLOWED_HOSTS = new Set(['127.0.0.1', 'localhost']);
const E2E_ALLOWED_DATABASE_SUFFIXES = ['_e2e', '_test'];

const getDatabaseName = (pathname: string) => pathname.replace(/^\/+/, '');

export const getE2EDatabaseUrl = () => {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error(
      'DATABASE_URL is missing for e2e tests. Start the local test database and load .env.test.',
    );
  }

  let parsedUrl: URL;
  try {
    parsedUrl = new URL(connectionString);
  } catch {
    throw new Error('DATABASE_URL is not a valid URL for e2e tests.');
  }

  const databaseName = getDatabaseName(parsedUrl.pathname);
  const isAllowedHost = E2E_ALLOWED_HOSTS.has(parsedUrl.hostname);
  const isAllowedDatabase = E2E_ALLOWED_DATABASE_SUFFIXES.some((suffix) =>
    databaseName.endsWith(suffix),
  );

  if (!isAllowedHost || !isAllowedDatabase) {
    throw new Error(
      `Refusing to run e2e against "${parsedUrl.host}/${databaseName}". Use a local database whose name ends with "_e2e" or "_test".`,
    );
  }

  return connectionString;
};
