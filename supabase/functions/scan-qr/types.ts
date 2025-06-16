
export interface UssdPattern {
  name: string;
  country: string;
  provider: string;
  pattern: RegExp;
}

export interface ValidationResult {
  isValid: boolean;
  country: string | null;
  provider: string | null;
  patternType: string | null;
  confidence: number;
  sanitized: string;
}

export interface QRScanRequest {
  qrImage: string;
  sessionId?: string;
  enhanceImage?: boolean;
  aiProcessing?: boolean;
}

export interface QRScanResponse {
  success: boolean;
  ussdString?: string;
  ussdCode?: string;
  parsedReceiver?: string;
  parsedAmount?: number;
  confidence?: number;
  processingTime?: number;
  method?: string;
  validation?: {
    isValid: boolean;
    country: string;
    provider: string;
    patternType: string;
  };
  error?: string;
  code?: string;
  message?: string;
}
