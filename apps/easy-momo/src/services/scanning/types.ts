
export interface ScanningConfig {
  enableAI: boolean;
  enableEnhancement: boolean;
  retryCount: number;
  timeout: number;
  fallbackToManual: boolean;
  enableOptimization: boolean;
}

export interface ScanResult {
  success: boolean;
  code?: string;
  method: 'camera' | 'ai' | 'manual' | 'enhanced';
  confidence: number;
  processingTime: number;
  validation?: any;
  fromCache?: boolean;
}

export const DEFAULT_SCANNING_CONFIG: ScanningConfig = {
  enableAI: true,
  enableEnhancement: true,
  retryCount: 3,
  timeout: 30000,
  fallbackToManual: true,
  enableOptimization: true
};
