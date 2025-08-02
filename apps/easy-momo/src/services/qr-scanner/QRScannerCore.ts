
import QrScanner from 'qr-scanner';
import { validateQRContent } from '@/utils/qrValidation';
import { feedbackService } from '../feedbackService';
import { ScanResult } from './types';

export class QRScannerCore {
  private scanner: QrScanner | null = null;
  private videoElement: HTMLVideoElement | null = null;
  private isScanning = false;
  private hasPermission = false;
  private onScanCallback: ((result: ScanResult) => void) | null = null;
  private retryCount = 0;
  private maxRetries = 3;

  constructor() {
    this.checkCameraSupport();
  }

  private async checkCameraSupport(): Promise<boolean> {
    try {
      const hasCamera = await QrScanner.hasCamera();
      console.log('QRScannerCore: Camera support:', hasCamera);
      return hasCamera;
    } catch (error) {
      console.error('QRScannerCore: Camera check failed:', error);
      return false;
    }
  }

  async initialize(videoElement: HTMLVideoElement): Promise<boolean> {
    console.log('QRScannerCore: Initializing scanner...');
    
    try {
      this.videoElement = videoElement;
      
      const hasCamera = await this.checkCameraSupport();
      if (!hasCamera) {
        throw new Error('No camera available');
      }

      this.scanner = new QrScanner(
        videoElement,
        (result) => this.handleScanResult(result)
      );

      this.scanner.setGrayscaleWeights(0.299, 0.587, 0.114, true);
      
      console.log('QRScannerCore: Scanner initialized successfully');
      return true;
    } catch (error) {
      console.error('QRScannerCore: Initialization failed:', error);
      return false;
    }
  }

  async start(onScan: (result: ScanResult) => void): Promise<boolean> {
    if (!this.scanner || !this.videoElement) {
      console.error('QRScannerCore: Scanner not initialized');
      return false;
    }

    this.onScanCallback = onScan;
    
    try {
      console.log('QRScannerCore: Starting camera...');
      await this.scanner.start();
      this.isScanning = true;
      this.hasPermission = true;
      this.retryCount = 0;
      
      console.log('QRScannerCore: Camera started successfully');
      return true;
    } catch (error) {
      console.error('QRScannerCore: Failed to start camera:', error);
      this.handleCameraError(error);
      return false;
    }
  }

  private handleScanResult(qrData: string): void {
    if (!this.onScanCallback || !qrData) return;

    console.log('QRScannerCore: QR code scanned:', qrData);

    const validation = validateQRContent(qrData);
    const ussdCode = this.extractUSSDCode(qrData);

    const result: ScanResult = {
      success: true,
      code: qrData,
      ussdCode,
      confidence: validation.confidence,
      timestamp: Date.now()
    };

    feedbackService.successFeedback();
    this.onScanCallback(result);
  }

  private extractUSSDCode(qrData: string): string | undefined {
    const ussdMatch = qrData.match(/\*182\*[0-9\*#]+/);
    return ussdMatch ? ussdMatch[0] : qrData;
  }

  private handleCameraError(error: any): void {
    this.retryCount++;
    
    if (this.retryCount < this.maxRetries) {
      console.log(`QRScannerCore: Retrying camera start (${this.retryCount}/${this.maxRetries})`);
      setTimeout(() => {
        if (this.onScanCallback) {
          this.start(this.onScanCallback);
        }
      }, 1000);
    }
  }

  async toggleTorch(): Promise<boolean> {
    if (!this.scanner) return false;

    try {
      const hasTorch = await this.scanner.hasFlash();
      if (hasTorch) {
        const isFlashOn = await this.scanner.isFlashOn();
        if (isFlashOn) {
          await this.scanner.turnFlashOff();
        } else {
          await this.scanner.turnFlashOn();
        }
        return !isFlashOn;
      }
      return false;
    } catch (error) {
      console.error('QRScannerCore: Torch toggle failed:', error);
      return false;
    }
  }

  async hasTorch(): Promise<boolean> {
    if (!this.scanner) return false;
    try {
      return await this.scanner.hasFlash();
    } catch {
      return false;
    }
  }

  stop(): void {
    if (this.scanner) {
      console.log('QRScannerCore: Stopping scanner...');
      this.scanner.stop();
      this.scanner.destroy();
      this.scanner = null;
    }
    
    this.isScanning = false;
    this.onScanCallback = null;
    this.videoElement = null;
    this.retryCount = 0;
  }

  isActive(): boolean {
    return this.isScanning;
  }

  hasPermissions(): boolean {
    return this.hasPermission;
  }

  async optimizeForMobile(): Promise<void> {
    if (!this.scanner) return;

    try {
      this.scanner.setGrayscaleWeights(0.299, 0.587, 0.114, true);
      console.log('QRScannerCore: Mobile optimizations applied');
    } catch (error) {
      console.error('QRScannerCore: Mobile optimization failed:', error);
    }
  }

  async detectLightingCondition(): Promise<string> {
    try {
      if (this.scanner && await this.scanner.hasFlash()) {
        return 'normal';
      }
      return 'unknown';
    } catch {
      return 'unknown';
    }
  }
}
