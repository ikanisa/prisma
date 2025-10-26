export declare const DEFAULT_BEFORE_ASKING_SEQUENCE: readonly string[];
export declare const DEFAULT_ROLE_HIERARCHY: readonly string[];
export declare const AUTONOMY_LEVELS: readonly ["L0", "L1", "L2", "L3"];
export type AutonomyLevel = (typeof AUTONOMY_LEVELS)[number];
export declare const AUTONOMY_LEVEL_ORDER: Record<AutonomyLevel, number>;
export declare const DEFAULT_AUTONOMY_LEVEL: "L2";
export declare const DEFAULT_AUTONOMY_LABELS: Record<AutonomyLevel, string>;
export declare const DEFAULT_AUTOPILOT_ALLOWANCES: Record<AutonomyLevel, readonly string[]>;
export declare const cloneDefaultAutopilotAllowances: () => Record<AutonomyLevel, string[]>;
export interface TraceExporterConfig {
    name: string;
    protocol: string;
    endpoint?: string;
    endpointEnv?: string;
    headers: Record<string, string>;
    headersEnv?: string;
}
export interface ResolvedTraceExporter extends TraceExporterConfig {
    resolvedEndpoint: string | null;
    resolvedHeaders: Record<string, string>;
}
export interface TelemetryConfig {
    namespace: string;
    defaultService: string;
    defaultEnvironmentEnv?: string;
    traces: TraceExporterConfig[];
}
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
export declare function getTelemetryConfig(): Promise<TelemetryConfig>;
export declare function resolveTraceExporter(exporter: TraceExporterConfig): ResolvedTraceExporter;
export {};
//# sourceMappingURL=index.d.ts.map