import ApiClient from '@prisma-glow/api-client';
import { clientEnv } from '@/src/env.client';

let cachedClient: ApiClient | null = null;

export function getApiClient(): ApiClient {
  if (!cachedClient) {
    const baseUrl = clientEnv.NEXT_PUBLIC_API_BASE?.replace(/\/$/, '') ?? '';
    cachedClient = new ApiClient({ baseUrl });
  }
  return cachedClient;
}
