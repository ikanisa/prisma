export declare const DEFAULT_BEFORE_ASKING_SEQUENCE: readonly string[];
export declare const DEFAULT_ROLE_HIERARCHY: readonly string[];
export interface RawSystemConfig {
    data_sources?: Record<string, unknown>;
    datasources?: Record<string, unknown>;
    knowledge?: Record<string, unknown>;
    rag?: Record<string, unknown>;
    rbac?: Record<string, unknown>;
    [key: string]: unknown;
}
export interface GoogleDriveSettings {
    enabled: boolean;
    oauthScopes: string[];
    folderMappingPattern: string;
    mirrorToStorage: boolean;
}
export interface UrlSourceSettings {
    allowedDomains: string[];
    fetchPolicy: {
        obeyRobots: boolean;
        maxDepth: number;
        cacheTtlMinutes: number;
    };
}
type ReadFile = (resolvedPath: string) => Promise<string>;
export interface SystemConfigAccessorOptions<TConfig extends RawSystemConfig = RawSystemConfig> {
    cacheTtlMs?: number;
    readFile?: ReadFile;
    resolvePath?: () => Promise<string>;
    transform?: (config: RawSystemConfig) => TConfig;
}
export interface SystemConfigAccessor<TConfig> {
    load(): Promise<TConfig>;
    /** Returns the cached value if present without triggering I/O. */
    snapshot(): TConfig | undefined;
    invalidate(): void;
    getPath(): Promise<string>;
    withConfig<TResult>(selector: (config: TConfig) => TResult | Promise<TResult>): Promise<TResult>;
    refresh(): Promise<TConfig>;
}
export declare function createSystemConfigAccessor<TConfig extends RawSystemConfig = RawSystemConfig>(options?: SystemConfigAccessorOptions<TConfig>): SystemConfigAccessor<TConfig>;
export declare function loadSystemConfig<TConfig extends RawSystemConfig = RawSystemConfig>(): Promise<TConfig>;
export declare function getCachedSystemConfig<TConfig extends RawSystemConfig = RawSystemConfig>(): TConfig | undefined;
export declare function clearSystemConfigCache(): void;
export declare function invalidateSystemConfigCache(): void;
export declare function getResolvedConfigPath(): Promise<string>;
export declare function refreshSystemConfig<TConfig extends RawSystemConfig = RawSystemConfig>(): Promise<TConfig>;
export declare function getGoogleDriveSettings(): Promise<GoogleDriveSettings>;
export declare function getUrlSourceSettings(): Promise<UrlSourceSettings>;
export declare function getBeforeAskingSequence(): Promise<string[]>;
export declare function getRoleHierarchy(configOverride?: RawSystemConfig): Promise<string[]>;
export {};
//# sourceMappingURL=index.d.ts.map