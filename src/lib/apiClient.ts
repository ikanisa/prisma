import { authorizedFetch } from '@/lib/api';

export interface ApiRequestDescriptor {
  path: string;
  method?: string;
  body?: unknown;
  headers?: Record<string, string>;
  query?: Record<string, string | number | boolean | null | undefined>;
}

const isFormData = (value: unknown): value is FormData =>
  typeof FormData !== 'undefined' && value instanceof FormData;

const normaliseQuery = (
  query?: ApiRequestDescriptor['query'],
): Record<string, string> | undefined => {
  if (!query) {
    return undefined;
  }

  const entries = Object.entries(query).reduce<Record<string, string>>((acc, [key, value]) => {
    if (value === undefined || value === null) {
      return acc;
    }
    acc[key] = String(value);
    return acc;
  }, {});

  return Object.keys(entries).length > 0 ? entries : undefined;
};

export async function callApi<T = unknown>({
  path,
  method = 'POST',
  body,
  headers,
  query,
}: ApiRequestDescriptor): Promise<T> {
  let targetPath = path;
  const normalisedQuery = normaliseQuery(query);
  if (normalisedQuery) {
    const searchParams = new URLSearchParams(normalisedQuery);
    const separator = targetPath.includes('?') ? '&' : '?';
    targetPath = `${targetPath}${separator}${searchParams.toString()}`;
  }

  const init: RequestInit = {
    method,
    headers: { ...(headers ?? {}) },
  };

  if (body !== undefined) {
    if (isFormData(body)) {
      init.body = body;
    } else if (typeof body === 'string') {
      init.body = body;
      if (!init.headers) {
        init.headers = {};
      }
      if (!('Content-Type' in init.headers)) {
        init.headers['Content-Type'] = 'text/plain;charset=UTF-8';
      }
    } else {
      init.body = JSON.stringify(body);
      if (!init.headers) {
        init.headers = {};
      }
      if (!('Content-Type' in init.headers)) {
        init.headers['Content-Type'] = 'application/json';
      }
    }
  }

  const response = await authorizedFetch(targetPath, init);
  if (!response.ok) {
    const errorBody = await response.text().catch(() => '');
    const message = errorBody || `request_failed_${response.status}`;
    throw new Error(message);
  }

  if (response.status === 204 || response.status === 205) {
    return undefined as T;
  }

  const contentType = response.headers.get('content-type');
  if (contentType && contentType.includes('application/json')) {
    try {
      return (await response.json()) as T;
    } catch {
      return undefined as T;
    }
  }

  const text = await response.text();
  return text as unknown as T;
}

export type ApiClientCall = typeof callApi;
