
import { aiQRProcessingService } from '../aiQRProcessingService';
import { validateQRContent } from '@/utils/qrValidation';
import { errorMonitoringService } from '../errorMonitoringService';
import { performanceMonitoringService } from '../performanceMonitoringService';
import { scannerOptimizer } from '../scannerOptimizer';
import { ScanningConfig, ScanResult } from './types';

export class ScanProcessor {
  private config: ScanningConfig;
  private lastCapturedFrame: HTMLCanvasElement | null = null;

  constructor(config: ScanningConfig, lastCapturedFrame: HTMLCanvasElement | null = null) {
    this.config = config;
    this.lastCapturedFrame = lastCapturedFrame;
  }

  setLastCapturedFrame(frame: HTMLCanvasElement | null): void {
    this.lastCapturedFrame = frame;
  }

  async processScannedCode(decodedText: string): Promise<ScanResult> {
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
              result = this.createCameraResult(decodedText, validation, processingTime);
            }
          } catch (error) {
            console.log('AI processing failed, using original result');
            result = this.createCameraResult(decodedText, validation, processingTime);
            performanceMonitoringService.trackScanFailure('ai_processing_failed', 'camera');
          }
        } else {
          result = this.createCameraResult(decodedText, validation, processingTime);
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

  private createCameraResult(decodedText: string, validation: any, processingTime: number): ScanResult {
    const result = {
      success: validation.isValid,
      code: decodedText,
      method: 'camera' as const,
      confidence: validation.confidence,
      processingTime,
      validation
    };
    
    if (validation.isValid) {
      performanceMonitoringService.trackScanSuccess(processingTime, 'camera', validation.confidence);
    } else {
      performanceMonitoringService.trackScanFailure('validation_failed', 'camera');
    }
    
    return result;
  }

  updateConfig(newConfig: Partial<ScanningConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }
}
