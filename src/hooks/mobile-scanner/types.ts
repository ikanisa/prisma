
export interface MobileQRScannerState {
  isScanning: boolean;
  isLoading: boolean;
  hasError: boolean;
  errorMessage: string;
  scannedResult: ScanResult | null;
  hasTorch: boolean;
  isTorchOn: boolean;
  showManualInput: boolean;
  isOptimizedForMobile: boolean;
  lightingCondition: string;
}

export interface ScanResult {
  success: boolean;
  code: string;
  ussdCode?: string;
  confidence: number;
  timestamp: number;
}
