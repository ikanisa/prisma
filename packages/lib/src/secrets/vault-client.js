export class VaultClientError extends Error {
    constructor(message, cause) {
        super(message);
        this.cause = cause;
        this.name = 'VaultClientError';
    }
}
const DEFAULT_MOUNT = 'secret';
const DEFAULT_TIMEOUT_MS = 5000;
export class VaultClient {
    constructor(options) {
        if (!options.baseUrl) {
            throw new VaultClientError('Vault baseUrl is required');
        }
        if (!options.token) {
            throw new VaultClientError('Vault token is required');
        }
        this.baseUrl = options.baseUrl.replace(/\/$/, '');
        this.token = options.token;
        this.mount = options.mount?.replace(/\/$/, '') ?? DEFAULT_MOUNT;
        this.requestTimeoutMs = options.requestTimeoutMs ?? DEFAULT_TIMEOUT_MS;
    }
    async read(path) {
        const response = await this.fetchWithTimeout(this.buildDataUrl(path));
        if (!response.ok) {
            throw new VaultClientError(`Failed to read secret: [${response.status}] ${response.statusText}`);
        }
        const body = (await response.json());
        const payload = body?.data?.data;
        if (!payload || typeof payload !== 'object') {
            throw new VaultClientError('Vault response missing secret payload');
        }
        return payload;
    }
    async write(path, data) {
        const response = await this.fetchWithTimeout(this.buildDataUrl(path), {
            method: 'POST',
            body: JSON.stringify({ data }),
            headers: { 'Content-Type': 'application/json' },
        });
        if (!response.ok) {
            throw new VaultClientError(`Failed to write secret: [${response.status}] ${response.statusText}`);
        }
    }
    buildDataUrl(path) {
        const trimmedPath = path.replace(/^\/+/, '').replace(/\/+$/, '');
        return `${this.baseUrl}/v1/${this.mount}/data/${trimmedPath}`;
    }
    async fetchWithTimeout(input, init) {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), this.requestTimeoutMs);
        if (typeof timeout !== 'number' && typeof timeout !== 'undefined') {
            // Node returns Timeout object with unref(); browsers return number.
            if ('unref' in timeout && typeof timeout.unref === 'function') {
                timeout.unref();
            }
        }
        try {
            const response = await fetch(input, {
                ...init,
                headers: {
                    ...init?.headers,
                    'X-Vault-Token': this.token,
                },
                signal: controller.signal,
            });
            return response;
        }
        catch (error) {
            throw new VaultClientError('Vault request failed', error);
        }
        finally {
            clearTimeout(timeout);
        }
    }
}
