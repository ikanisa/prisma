const DEFAULT_OPENAI_BASE_URL = 'https://api.openai.com';

function stripTrailingSlashes(value: string): string {
  return value.replace(/\/+$/, '');
}

function stripVersionSuffix(value: string): string {
  return value.endsWith('/v1') ? value.slice(0, -3) : value;
}

export function normalizeOpenAiBaseUrl(baseUrl: string): string {
  const trimmed = baseUrl.trim();
  if (!trimmed) {
    return DEFAULT_OPENAI_BASE_URL;
  }

  const withoutTrailingSlashes = stripTrailingSlashes(trimmed);
  return stripVersionSuffix(withoutTrailingSlashes);
}

export function getOpenAiBaseUrl(): string {
  const raw = process.env.OPENAI_BASE_URL ?? DEFAULT_OPENAI_BASE_URL;
  return normalizeOpenAiBaseUrl(raw);
}

export function buildOpenAiUrl(path: string): string {
  const normalizedPath = path.replace(/^\/+/, '');
  return `${getOpenAiBaseUrl()}/v1/${normalizedPath}`;
}

export function getOpenAiClientBaseUrl(): string {
  return `${getOpenAiBaseUrl()}/v1`;
}

export { DEFAULT_OPENAI_BASE_URL };
