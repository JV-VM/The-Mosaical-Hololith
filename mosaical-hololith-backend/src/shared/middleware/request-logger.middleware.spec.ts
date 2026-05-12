const mockInfo = jest.fn();

jest.mock('crypto', () => ({
  randomUUID: jest.fn(() => 'generated-request-id'),
}));

jest.mock('pino', () =>
  jest.fn(() => ({
    info: mockInfo,
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
    trace: jest.fn(),
  })),
);

import { logger, RequestLoggerMiddleware } from './request-logger.middleware';

type RequestLike = {
  id?: string;
  headers: Record<string, unknown>;
  method: string;
  url: string;
  ip?: string;
  routeOptions?: { url?: string };
};

type ReplyLike = {
  header?: (name: string, value: string) => void;
  statusCode?: number;
  raw: {
    on: (event: 'finish', handler: () => void) => void;
    setHeader?: (name: string, value: string) => void;
  };
};

const getFinishHandler = (onMock: jest.Mock): (() => void) => {
  const call = onMock.mock.calls[0] as unknown[];
  const handler = call?.[1];

  if (typeof handler !== 'function') {
    throw new Error('Expected finish handler to be registered');
  }

  return handler as () => void;
};

describe('RequestLoggerMiddleware', () => {
  let middleware: RequestLoggerMiddleware;

  beforeEach(() => {
    middleware = new RequestLoggerMiddleware();
    mockInfo.mockClear();
    (logger.info as jest.Mock).mockClear();
  });

  it('uses the existing request id, sets the response header, and logs on finish', () => {
    const onMock = jest.fn();
    const req: RequestLike = {
      id: 'req-1',
      headers: {
        'user-agent': 'jest',
        'x-tenant-id': 'tenant-1',
      },
      method: 'GET',
      url: '/stores/1',
      ip: '127.0.0.1',
      routeOptions: { url: '/stores/:id' },
    };
    const res: ReplyLike = {
      header: jest.fn(),
      statusCode: 204,
      raw: {
        on: onMock,
      },
    };
    const next = jest.fn();

    middleware.use(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(res.header).toHaveBeenCalledWith('x-request-id', 'req-1');
    expect(onMock).toHaveBeenCalledWith('finish', expect.any(Function));

    getFinishHandler(onMock)();

    expect(logger.info).toHaveBeenCalledWith(
      expect.objectContaining({
        requestId: 'req-1',
        method: 'GET',
        path: '/stores/:id',
        statusCode: 204,
        ip: '127.0.0.1',
        userAgent: 'jest',
        tenantId: 'tenant-1',
      }),
      'http_request',
    );
  });

  it('falls back to raw.setHeader and reuses x-request-id from the request header', () => {
    const onMock = jest.fn();
    const setHeaderMock = jest.fn();
    const req: RequestLike = {
      headers: {
        'x-request-id': ['req-2'],
      },
      method: 'POST',
      url: '/catalog',
    };
    const res: ReplyLike = {
      raw: {
        on: onMock,
        setHeader: setHeaderMock,
      },
    };

    middleware.use(req, res, jest.fn());

    expect(req.id).toBe('req-2');
    expect(setHeaderMock).toHaveBeenCalledWith('x-request-id', 'req-2');
  });

  it('generates a request id when none is provided', () => {
    const setHeaderMock = jest.fn();
    const req: RequestLike = {
      headers: {},
      method: 'GET',
      url: '/health',
    };
    const res: ReplyLike = {
      raw: {
        on: jest.fn(),
        setHeader: setHeaderMock,
      },
    };

    middleware.use(req, res, jest.fn());

    expect(req.id).toBe('generated-request-id');
    expect(setHeaderMock).toHaveBeenCalledWith(
      'x-request-id',
      'generated-request-id',
    );
  });
});
