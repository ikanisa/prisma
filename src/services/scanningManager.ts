
import { Html5QrcodeScanner } from 'html5-qrcode';
import { aiQRProcessingService, QRProcessingResult } from './aiQRProcessingService';
import { validateQRContent } from '@/utils/qrValidation';
import { errorMonitoringService } from './errorMonitoringService';
import { performanceMonitoringService } from './performanceMonitoringService';
import { scannerOptimizer } from './scannerOptimizer';
import { withRetry } from '@/utils/retryMechanism';

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

class ScanningManager {
  private scanner: Html5QrcodeScanner | null = null;
  private lastCapturedFrame: HTMLCanvasElement | null = null;
  private config: ScanningConfig;
  private isScanning = false;
  private scanStartTime = 0;

  constructor(config: Partial<ScanningConfig> = {}) {
    this.config = {
      enableAI: true,
      enableEnhancement: true,
      retryCount: 3,
      timeout: 30000,
      fallbackToManual: true,
      enableOptimization: true,
      ...config
    };
  }

  async initializeScanner(elementId: string): Promise<void> {
    const initStartTime = performance.now();
    
    try {
      const config = {
        fps: this.config.enableOptimization ? 8 : 10, // Optimize FPS based on performance
        qrbox: { width: 280, height: 280 },
        aspectRatio: 1.0,
        experimentalFeatures: {
          useBarCodeDetectorIfSupported: true
        }
      };

      this.scanner = new Html5QrcodeScanner(elementId, config, false);
      this.isScanning = true;
      
      const initTime = performance.now() - initStartTime;
      performanceMonitoringService.trackMetric('scanner_init_time', initTime);
      
    } catch (error) {
      const initTime = performance.now() - initStartTime;
      performanceMonitoringService.trackMetric('scanner_init_error_time', initTime);
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

    this.scanStartTime = performance.now();
    performanceMonitoringService.trackUserInteraction('scan_start', 'scanner');

    this.scanner.render(
      async (decodedText) => {
        const result = await this.processScannedCode(decodedText);
        onSuccess(result);
      },
      (errorMessage) => {
        // Only handle significant errors, not routine "no QR found" messages
        if (!errorMessage.includes('No QR code found') && !errorMessage.includes('NotFoundException')) {
          performanceMonitoringService.trackScanFailure('scanner_error', 'camera');
          onError(errorMessage);
        }
      }
    );
  }

  private async processScannedCode(decodedText: string): Promise<ScanResult> {
    const processingStartTime = performance.now();
    
    try {
      // Check cache first if optimization is enabled
      if (this.config.enableOptimization) {
        const cached = scannerOptimizer.getCachedResult(decodedText);
        if (cached) {
          const processingTime = performance.now() - processingStartTime;
          performanceMonitoringService.trackScanSuccess(processingTime, 'camera_cached', cached.confidence);
          
          return {
            ...cached,
            fromCache: true,
            processingTime
          };
        }
      }

      // First, try standard validation
      const validation = validateQRContent(decodedText);
      const processingTime = performance.now() - processingStartTime;
      
      // Track processing time for optimization
      if (this.config.enableOptimization) {
        scannerOptimizer.trackProcessingTime(processingTime);
      }

      let result: ScanResult;

      if (validation.isValid && validation.confidence > 0.8) {
        result = {
          success: true,
          code: decodedText,
          method: 'camera',
          confidence: validation.confidence,
          processingTime,
          validation
        };
        
        performanceMonitoringService.trackScanSuccess(processingTime, 'camera', validation.confidence);
      } else {
        // If standard validation failed but AI is enabled, try AI processing
        if (this.config.enableAI && this.lastCapturedFrame) {
          try {
            const aiResult = await aiQRProcessingService.processQRWithAI(this.lastCapturedFrame);
            
            if (aiResult.success && aiResult.ussdCode) {
              const aiValidation = validateQRContent(aiResult.ussdCode);
              const totalProcessingTime = processingTime + aiResult.processingTime;
              
              result = {
                success: true,
                code: aiResult.ussdCode,
                method: 'ai',
                confidence: aiResult.confidence || 0.7,
                processingTime: totalProcessingTime,
                validation: aiValidation
              };
              
              performanceMonitoringService.trackScanSuccess(totalProcessingTime, 'ai', aiResult.confidence || 0.7);
            } else {
              result = {
                success: validation.isValid,
                code: decodedText,
                method: 'camera',
                confidence: validation.confidence,
                processingTime,
                validation
              };
              
              if (validation.isValid) {
                performanceMonitoringService.trackScanSuccess(processingTime, 'camera', validation.confidence);
              } else {
                performanceMonitoringService.trackScanFailure('low_confidence', 'camera');
              }
            }
          } catch (error) {
            console.log('AI processing failed, using original result');
            result = {
              success: validation.isValid,
              code: decodedText,
              method: 'camera',
              confidence: validation.confidence,
              processingTime,
              validation
            };
            
            performanceMonitoringService.trackScanFailure('ai_processing_failed', 'camera');
          }
        } else {
          result = {
            success: validation.isValid,
            code: decodedText,
            method: 'camera',
            confidence: validation.confidence,
            processingTime,
            validation
          };
          
          if (validation.isValid) {
            performanceMonitoringService.trackScanSuccess(processingTime, 'camera', validation.confidence);
          } else {
            performanceMonitoringService.trackScanFailure('validation_failed', 'camera');
          }
        }
      }

      // Cache the result if optimization is enabled
      if (this.config.enableOptimization && result.success) {
        scannerOptimizer.cacheResult(decodedText, result);
      }

      return result;

    } catch (error) {
      const processingTime = performance.now() - processingStartTime;
      errorMonitoringService.logError(error as Error, 'scan_processing');
      performanceMonitoringService.trackScanFailure('processing_error', 'camera');
      
      return {
        success: false,
        method: 'camera',
        confidence: 0,
        processingTime
      };
    }
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
      
      // Optimize image if optimization is enabled
      if (this.config.enableOptimization) {
        this.lastCapturedFrame = scannerOptimizer.optimizeImageForProcessing(canvas);
      } else {
        this.lastCapturedFrame = canvas;
      }
      
      return this.lastCapturedFrame;
    } catch (error) {
      errorMonitoringService.logError(error as Error, 'frame_capture');
      return null;
    }
  }

