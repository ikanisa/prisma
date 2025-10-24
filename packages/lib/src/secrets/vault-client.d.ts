export type VaultClientOptions = {
    baseUrl: string;
    token: string;
    mount?: string;
    requestTimeoutMs?: number;
};
export type VaultSecretPayload = Record<string, unknown>;
export declare class VaultClientError extends Error {
    readonly cause?: unknown | undefined;
    constructor(message: string, cause?: unknown | undefined);
}
export declare class VaultClient {
    private readonly baseUrl;
    private readonly token;
    private readonly mount;
    private readonly requestTimeoutMs;
    constructor(options: VaultClientOptions);
    read(path: string): Promise<VaultSecretPayload>;
    write(path: string, data: VaultSecretPayload): Promise<void>;
    private buildDataUrl;
    private fetchWithTimeout;
}
//# sourceMappingURL=vault-client.d.ts.map