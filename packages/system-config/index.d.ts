export interface RawSystemConfig {
  data_sources?: Record<string, unknown>;
  datasources?: Record<string, unknown>;
  knowledge?: Record<string, unknown>;
  rag?: Record<string, unknown>;
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

export declare const DEFAULT_BEFORE_ASKING_SEQUENCE: readonly string[];
export declare const DEFAULT_ROLE_HIERARCHY: readonly string[];

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

export declare function loadSystemConfig(): Promise<RawSystemConfig>;
export declare function getGoogleDriveSettings(): Promise<GoogleDriveSettings>;
export declare function getUrlSourceSettings(): Promise<UrlSourceSettings>;
export declare function getBeforeAskingSequence(): Promise<string[]>;
export declare function clearSystemConfigCache(): void;
export declare function getResolvedConfigPath(): Promise<string>;
export declare function getRoleHierarchy(): Promise<string[]>;
export declare function getTelemetryConfig(): Promise<TelemetryConfig>;
export declare function resolveTraceExporter(exporter: TraceExporterConfig): ResolvedTraceExporter;
