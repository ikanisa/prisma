
import { aiQRProcessingService, QRProcessingResult } from '../aiQRProcessingService';
import { performanceMonitoringService } from '../performanceMonitoringService';
import { scannerOptimizer } from '../scannerOptimizer';
import { withRetry } from '@/utils/retryMechanism';
import { ScanningConfig } from './types';

export class EnhancedScanProcessor {
  private config: ScanningConfig;

  constructor(config: ScanningConfig) {
    this.config = config;
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

  updateConfig(newConfig: Partial<ScanningConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }
}
