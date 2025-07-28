export interface ScanResult {
  success: boolean;
  code: string;
  ussdCode?: string;
  confidence: number;
  timestamp: number;
}

export class QRScannerCore {
  private isScanning = false;

  async initialize(videoElement: HTMLVideoElement): Promise<boolean> {
    console.log('QRScannerCore: Initializing...');
    return true;
  }

  async start(onScan: (result: ScanResult) => void): Promise<boolean> {
    this.isScanning = true;
    return true;
  }

  async toggleTorch(): Promise<boolean> {
    return false;
  }

  async hasTorch(): Promise<boolean> {
    return false;
  }

  stop(): void {
    this.isScanning = false;
  }

  isActive(): boolean {
    return this.isScanning;
  }

  hasPermissions(): boolean {
    return true;
  }

  async optimizeForMobile(): Promise<void> {
    // Implementation
  }

  async detectLightingCondition(): Promise<string> {
    return 'normal';
  }
}