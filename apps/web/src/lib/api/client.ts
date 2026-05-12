import { createApiClient } from '@tmh/api-client';
import { appEnv } from '@/config/env';

export const apiClient = createApiClient({
  baseUrl: appEnv.apiBaseUrl,
});

export const apiFetch = apiClient.fetchJson;
