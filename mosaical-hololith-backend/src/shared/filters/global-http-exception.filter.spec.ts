import { ArgumentsHost, HttpException, HttpStatus } from '@nestjs/common';

jest.mock('../middleware/request-logger.middleware', () => ({
  logger: {
    error: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
    trace: jest.fn(),
  },
}));

import { logger } from '../middleware/request-logger.middleware';
import { GlobalHttpExceptionFilter } from './global-http-exception.filter';

type RequestLike = {
  id?: string;
  url: string;
  routeOptions?: { url?: string };
  headers: Record<string, unknown>;
};

type ResponseLike = {
  code?: (statusCode: number) => ResponseLike;
  status?: (statusCode: number) => ResponseLike;
  send?: (body: Record<string, unknown>) => void;
  json?: (body: Record<string, unknown>) => void;
  sent?: boolean;
  headersSent?: boolean;
};

function createHost(
  request: RequestLike,
  response: ResponseLike,
): ArgumentsHost {
  const hostLike = {
    switchToHttp: () => ({
      getRequest: (): RequestLike => request,
      getResponse: (): ResponseLike => response,
    }),
    getType: () => 'http',
  };

  return hostLike as unknown as ArgumentsHost;
}

function getSentBody(sendMock: jest.Mock): Record<string, unknown> {
  const firstCallUnknown: unknown = sendMock.mock.calls[0];
  expect(Array.isArray(firstCallUnknown)).toBe(true);
  if (!Array.isArray(firstCallUnknown)) {
    throw new Error('Expected send to be called');
  }

  const bodyUnknown: unknown = (firstCallUnknown as unknown[])[0];
  if (!bodyUnknown || typeof bodyUnknown !== 'object') {
    throw new Error('Expected body object');
  }

  return bodyUnknown as Record<string, unknown>;
}

describe('GlobalHttpExceptionFilter', () => {
  let filter: GlobalHttpExceptionFilter;
  const originalLogErrorStack = process.env.LOG_ERROR_STACK;

  beforeEach(() => {
    filter = new GlobalHttpExceptionFilter();
    (logger.error as jest.Mock).mockClear();
    delete process.env.LOG_ERROR_STACK;
  });

  afterEach(() => {
    if (originalLogErrorStack === undefined) {
      delete process.env.LOG_ERROR_STACK;
    } else {
      process.env.LOG_ERROR_STACK = originalLogErrorStack;
    }
  });

  it('uses the HttpException status and response payload for Express-like response', () => {
    const response: ResponseLike = {
      status: jest.fn(),
      json: jest.fn(),
      send: jest.fn(),
      headersSent: false,
    };
    (response.status as jest.Mock).mockImplementation(() => response);

    const request: RequestLike = {
      url: '/bad-request',
      headers: { 'x-request-id': 'req-1' },
    };

    const host = createHost(request, response);
    filter.catch(new HttpException({ message: 'bad input' }, 400), host);

    expect(response.status).toHaveBeenCalledWith(400);
    const body = getSentBody(response.json as jest.Mock);
    expect(body).toMatchObject({
      success: false,
      error: {
        statusCode: 400,
        code: 'BAD_REQUEST',
        message: 'bad input',
      },
      meta: {
        path: '/bad-request',
        requestId: 'req-1',
      },
    });
  });

  it('uses the HttpException status and response payload for Fastify-like reply', () => {
    const response: ResponseLike = {
      code: jest.fn(),
      send: jest.fn(),
      sent: false,
    };
    (response.code as jest.Mock).mockImplementation(() => response);

    const request: RequestLike = {
      url: '/bad-request-fastify',
      headers: { 'x-request-id': 'req-1-fastify' },
    };

    const host = createHost(request, response);
    filter.catch(new HttpException({ message: 'bad input' }, 400), host);

    expect(response.code).toHaveBeenCalledWith(400);
    const body = getSentBody(response.send as jest.Mock);
    expect(body).toMatchObject({
      success: false,
      error: {
        statusCode: 400,
        code: 'BAD_REQUEST',
        message: 'bad input',
      },
      meta: {
        path: '/bad-request-fastify',
        requestId: 'req-1-fastify',
      },
    });
  });

  it('sanitizes unknown errors to 500 while preserving requestId', () => {
    const response: ResponseLike = {
      code: jest.fn(),
      send: jest.fn(),
    };
    (response.code as jest.Mock).mockImplementation(() => response);

    const request: RequestLike = {
      id: 'req-2',
      url: '/boom',
      headers: {},
    };

    const host = createHost(request, response);
    filter.catch(new Error('sensitive details'), host);

    expect(response.code).toHaveBeenCalledWith(
      HttpStatus.INTERNAL_SERVER_ERROR,
    );
    const body = getSentBody(response.send as jest.Mock);
    expect(body).toMatchObject({
      success: false,
      error: {
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Internal server error',
      },
      meta: {
        path: '/boom',
        requestId: 'req-2',
      },
    });
    expect((body.error as { message: string }).message).not.toBe(
      'sensitive details',
    );

    expect(logger.error).toHaveBeenCalled();
  });

  it('maps validation arrays into a validation error response', () => {
    const response: ResponseLike = {
      status: jest.fn(),
      json: jest.fn(),
      send: jest.fn(),
      headersSent: false,
    };
    (response.status as jest.Mock).mockImplementation(() => response);

    const request: RequestLike = {
      url: '/validation',
      headers: { 'x-request-id': 'req-validation' },
    };

    const host = createHost(request, response);
    filter.catch(
      new HttpException(
        {
          message: ['email must be an email'],
          error: 'Bad Request',
          statusCode: 400,
        },
        400,
      ),
      host,
    );

    const body = getSentBody(response.json as jest.Mock);
    expect(body).toMatchObject({
      success: false,
      error: {
        statusCode: 400,
        code: 'VALIDATION_ERROR',
        message: 'Validation failed',
        details: ['email must be an email'],
      },
      meta: {
        path: '/validation',
        requestId: 'req-validation',
      },
    });
  });

  it('can log error details when LOG_ERROR_STACK=true', () => {
    process.env.LOG_ERROR_STACK = 'true';
    const response: ResponseLike = {
      code: jest.fn(),
      send: jest.fn(),
    };
    (response.code as jest.Mock).mockImplementation(() => response);

    const request: RequestLike = {
      id: 'req-3',
      url: '/boom',
      headers: {},
    };

    const host = createHost(request, response);
    filter.catch(new Error('sensitive details'), host);

    expect(logger.error).toHaveBeenCalled();
    const logArgs = JSON.stringify((logger.error as jest.Mock).mock.calls);
    expect(logArgs).toContain('sensitive details');
  });
});
