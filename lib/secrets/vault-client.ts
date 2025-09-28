export type VaultClientOptions = {
  baseUrl: string;
  token: string;
  mount?: string;
  requestTimeoutMs?: number;
};

export type VaultSecretPayload = Record<string, unknown>;

export class VaultClientError extends Error {
  constructor(message: string, readonly cause?: unknown) {
    super(message);
    this.name = 'VaultClientError';
  }
}

const DEFAULT_MOUNT = 'secret';
const DEFAULT_TIMEOUT_MS = 5000;

export class VaultClient {
  private readonly baseUrl: string;
  private readonly token: string;
  private readonly mount: string;
  private readonly requestTimeoutMs: number;

  constructor(options: VaultClientOptions) {
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

  async read(path: string): Promise<VaultSecretPayload> {
    const response = await this.fetchWithTimeout(this.buildDataUrl(path));

    if (!response.ok) {
      throw new VaultClientError(`Failed to read secret: [${response.status}] ${response.statusText}`);
    }

    const body = (await response.json()) as {
      data?: { data?: VaultSecretPayload };
    } | null;

    const payload = body?.data?.data;
    if (!payload || typeof payload !== 'object') {
      throw new VaultClientError('Vault response missing secret payload');
    }

    return payload;
  }

  async write(path: string, data: VaultSecretPayload): Promise<void> {
    const response = await this.fetchWithTimeout(this.buildDataUrl(path), {
      method: 'POST',
      body: JSON.stringify({ data }),
      headers: { 'Content-Type': 'application/json' },
    });

    if (!response.ok) {
      throw new VaultClientError(`Failed to write secret: [${response.status}] ${response.statusText}`);
    }
  }

  private buildDataUrl(path: string): string {
    const trimmedPath = path.replace(/^\/+/, '').replace(/\/+$/, '');
    return `${this.baseUrl}/v1/${this.mount}/data/${trimmedPath}`;
  }

  private async fetchWithTimeout(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
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
    } catch (error) {
      throw new VaultClientError('Vault request failed', error);
    } finally {
      clearTimeout(timeout as NodeJS.Timeout);
    }
  }
}
