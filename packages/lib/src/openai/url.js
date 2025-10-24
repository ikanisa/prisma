const DEFAULT_OPENAI_BASE_URL = 'https://api.openai.com';
function stripTrailingSlashes(value) {
    return value.replace(/\/+$/, '');
}
function stripVersionSuffix(value) {
    return value.endsWith('/v1') ? value.slice(0, -3) : value;
}
export function normalizeOpenAiBaseUrl(baseUrl) {
    const trimmed = baseUrl.trim();
    if (!trimmed) {
        return DEFAULT_OPENAI_BASE_URL;
    }
    const withoutTrailingSlashes = stripTrailingSlashes(trimmed);
    return stripVersionSuffix(withoutTrailingSlashes);
}
export function getOpenAiBaseUrl() {
    const raw = process.env.OPENAI_BASE_URL ?? DEFAULT_OPENAI_BASE_URL;
    return normalizeOpenAiBaseUrl(raw);
}
export function buildOpenAiUrl(path) {
    const normalizedPath = path.replace(/^\/+/, '');
    return `${getOpenAiBaseUrl()}/v1/${normalizedPath}`;
}
export function getOpenAiClientBaseUrl() {
    return `${getOpenAiBaseUrl()}/v1`;
}
export { DEFAULT_OPENAI_BASE_URL };
