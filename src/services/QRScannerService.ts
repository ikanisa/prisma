
import { QRScannerCore } from './qr-scanner/QRScannerCore';
import { QRScannerTransaction } from './qr-scanner/QRScannerTransaction';
import { QRScannerErrorHandler } from './qr-scanner/QRScannerErrorHandler';
import { QRScannerUtils } from './qr-scanner/QRScannerUtils';

export type { ScanResult, ScanTransaction } from './qr-scanner/types';

export class QRScannerService {
  private core: QRScannerCore;
  private transaction: QRScannerTransaction;
  private errorHandler: QRScannerErrorHandler;
  private utils: QRScannerUtils;

  constructor() {
    this.core = new QRScannerCore();
    this.transaction = new QRScannerTransaction();
    this.errorHandler = new QRScannerErrorHandler();
    this.utils = new QRScannerUtils();
  }

  async initialize(videoElement: HTMLVideoElement): Promise<boolean> {
    return this.core.initialize(videoElement);
  }

  async start(onScan: (result: any) => void): Promise<boolean> {
    return this.core.start(onScan);
  }

  async toggleTorch(): Promise<boolean> {
    return this.core.toggleTorch();
  }

  async hasTorch(): Promise<boolean> {
    return this.core.hasTorch();
  }

  stop(): void {
    this.core.stop();
  }

  isActive(): boolean {
    return this.core.isActive();
  }

  hasPermissions(): boolean {
    return this.core.hasPermissions();
  }

  createTelURI(ussdCode: string): string {
    return this.utils.createTelURI(ussdCode);
  }

  async logScan(code: string) {
    return this.transaction.logScan(code);
  }

  async markUSSDLaunched(transactionId: string): Promise<boolean> {
    return this.transaction.markUSSDLaunched(transactionId);
  }

  async updateLightingData(transactionId: string, lightingCondition: string, torchUsed: boolean): Promise<boolean> {
    return this.transaction.updateLightingData(transactionId, lightingCondition, torchUsed);
  }

  async optimizeForMobile(): Promise<void> {
    return this.core.optimizeForMobile();
  }

  async detectLightingCondition(): Promise<string> {
    return this.core.detectLightingCondition();
  }
}

export const qrScannerServiceNew = new QRScannerService();
