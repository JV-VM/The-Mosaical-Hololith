import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { buildErrorCode } from '../http/api-response';
import { logger } from '../middleware/request-logger.middleware';

type RequestWithContext = {
  id?: string;
  headers: Record<string, unknown>;
  url: string;
  routeOptions?: { url?: string };
};

type ResponseLike = {
  code?: (statusCode: number) => ResponseLike;
  status?: (statusCode: number) => ResponseLike;
  send?: (body: Record<string, unknown>) => void;
  json?: (body: Record<string, unknown>) => void;
  sent?: boolean;
  headersSent?: boolean;
  statusCode?: number;
  setHeader?: (name: string, value: string) => void;
  end?: (body?: string) => void;
  raw?: {
    statusCode?: number;
    headersSent?: boolean;
    setHeader?: (name: string, value: string) => void;
    end?: (body?: string) => void;
  };
};

const getHeaderString = (value: unknown): string | undefined => {
  if (typeof value === 'string') return value;
  if (Array.isArray(value)) {
    const firstUnknown: unknown = value[0];
    return typeof firstUnknown === 'string' ? firstUnknown : undefined;
  }
  return undefined;
};

@Catch()
export class GlobalHttpExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<ResponseLike>();
    const request =
      ctx.getRequest<RequestWithContext>() ?? ({} as RequestWithContext);
    const headers = request.headers ?? {};
    const headerRequestId = getHeaderString(headers['x-request-id']);
    const requestId = request.id ?? headerRequestId;
    const path = request.routeOptions?.url ?? request.url ?? '';

    const safeSend = (
      res: ResponseLike | undefined,
      status: number,
      body: Record<string, unknown>,
    ) => {
      try {
        if (!res) return;

        const raw = res.raw ?? res;
        const alreadySent =
          Boolean(res.headersSent) ||
          Boolean(res.sent) ||
          Boolean(raw.headersSent);
        if (alreadySent) return;

        if (typeof res.code === 'function' && typeof res.send === 'function') {
          const chained = res.code(status);
          if (typeof chained.send === 'function') {
            chained.send(body);
            return;
          }
        }

        if (typeof res.status === 'function') {
          const chained = res.status(status);
          if (typeof chained.json === 'function') {
            chained.json(body);
            return;
          }
          if (typeof chained.send === 'function') {
            chained.send(body);
            return;
          }
        }

        if (
          typeof raw.setHeader === 'function' &&
          typeof raw.end === 'function'
        ) {
          raw.statusCode = status;
          raw.setHeader('content-type', 'application/json; charset=utf-8');
          raw.end(JSON.stringify(body));
        }
      } catch {
        // Never throw inside the exception filter.
      }
    };

    const sendResponse = (
      statusCode: number,
      body: Record<string, unknown>,
    ) => {
      safeSend(response, statusCode, body);
    };

    const buildErrorResponse = (params: {
      statusCode: number;
      message: string;
      details?: unknown;
    }) => ({
      success: false as const,
      error: {
        statusCode: params.statusCode,
        code: buildErrorCode(params.statusCode, params.details),
        message: params.message,
        ...(params.details === undefined ? {} : { details: params.details }),
      },
      meta: {
        timestamp: new Date().toISOString(),
        path,
        requestId,
      },
    });

    try {
      if (exception instanceof HttpException) {
        const status = exception.getStatus();
        const messageBody: unknown = exception.getResponse();
        const safeErr =
          exception instanceof Error
            ? {
                name: exception.name,
                message: exception.message,
                stack: exception.stack,
              }
            : { name: 'UnknownError', message: String(exception) };

        if (status >= 500) {
          try {
            logger.error(
              {
                requestId,
                statusCode: status,
                path,
                err: safeErr,
              },
              'http_exception',
            );
          } catch {
            // ignore logger failures
          }
        }

        let message = exception.message;
        let details: unknown;

        if (typeof messageBody === 'string') {
          message = messageBody;
        }

        if (typeof messageBody === 'object' && messageBody !== null) {
          const body = messageBody as Record<string, unknown>;
          const bodyMessage = body.message;
          if (typeof bodyMessage === 'string') {
            message = bodyMessage;
          } else if (Array.isArray(bodyMessage)) {
            message = 'Validation failed';
            details = bodyMessage;
          }

          if (body.details !== undefined) {
            details = body.details;
          }
        }

        sendResponse(
          status,
          buildErrorResponse({
            statusCode: status,
            message,
            details,
          }),
        );
        return;
      }

      const exceptionStatus =
        typeof (exception as { statusCode?: unknown })?.statusCode === 'number'
          ? (exception as { statusCode: number }).statusCode
          : typeof (exception as { status?: unknown })?.status === 'number'
            ? (exception as { status: number }).status
            : undefined;
      if (exceptionStatus && exceptionStatus >= 400) {
        const message =
          exception instanceof Error ? exception.message : 'Request failed';
        sendResponse(
          exceptionStatus,
          buildErrorResponse({
            statusCode: exceptionStatus,
            message,
          }),
        );
        return;
      }

      // Non-HTTP exceptions: never leak internal error details to clients.
      const status = HttpStatus.INTERNAL_SERVER_ERROR;
      const safeErr =
        exception instanceof Error
          ? {
              name: exception.name,
              message: exception.message,
              stack: exception.stack,
            }
          : { name: 'UnknownError' };

      try {
        logger.error(
          {
            requestId,
            statusCode: status,
            path,
            err: safeErr,
          },
          'internal_exception',
        );
      } catch {
        // ignore logger failures
      }

      sendResponse(
        status,
        buildErrorResponse({
          statusCode: status,
          message: 'Internal server error',
        }),
      );
    } catch {
      // Never throw inside the exception filter.
      safeSend(
        response,
        HttpStatus.INTERNAL_SERVER_ERROR,
        buildErrorResponse({
          statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
          message: 'Internal server error',
        }),
      );
    }
  }
}
