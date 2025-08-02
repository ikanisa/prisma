
import { performanceMonitoringService } from './performanceMonitoringService';
import { cacheService } from './cacheService';
import { errorMonitoringService } from './errorMonitoringService';

interface OptimizationConfig {
  enableFrameSkipping: boolean;
  frameSkipRate: number;
  enableImagePreprocessing: boolean;
  enableResultCaching: boolean;
  maxProcessingTime: number;
  adaptiveQuality: boolean;
}

class ScannerOptimizer {
  private config: OptimizationConfig = {
    enableFrameSkipping: true,
    frameSkipRate: 2, // Process every 2nd frame
    enableImagePreprocessing: true,
    enableResultCaching: true,
    maxProcessingTime: 2000, // 2 seconds max
    adaptiveQuality: true
  };

  private frameCounter = 0;
  private lastProcessingTime = 0;
  private averageProcessingTime = 0;
  private processingAttempts = 0;

  updateConfig(newConfig: Partial<OptimizationConfig>): void {
    this.config = { ...this.config, ...newConfig };
    performanceMonitoringService.trackUserInteraction('config_update', 'scanner_optimizer', newConfig);
  }

  shouldProcessFrame(): boolean {
    this.frameCounter++;
    
    if (!this.config.enableFrameSkipping) {
      return true;
    }

    // Adaptive frame skipping based on performance
    if (this.config.adaptiveQuality && this.averageProcessingTime > 1000) {
      // If processing is slow, skip more frames
      return this.frameCounter % (this.config.frameSkipRate * 2) === 0;
    }

    return this.frameCounter % this.config.frameSkipRate === 0;
  }

  optimizeImageForProcessing(canvas: HTMLCanvasElement): HTMLCanvasElement {
    if (!this.config.enableImagePreprocessing) {
      return canvas;
    }

    const startTime = performance.now();
    
    try {
      const optimizedCanvas = document.createElement('canvas');
      const ctx = optimizedCanvas.getContext('2d');
      
      if (!ctx) return canvas;

      // Adaptive resolution based on performance
      let scaleFactor = 1;
      if (this.config.adaptiveQuality && this.averageProcessingTime > 1500) {
        scaleFactor = 0.7; // Reduce resolution for better performance
      } else if (this.averageProcessingTime > 1000) {
        scaleFactor = 0.85;
      }

      optimizedCanvas.width = canvas.width * scaleFactor;
      optimizedCanvas.height = canvas.height * scaleFactor;

      // Apply image enhancements
      ctx.drawImage(canvas, 0, 0, optimizedCanvas.width, optimizedCanvas.height);
      
      // Enhance contrast for better QR detection
      const imageData = ctx.getImageData(0, 0, optimizedCanvas.width, optimizedCanvas.height);
      this.enhanceContrast(imageData);
      ctx.putImageData(imageData, 0, 0);

      const processingTime = performance.now() - startTime;
      performanceMonitoringService.trackMetric('image_optimization_time', processingTime);

      return optimizedCanvas;
    } catch (error) {
      errorMonitoringService.logError(error as Error, 'image_optimization');
      return canvas;
    }
  }

  private enhanceContrast(imageData: ImageData): void {
    const data = imageData.data;
    const factor = 1.2; // Contrast enhancement factor

    for (let i = 0; i < data.length; i += 4) {
      // Apply contrast enhancement to RGB channels
      data[i] = Math.min(255, Math.max(0, factor * (data[i] - 128) + 128));     // Red
      data[i + 1] = Math.min(255, Math.max(0, factor * (data[i + 1] - 128) + 128)); // Green
      data[i + 2] = Math.min(255, Math.max(0, factor * (data[i + 2] - 128) + 128)); // Blue
    }
  }

  trackProcessingTime(time: number): void {
    this.lastProcessingTime = time;
    this.processingAttempts++;
    
    // Update rolling average
    this.averageProcessingTime = 
      (this.averageProcessingTime * (this.processingAttempts - 1) + time) / this.processingAttempts;

    performanceMonitoringService.trackMetric('processing_time', time);

    // Auto-adjust settings based on performance
    if (this.config.adaptiveQuality) {
      this.autoAdjustSettings();
    }
  }

  private autoAdjustSettings(): void {
    if (this.averageProcessingTime > this.config.maxProcessingTime) {
      // Performance is poor, optimize more aggressively
      if (this.config.frameSkipRate < 4) {
        this.config.frameSkipRate++;
        performanceMonitoringService.trackUserInteraction('auto_adjust', 'scanner_optimizer', {
          action: 'increase_frame_skip',
          new_rate: this.config.frameSkipRate
        });
      }
    } else if (this.averageProcessingTime < this.config.maxProcessingTime * 0.5) {
      // Performance is good, can reduce optimization
      if (this.config.frameSkipRate > 1) {
        this.config.frameSkipRate--;
        performanceMonitoringService.trackUserInteraction('auto_adjust', 'scanner_optimizer', {
          action: 'decrease_frame_skip',
          new_rate: this.config.frameSkipRate
        });
      }
    }
  }

  cacheResult(key: string, result: any): void {
    if (this.config.enableResultCaching) {
      cacheService.cacheQRResult(key, result);
    }
  }

  getCachedResult(key: string): any | null {
    if (this.config.enableResultCaching) {
      return cacheService.getCachedQRResult(key);
    }
    return null;
  }

  generateImageHash(canvas: HTMLCanvasElement): string {
    try {
      // Simple hash based on image data
      const ctx = canvas.getContext('2d');
      if (!ctx) return '';

      const imageData = ctx.getImageData(0, 0, Math.min(50, canvas.width), Math.min(50, canvas.height));
      let hash = 0;
      
      for (let i = 0; i < imageData.data.length; i += 4) {
        const pixel = imageData.data[i] + imageData.data[i + 1] + imageData.data[i + 2];
        hash = ((hash << 5) - hash + pixel) & 0xffffffff;
      }
      
      return hash.toString();
    } catch (error) {
      return Math.random().toString();
    }
  }

  getOptimizationStats(): any {
    return {
      config: this.config,
      averageProcessingTime: this.averageProcessingTime,
      frameCounter: this.frameCounter,
      processingAttempts: this.processingAttempts,
      cacheStats: cacheService.getStats()
    };
  }

  reset(): void {
    this.frameCounter = 0;
    this.lastProcessingTime = 0;
    this.averageProcessingTime = 0;
    this.processingAttempts = 0;
  }
}

export const scannerOptimizer = new ScannerOptimizer();
