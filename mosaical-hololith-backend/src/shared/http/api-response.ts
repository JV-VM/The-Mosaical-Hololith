export type ErrorCode =
  | 'BAD_REQUEST'
  | 'VALIDATION_ERROR'
  | 'UNAUTHORIZED'
  | 'FORBIDDEN'
  | 'NOT_FOUND'
  | 'CONFLICT'
  | 'TOO_MANY_REQUESTS'
  | 'INTERNAL_SERVER_ERROR';

export type ErrorResponse = {
  success: false;
  error: {
    statusCode: number;
    code: ErrorCode;
    message: string;
    details?: unknown;
  };
  meta: {
    timestamp: string;
    path: string;
    requestId?: string;
  };
};

export type OffsetPaginationMeta = {
  limit: number;
  offset: number;
  count: number;
  total: number;
  hasMore: boolean;
};

export type ListResponse<T> = {
  data: T[];
  meta: {
    pagination: OffsetPaginationMeta;
  };
};

export const buildOffsetPaginationMeta = (params: {
  limit: number;
  offset: number;
  count: number;
  total: number;
}): OffsetPaginationMeta => ({
  limit: params.limit,
  offset: params.offset,
  count: params.count,
  total: params.total,
  hasMore: params.offset + params.count < params.total,
});

export const buildListResponse = <T>(params: {
  items: T[];
  limit: number;
  offset: number;
  total: number;
}): ListResponse<T> => ({
  data: params.items,
  meta: {
    pagination: buildOffsetPaginationMeta({
      limit: params.limit,
      offset: params.offset,
      count: params.items.length,
      total: params.total,
    }),
  },
});

export const buildErrorCode = (
  statusCode: number,
  details?: unknown,
): ErrorCode => {
  if (statusCode === 400 && Array.isArray(details)) {
    return 'VALIDATION_ERROR';
  }

  switch (statusCode) {
    case 400:
      return 'BAD_REQUEST';
    case 401:
      return 'UNAUTHORIZED';
    case 403:
      return 'FORBIDDEN';
    case 404:
      return 'NOT_FOUND';
    case 409:
      return 'CONFLICT';
    case 429:
      return 'TOO_MANY_REQUESTS';
    default:
      return 'INTERNAL_SERVER_ERROR';
  }
};
