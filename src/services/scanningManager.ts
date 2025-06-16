
import { Html5QrcodeScanner } from 'html5-qrcode';
import { aiQRProcessingService, QRProcessingResult } from './aiQRProcessingService';
import { validateQRContent } from '@/utils/qrValidation';
import { errorMonitoringService } from './errorMonitoringService';
import { withRetry } from '@/utils/retryMechanism';

export interface ScanningConfig {
  enableAI: boolean;
  enableEnhancement: boolean;
  retryCount: number;
  timeout: number;
  fallbackToManual: boolean;
}

export interface ScanResult {
  success: boolean;
  code?: string;
  method: 'camera' | 'ai' | 'manual' | 'enhanced';
  confidence: number;
  processingTime: number;
  validation?: any;
}

class ScanningManager {
  private scanner: Html5QrcodeScanner | null = null;
  private lastCapturedFrame: HTMLCanvasElement | null = null;
  private config: ScanningConfig;
  private isScanning = false;

  constructor(config: Partial<ScanningConfig> = {}) {
    this.config = {
      enableAI: true,
      enableEnhancement: true,
      retryCount: 3,
      timeout: 30000,
      fallbackToManual: true,
      ...config
    };
  }

  async initializeScanner(elementId: string): Promise<void> {
    try {
      const config = {
        fps: 10,
        qrbox: { width: 280, height: 280 },
        aspectRatio: 1.0,
        experimentalFeatures: {
          useBarCodeDetectorIfSupported: true
        }
      };

      this.scanner = new Html5QrcodeScanner(elementId, config, false);
      this.isScanning = true;
    } catch (error) {
      errorMonitoringService.logError(error as Error, 'scanner_initialization');
      throw error;
    }
  }

  async startScanning(
    onSuccess: (result: ScanResult) => void,
    onError: (error: string) => void
  ): Promise<void> {
    if (!this.scanner) {
      throw new Error('Scanner not initialized');
    }

    const startTime = Date.now();

    this.scanner.render(
      async (decodedText) => {
        const result = await this.processScannedCode(decodedText, startTime);
        onSuccess(result);
      },
      (errorMessage) => {
        // Only handle significant errors, not routine "no QR found" messages
        if (!errorMessage.includes('No QR code found') && !errorMessage.includes('NotFoundException')) {
          onError(errorMessage);
        }
      }
    );
  }

  private async processScannedCode(decodedText: string, startTime: number): Promise<ScanResult> {
    const processingTime = Date.now() - startTime;
    
    // First, try standard validation
    const validation = validateQRContent(decodedText);
    
    if (validation.isValid && validation.confidence > 0.8) {
      return {
        success: true,
        code: decodedText,
        method: 'camera',
        confidence: validation.confidence,
        processingTime,
        validation
      };
    }

    // If standard validation failed but AI is enabled, try AI processing
    if (this.config.enableAI && this.lastCapturedFrame) {
      try {
        const aiResult = await aiQRProcessingService.processQRWithAI(this.lastCapturedFrame);
        
        if (aiResult.success && aiResult.ussdCode) {
          const aiValidation = validateQRContent(aiResult.ussdCode);
          
          return {
            success: true,
            code: aiResult.ussdCode,
            method: 'ai',
            confidence: aiResult.confidence || 0.7,
            processingTime: processingTime + aiResult.processingTime,
            validation: aiValidation
          };
        }
      } catch (error) {
        console.log('AI processing failed, using original result');
      }
    }

    // Return original result even if confidence is lower
    return {
      success: validation.isValid,
      code: decodedText,
      method: 'camera',
      confidence: validation.confidence,
      processingTime,
      validation
    };
  }

  captureCurrentFrame(videoElement: HTMLVideoElement): HTMLCanvasElement | null {
    try {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      
      if (!ctx || !videoElement.videoWidth || !videoElement.videoHeight) {
        return null;
      }

      canvas.width = videoElement.videoWidth;
      canvas.height = videoElement.videoHeight;
      ctx.drawImage(videoElement, 0, 0);
      
      this.lastCapturedFrame = canvas;
      return canvas;
    } catch (error) {
      errorMonitoringService.logError(error as Error, 'frame_capture');
      return null;
    }
  }

  async enhancedScan(canvas: HTMLCanvasElement): Promise<QRProcessingResult> {
    if (!this.config.enableAI) {
      throw new Error('AI processing is disabled');
    }

    return await withRetry(
      () => aiQRProcessingService.processQRWithAI(canvas),
      { maxAttempts: this.config.retryCount, delay: 1000 }
    );
  }

  getLastCapturedFrame(): HTMLCanvasElement | null {
    return this.lastCapturedFrame;
  }

  updateConfig(newConfig: Partial<ScanningConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }

  async stop(): Promise<void> {
    if (this.scanner) {
      try {
        await this.scanner.clear();
        this.scanner = null;
        this.isScanning = false;
      } catch (error) {
        console.log('Error stopping scanner:', error);
      }
    }
  }

  isActive(): boolean {
    return this.isScanning;
  }
}

export const scanningManager = new ScanningManager();
