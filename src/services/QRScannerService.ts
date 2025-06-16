
import QrScanner from 'qr-scanner';
import { qrScannerService } from './qrScannerService';
import { validateQRContent } from '@/utils/qrValidation';
import { toastService } from './toastService';

export interface ScanResult {
  success: boolean;
  code: string;
  ussdCode?: string;
  confidence: number;
  timestamp: number;
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
      
      // Check camera permission
      const hasCamera = await this.checkCameraSupport();
      if (!hasCamera) {
        throw new Error('No camera available');
      }

      // Create scanner with optimized settings for mobile
      this.scanner = new QrScanner(
        videoElement,
        (result) => this.handleScanResult(result.data),
        {
          returnDetailedScanResult: false,
          highlightScanRegion: true,
          highlightCodeOutline: true,
          preferredCamera: 'environment', // Rear camera for mobile
          maxScansPerSecond: 5, // Optimize for mobile performance
        }
      );

      // Set up error handling
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

    // Validate and process QR content
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
    this.provideFeedback();

    // Log to Supabase
    this.logScanToSupabase(result);

    // Notify callback
    this.onScanCallback(result);
  }

  private extractUSSDCode(qrData: string): string | undefined {
    // Extract USSD code for Rwanda MoMo format
    const ussdMatch = qrData.match(/\*182\*[0-9\*#]+/);
    return ussdMatch ? ussdMatch[0] : qrData;
  }

  private async logScanToSupabase(result: ScanResult): Promise<void> {
    try {
      await qrScannerService.logScan(result.code);
      console.log('QRScannerService: Scan logged to Supabase');
    } catch (error) {
      console.error('QRScannerService: Failed to log scan:', error);
    }
  }

  private provideFeedback(): void {
    // Vibration feedback
    if ('vibrate' in navigator) {
      navigator.vibrate([100, 50, 100]);
    }

    // Audio feedback
    this.playBeep();
  }

  private playBeep(): void {
    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);

      oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
      oscillator.type = 'sine';

      gainNode.gain.setValueAtTime(0, audioContext.currentTime);
      gainNode.gain.linearRampToValueAtTime(0.3, audioContext.currentTime + 0.01);
      gainNode.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + 0.3);

      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.3);
    } catch (error) {
      console.log('QRScannerService: Audio feedback failed:', error);
    }
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
}

export const qrScannerServiceNew = new QRScannerService();
