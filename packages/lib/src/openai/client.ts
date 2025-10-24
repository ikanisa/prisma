import OpenAI, { type ClientOptions } from 'openai';

import { getOpenAiClientBaseUrl } from './url.js';
import { getOpenAiWorkloadConfig, type OpenAiWorkloadKey } from './workloads.js';

const DEFAULT_TIMEOUT_MS = 60_000;

function buildClientOptions(options: ClientOptions | undefined, workload: OpenAiWorkloadKey): ClientOptions {
  const config = getOpenAiWorkloadConfig(workload);

  const apiKey = options?.apiKey ?? config.apiKey;
  const baseURL = options?.baseURL ?? getOpenAiClientBaseUrl();
  const timeout = options?.timeout ?? DEFAULT_TIMEOUT_MS;
  const organization = options?.organization ?? config.organization ?? undefined;

  const defaultHeaders = {
    'x-openai-user-agent': config.userAgentTag ?? 'prisma-glow-15',
    ...(options?.defaultHeaders ?? {}),
  };

  return {
    apiKey,
    baseURL,
    timeout,
    organization,
    defaultHeaders,
  };
}

const sharedClients = new Map<OpenAiWorkloadKey, OpenAI>();

function createClient(workload: OpenAiWorkloadKey, options?: ClientOptions): OpenAI {
  const clientOptions = buildClientOptions(options, workload);
  return new OpenAI(clientOptions);
}

export function getOpenAIClient(options?: ClientOptions): OpenAI {
  return getOpenAIClientForWorkload('default', options);
}

export function getOpenAIClientForWorkload(workload: OpenAiWorkloadKey, options?: ClientOptions): OpenAI {
  const key = workload ?? 'default';
  const existing = sharedClients.get(key);
  if (existing) {
    return existing;
  }
  const client = createClient(key, options);
  sharedClients.set(key, client);
  return client;
}

export function refreshOpenAIClient(options?: ClientOptions): OpenAI {
  return refreshOpenAIClientForWorkload('default', options);
}

export function refreshOpenAIClientForWorkload(workload: OpenAiWorkloadKey, options?: ClientOptions): OpenAI {
  const key = workload ?? 'default';
  const client = createClient(key, options);
  sharedClients.set(key, client);
  return client;
}

export function withOpenAIClient<T>(callback: (client: OpenAI) => Promise<T> | T): Promise<T> | T {
  const client = getOpenAIClient();
  return callback(client);
}

export function withOpenAIClientForWorkload<T>(
  workload: OpenAiWorkloadKey,
  callback: (client: OpenAI) => Promise<T> | T,
  options?: ClientOptions,
): Promise<T> | T {
  const client = getOpenAIClientForWorkload(workload, options);
  return callback(client);
}

export type { OpenAiWorkloadKey } from './workloads.js';
