export interface RawSystemConfig {
  data_sources?: Record<string, unknown>;
  knowledge?: Record<string, unknown>;
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

export declare function loadSystemConfig(): Promise<RawSystemConfig>;
export declare function getGoogleDriveSettings(): Promise<GoogleDriveSettings>;
export declare function getUrlSourceSettings(): Promise<UrlSourceSettings>;
export declare function getBeforeAskingSequence(): Promise<string[]>;
export declare function clearSystemConfigCache(): void;
export declare function getResolvedConfigPath(): Promise<string>;
export declare function getRoleHierarchy(): Promise<string[]>;
