import { supabase } from '@/integrations/supabase/client';
import { QRScannerCore } from './qr-scanner/QRScannerCore';
import { CameraService } from './CameraService';
import { EnhancedCameraService } from './EnhancedCameraService';
import { feedbackService } from './feedbackService';
import { mobileCameraOptimizer } from './MobileCameraOptimizer';
import { scanningManager } from './scanningManager';
import { validateQRContent } from '@/utils/qrValidation';

export interface QRScanConfig {
  enableAI: boolean;
  enableOptimization: boolean;
  enableHapticFeedback: boolean;
  autoTorchInDarkness: boolean;
  maxRetries: number;
}

export interface QRScanResult {
  success: boolean;
  code?: string;
  ussdCode?: string;
  telUri?: string;
  validation?: any;
  method: 'camera' | 'ai' | 'manual' | 'enhanced';
  confidence: number;
  processingTime: number;
  transactionId?: string;
}

export class QRScannerIntegration {
  private isInitialized = false;
  private videoElement: HTMLVideoElement | null = null;
  private config: QRScanConfig;
  private onScanCallback: ((result: QRScanResult) => void) | null = null;

  constructor(config: Partial<QRScanConfig> = {}) {
    this.config = {
      enableAI: true,
      enableOptimization: true,
      enableHapticFeedback: true,
      autoTorchInDarkness: true,
      maxRetries: 3,
      ...config
    };
  }

  async initialize(videoElement: HTMLVideoElement): Promise<boolean> {
    try {
      console.log('QRScannerIntegration: Initializing...');
      
      this.videoElement = videoElement;
      
      // Initialize mobile optimizations
      if (this.config.enableOptimization) {
        await mobileCameraOptimizer.optimizeForDevice();
      }

      // Initialize scanning manager
      await scanningManager.initializeScanner('qr-reader');
      
      this.isInitialized = true;
      console.log('QRScannerIntegration: Initialized successfully');
      return true;
    } catch (error) {
      console.error('QRScannerIntegration: Initialization failed:', error);
      return false;
    }
  }

  async startScanning(onScan: (result: QRScanResult) => void): Promise<boolean> {
    if (!this.isInitialized) {
      console.error('QRScannerIntegration: Not initialized');
      return false;
    }

    this.onScanCallback = onScan;

    try {
      // Start camera service
      const cameraStarted = await CameraService.startCamera({ current: this.videoElement });
      if (!cameraStarted) {
        throw new Error('Failed to start camera');
      }

      // Auto-detect lighting and enable torch if needed
      if (this.config.autoTorchInDarkness) {
        const lighting = await EnhancedCameraService.detectLightingCondition();
        if (lighting.shouldSuggestTorch) {
          await this.toggleTorch();
        }
      }

      // Start QR detection
      await scanningManager.startScanning(
        (result) => this.handleScanSuccess(result),
        (error) => this.handleScanError(error)
      );

      console.log('QRScannerIntegration: Scanning started');
      return true;
    } catch (error) {
      console.error('QRScannerIntegration: Failed to start scanning:', error);
      return false;
    }
  }

  async stopScanning(): Promise<void> {
    try {
      // Stop scanning manager
      await scanningManager.stop();
      
      // Stop camera
      CameraService.stopCamera({ current: this.videoElement });
      EnhancedCameraService.stopCamera();
      
      this.onScanCallback = null;
      console.log('QRScannerIntegration: Scanning stopped');
    } catch (error) {
      console.error('QRScannerIntegration: Error stopping scanner:', error);
    }
  }

  async toggleTorch(): Promise<boolean> {
    if (!this.videoElement) return false;
    
    try {
      const newState = await EnhancedCameraService.toggleTorch({ current: this.videoElement });
      console.log('QRScannerIntegration: Torch toggled:', newState);
      return newState;
    } catch (error) {
      console.error('QRScannerIntegration: Torch toggle failed:', error);
      return false;
    }
  }

  async hasTorchSupport(): Promise<boolean> {
    if (!this.videoElement) return false;
    return await EnhancedCameraService.checkTorchSupport({ current: this.videoElement });
  }

  private async handleScanSuccess(result: any): Promise<void> {
    if (!this.onScanCallback) return;

    const startTime = performance.now();
    
    try {
      console.log('QRScannerIntegration: Processing scan result:', result);

      // Validate QR content
      const validation = validateQRContent(result.code || '');
      
      // Process with backend
      const backendResult = await this.processWithBackend(result.code, result.method);
      
      // Provide feedback
      if (this.config.enableHapticFeedback) {
        feedbackService.successFeedback();
      }

      const finalResult: QRScanResult = {
        success: true,
        code: result.code,
        ussdCode: backendResult.data?.ussdCode || result.code,
        telUri: backendResult.data?.telUri,
        validation: validation,
        method: result.method || 'camera',
        confidence: result.confidence || 0.8,
        processingTime: performance.now() - startTime,
        transactionId: backendResult.transactionId
      };

      this.onScanCallback(finalResult);

    } catch (error) {
      console.error('QRScannerIntegration: Scan processing error:', error);
      this.handleScanError(error.message);
    }
  }

  private handleScanError(error: string): void {
    if (!this.onScanCallback) return;

    console.error('QRScannerIntegration: Scan error:', error);

    const errorResult: QRScanResult = {
      success: false,
      method: 'camera',
      confidence: 0,
      processingTime: 0
    };

    this.onScanCallback(errorResult);
  }

  private async processWithBackend(qrData: string, method: string): Promise<any> {
    try {
      const { data, error } = await supabase.functions.invoke('process-qr-scan', {
        body: {
          qrData,
          scannerPhone: '+250123456789', // Default or get from user session
          method,
          confidence: 0.8,
          lightingCondition: 'normal',
          torchUsed: EnhancedCameraService.getTorchState(),
          processingTime: 1000
        }
      });

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('QRScannerIntegration: Backend processing failed:', error);
      return {
        success: false,
        message: 'Backend processing failed',
        data: null
      };
    }
  }

  async captureFrame(): Promise<HTMLCanvasElement | null> {
    if (!this.videoElement) return null;
    return scanningManager.captureCurrentFrame(this.videoElement);
  }

  async enhancedScan(canvas: HTMLCanvasElement): Promise<any> {
    return await scanningManager.enhancedScan(canvas);
  }

  updateConfig(newConfig: Partial<QRScanConfig>): void {
    this.config = { ...this.config, ...newConfig };
    
    // Update scanning manager config
    scanningManager.updateConfig({
      enableAI: this.config.enableAI,
      enableOptimization: this.config.enableOptimization,
      retryCount: this.config.maxRetries,
      timeout: 30000,
      fallbackToManual: true,
      enableEnhancement: true
    });
  }

  getPerformanceStats(): any {
    return scanningManager.getPerformanceStats();
  }

  isActive(): boolean {
    return scanningManager.isActive();
  }
}

// Export singleton instance
export const qrScannerIntegration = new QRScannerIntegration();