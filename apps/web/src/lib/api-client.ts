import { ApiClient, type ClientOptions } from '@prisma-glow/api-client';
import { clientEnv } from '@/src/env.client';

let cachedClient: ApiClient | null = null;

const resolveBaseUrl = (): string => {
  if (clientEnv.NEXT_PUBLIC_API_BASE && clientEnv.NEXT_PUBLIC_API_BASE.length > 0) {
    return clientEnv.NEXT_PUBLIC_API_BASE.replace(/\/$/, '');
  }
  return '';
};

const createOptions = (token?: string): ClientOptions => {
  const baseUrl = resolveBaseUrl();
  const defaultHeaders: Record<string, string> = {};
  if (token) {
    defaultHeaders.Authorization = `Bearer ${token}`;
  }
  return {
    baseUrl,
    defaultHeaders,
    retryDelayMs: 300,
    retries: 2,
  } satisfies ClientOptions;
};

export const getApiClient = (token?: string): ApiClient => {
  if (!cachedClient || token) {
    if (token) {
      return new ApiClient(createOptions(token));
    }
    cachedClient = new ApiClient(createOptions());
  }
  return cachedClient;
};

export type ApiClientInstance = ReturnType<typeof getApiClient>;
