import type { ApiErrorResponse } from '@tmh/types';

type RequestInitWithJson = RequestInit & {
  json?: unknown;
};

type ApiClientOptions = {
  baseUrl: string;
};

const joinUrl = (baseUrl: string, path: string): string => {
  const normalizedBase = baseUrl.endsWith('/')
    ? baseUrl.slice(0, -1)
    : baseUrl;
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return `${normalizedBase}${normalizedPath}`;
};

const buildError = async (response: Response): Promise<Error> => {
  let payload: ApiErrorResponse | undefined;

  try {
    payload = (await response.json()) as ApiErrorResponse;
  } catch {
    payload = undefined;
  }

  const message =
    payload?.message ??
    `API request failed: ${response.status} ${response.statusText}`;
  const printableMessage = Array.isArray(message) ? message.join('; ') : message;
  return new Error(printableMessage);
};

export const createApiClient = ({ baseUrl }: ApiClientOptions) => ({
  async fetchJson<T>(
    path: string,
    init: RequestInitWithJson = {},
  ): Promise<T> {
    const headers = new Headers(init.headers);

    if (init.json !== undefined) {
      headers.set('content-type', 'application/json');
    }

    const response = await fetch(joinUrl(baseUrl, path), {
      ...init,
      headers,
      body: init.json !== undefined ? JSON.stringify(init.json) : init.body,
    });

    if (!response.ok) {
      throw await buildError(response);
    }

    return (await response.json()) as T;
  },
});
