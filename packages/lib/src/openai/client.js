import OpenAI from 'openai';
import { getOpenAiClientBaseUrl } from './url.js';
import { getOpenAiWorkloadConfig } from './workloads.js';
const DEFAULT_TIMEOUT_MS = 60_000;
function buildClientOptions(options, workload) {
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
const sharedClients = new Map();
function createClient(workload, options) {
    const clientOptions = buildClientOptions(options, workload);
    return new OpenAI(clientOptions);
}
export function getOpenAIClient(options) {
    return getOpenAIClientForWorkload('default', options);
}
export function getOpenAIClientForWorkload(workload, options) {
    const key = workload ?? 'default';
    const existing = sharedClients.get(key);
    if (existing) {
        return existing;
    }
    const client = createClient(key, options);
    sharedClients.set(key, client);
    return client;
}
export function refreshOpenAIClient(options) {
    return refreshOpenAIClientForWorkload('default', options);
}
export function refreshOpenAIClientForWorkload(workload, options) {
    const key = workload ?? 'default';
    const client = createClient(key, options);
    sharedClients.set(key, client);
    return client;
}
export function withOpenAIClient(callback) {
    const client = getOpenAIClient();
    return callback(client);
}
export function withOpenAIClientForWorkload(workload, callback, options) {
    const client = getOpenAIClientForWorkload(workload, options);
    return callback(client);
}