  async enhancedScan(canvas: HTMLCanvasElement): Promise<QRProcessingResult> {
    if (!this.config.enableAI) {
      throw new Error('AI processing is disabled');
    }

    const enhancedStartTime = performance.now();
    performanceMonitoringService.trackUserInteraction('enhanced_scan_start', 'scanner');

    try {
      // Check if we should process this frame (optimization)
      if (this.config.enableOptimization && !scannerOptimizer.shouldProcessFrame()) {
        throw new Error('Frame skipped for optimization');
      }

      // Optimize image before processing
      const optimizedCanvas = this.config.enableOptimization 
        ? scannerOptimizer.optimizeImageForProcessing(canvas)
        : canvas;

      // Check cache for this image
      if (this.config.enableOptimization) {
        const imageHash = scannerOptimizer.generateImageHash(optimizedCanvas);
        const cached = scannerOptimizer.getCachedResult(`enhanced_${imageHash}`);
        if (cached) {
          return { ...cached, processingTime: performance.now() - enhancedStartTime };
        }
      }

      const result = await withRetry(
        () => aiQRProcessingService.processQRWithAI(optimizedCanvas),
        { maxAttempts: this.config.retryCount, delay: 1000 }
      );

      const totalTime = performance.now() - enhancedStartTime;
      result.processingTime = totalTime;

      // Cache result if successful
      if (this.config.enableOptimization && result.success) {
        const imageHash = scannerOptimizer.generateImageHash(optimizedCanvas);
        scannerOptimizer.cacheResult(`enhanced_${imageHash}`, result);
      }

      if (result.success) {
        performanceMonitoringService.trackScanSuccess(totalTime, 'enhanced', result.confidence || 0.8);
      } else {
        performanceMonitoringService.trackScanFailure('enhanced_failed', 'enhanced');
      }

      return result;

    } catch (error) {
      const totalTime = performance.now() - enhancedStartTime;
      performanceMonitoringService.trackScanFailure('enhanced_error', 'enhanced');
      throw error;
    }
  }

  getLastCapturedFrame(): HTMLCanvasElement | null {
    return this.lastCapturedFrame;
  }

  updateConfig(newConfig: Partial<ScanningConfig>): void {
    this.config = { ...this.config, ...newConfig };
    performanceMonitoringService.trackUserInteraction('config_update', 'scanner', newConfig);
  }

  async stop(): Promise<void> {
    const stopStartTime = performance.now();
    
    if (this.scanner) {
      try {
        await this.scanner.clear();
        this.scanner = null;
        this.isScanning = false;
        
        const stopTime = performance.now() - stopStartTime;
        performanceMonitoringService.trackMetric('scanner_stop_time', stopTime);
        
        // Flush performance metrics
        performanceMonitoringService.flushMetrics();
        
      } catch (error) {
        console.log('Error stopping scanner:', error);
        errorMonitoringService.logError(error as Error, 'scanner_stop');
      }
    }
  }

  isActive(): boolean {
    return this.isScanning;
  }

  getPerformanceStats(): any {
    return {
      scanningManager: {
        isActive: this.isActive(),
        config: this.config
      },
      optimizer: scannerOptimizer.getOptimizationStats(),
      performance: performanceMonitoringService.getScanningStats()
    };
  }
}

export const scanningManager = new ScanningManager();
