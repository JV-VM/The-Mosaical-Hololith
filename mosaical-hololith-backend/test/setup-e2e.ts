import { rm } from 'node:fs/promises';
import path from 'node:path';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { env } from '../src/shared/env';
import { getE2EDatabaseUrl } from './e2e-db';

const DEBUG_E2E = process.env.DEBUG_E2E === 'true';

type DebuggableResponse = {
  statusCode?: number;
  headers?: Record<string, unknown>;
  body?: unknown;
  json?: () => unknown;
};

export const debugResponse = (res: DebuggableResponse, label: string) => {
  if (!DEBUG_E2E) return;
  let body: unknown = res.body;
  if (body === undefined && typeof res.json === 'function') {
    try {
      body = res.json();
    } catch {
      body = undefined;
    }
  }

  const payload = {
    label,
    statusCode: res.statusCode,
    headers: res.headers,
    body,
  };
  const text = JSON.stringify(payload);

  console.log(text.slice(0, 2000));
};

jest.mock('../src/shared/middleware/request-logger.middleware', () => {
  class RequestLoggerMiddleware {
    use(_req: unknown, _res: unknown, next: () => void) {
      next();
    }
  }

  return {
    RequestLoggerMiddleware,
    logger: {
      info: jest.fn(),
      error: jest.fn(),
      warn: jest.fn(),
      debug: jest.fn(),
      trace: jest.fn(),
    },
  };
});

const connectionString = getE2EDatabaseUrl();

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString }),
});

const mediaDirectory = path.resolve(process.cwd(), env.MEDIA_LOCAL_DIR);

const resetMediaDirectory = async () => {
  await rm(mediaDirectory, { recursive: true, force: true });
};

beforeAll(async () => {
  try {
    await prisma.$queryRaw`SELECT 1`;
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'unknown database error';
    throw new Error(
      `E2E database is unreachable. Start the local service with "pnpm run test:e2e:db:up", run "pnpm run db:migrate:test", and verify .env.test is loaded. Original error: ${message}`,
    );
  }
});

beforeEach(async () => {
  await resetMediaDirectory();
  await prisma.analyticsEvent.deleteMany();
  await prisma.productTag.deleteMany();
  await prisma.storeTag.deleteMany();
  await prisma.productMediaAsset.deleteMany();
  await prisma.product.deleteMany();
  await prisma.page.deleteMany();
  await prisma.mediaAsset.deleteMany();
  await prisma.store.deleteMany();
  await prisma.subscription.deleteMany();
  await prisma.plan.deleteMany();
  await prisma.membership.deleteMany();
  await prisma.tenant.deleteMany();
  await prisma.user.deleteMany();
});

afterAll(async () => {
  await resetMediaDirectory();
  await prisma.$disconnect();
});
