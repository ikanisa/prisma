
import QrScanner from 'qr-scanner';
import { validateQRContent } from '@/utils/qrValidation';
import { toastService } from './toastService';
import { feedbackService } from './feedbackService';

export interface ScanResult {
  success: boolean;
  code: string;
  ussdCode?: string;
  confidence: number;
  timestamp: number;
}

export interface ScanTransaction {
  id: string;
  scanned_code: string;
  scanned_at: string;
  launched_ussd: boolean;
  payment_status: string;
  payer_number?: string;
  session_id: string;
}

export class QRScannerService {
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
      console.log('QRScannerService: Camera support:', hasCamera);
      return hasCamera;
    } catch (error) {
      console.error('QRScannerService: Camera check failed:', error);
      return false;
    }
  }

  async initialize(videoElement: HTMLVideoElement): Promise<boolean> {
    console.log('QRScannerService: Initializing scanner...');
    
    try {
      this.videoElement = videoElement;
      
      const hasCamera = await this.checkCameraSupport();
      if (!hasCamera) {
        throw new Error('No camera available');
      }

      // Correct QrScanner constructor - takes video element and callback function
      // The callback receives the result string directly
      this.scanner = new QrScanner(
        videoElement,
        (result) => this.handleScanResult(result)
      );

      // Set scanner options using the setters
      this.scanner.setGrayscaleWeights(0.299, 0.587, 0.114, true);
      
      console.log('QRScannerService: Scanner initialized successfully');
      return true;
    } catch (error) {
      console.error('QRScannerService: Initialization failed:', error);
      this.handleInitializationError(error);
      return false;
    }
  }

  async start(onScan: (result: ScanResult) => void): Promise<boolean> {
    if (!this.scanner || !this.videoElement) {
      console.error('QRScannerService: Scanner not initialized');
      return false;
    }

    this.onScanCallback = onScan;
    
    try {
      console.log('QRScannerService: Starting camera...');
      await this.scanner.start();
      this.isScanning = true;
      this.hasPermission = true;
      this.retryCount = 0;
      
      console.log('QRScannerService: Camera started successfully');
      return true;
    } catch (error) {
      console.error('QRScannerService: Failed to start camera:', error);
      this.handleCameraError(error);
      return false;
    }
  }

  private handleScanResult(qrData: string): void {
    if (!this.onScanCallback || !qrData) return;

    console.log('QRScannerService: QR code scanned:', qrData);

    const validation = validateQRContent(qrData);
    const ussdCode = this.extractUSSDCode(qrData);

    const result: ScanResult = {
      success: true,
      code: qrData,
      ussdCode,
      confidence: validation.confidence,
      timestamp: Date.now()
    };

    // Provide immediate feedback
    feedbackService.successFeedback();

    this.onScanCallback(result);
  }

  private extractUSSDCode(qrData: string): string | undefined {
    const ussdMatch = qrData.match(/\*182\*[0-9\*#]+/);
    return ussdMatch ? ussdMatch[0] : qrData;
  }

  private handleInitializationError(error: any): void {
    const errorMessage = this.getErrorMessage(error);
    toastService.error('Camera Error', errorMessage);
  }

  private handleCameraError(error: any): void {
    this.retryCount++;
    
    if (this.retryCount < this.maxRetries) {
      console.log(`QRScannerService: Retrying camera start (${this.retryCount}/${this.maxRetries})`);
      setTimeout(() => {
        if (this.onScanCallback) {
          this.start(this.onScanCallback);
        }
      }, 1000);
      return;
    }

    const errorMessage = this.getErrorMessage(error);
    toastService.error('Camera Access Failed', errorMessage);
  }

  private getErrorMessage(error: any): string {
    if (error.name === 'NotAllowedError') {
      return 'Camera permission denied. Please allow camera access in your browser settings.';
    } else if (error.name === 'NotFoundError') {
      return 'No camera found on this device.';
    } else if (error.name === 'NotSupportedError') {
      return 'Camera not supported on this device.';
    } else if (error.name === 'NotReadableError') {
      return 'Camera is being used by another application.';
    }
    return 'Unable to access camera. Please try again.';
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
      console.error('QRScannerService: Torch toggle failed:', error);
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
      console.log('QRScannerService: Stopping scanner...');
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

  // Phase 2: Enhanced Mobile Optimization methods
  createTelURI(ussdCode: string): string {
    // Clean and format USSD code for tel: URI
    const cleanCode = ussdCode.replace(/[^\d*#]/g, '');
    return `tel:${encodeURIComponent(cleanCode)}`;
  }

  async logScan(code: string): Promise<ScanTransaction | null> {
    try {
      // Mock implementation - in real app this would call an API
      const transaction: ScanTransaction = {
        id: `scan_${Date.now()}`,
        scanned_code: code,
        scanned_at: new Date().toISOString(),
        launched_ussd: false,
        payment_status: 'pending',
        session_id: `session_${Date.now()}`
      };
      
      console.log('QRScannerService: Logged scan transaction:', transaction);
      return transaction;
    } catch (error) {
      console.error('QRScannerService: Failed to log scan:', error);
      return null;
    }
  }

  async markUSSDLaunched(transactionId: string): Promise<boolean> {
    try {
      // Mock implementation - in real app this would update the transaction
      console.log('QRScannerService: Marked USSD launched for transaction:', transactionId);
      return true;
    } catch (error) {
      console.error('QRScannerService: Failed to mark USSD launched:', error);
      return false;
    }
  }

  async updateLightingData(transactionId: string, lightingCondition: string, torchUsed: boolean): Promise<boolean> {
    try {
      // Mock implementation - in real app this would update lighting analytics
      console.log('QRScannerService: Updated lighting data:', {
        transactionId,
        lightingCondition,
        torchUsed
      });
      return true;
    } catch (error) {
      console.error('QRScannerService: Failed to update lighting data:', error);
      return false;
    }
  }

  // Enhanced mobile camera features
  async optimizeForMobile(): Promise<void> {
    if (!this.scanner) return;

    try {
      // Set mobile-optimized preferences
      this.scanner.setGrayscaleWeights(0.299, 0.587, 0.114, true);
      
      // Additional mobile optimizations can be added here
      console.log('QRScannerService: Mobile optimizations applied');
    } catch (error) {
      console.error('QRScannerService: Mobile optimization failed:', error);
    }
  }

  async detectLightingCondition(): Promise<string> {
    // Simple lighting detection based on camera availability
    // In a real implementation, this could analyze video frames
    try {
      if (this.scanner && await this.scanner.hasFlash()) {
        return 'normal'; // Device has flash, assume normal lighting
      }
      return 'unknown';
    } catch {
      return 'unknown';
    }
  }
}

export const qrScannerServiceNew = new QRScannerService();
