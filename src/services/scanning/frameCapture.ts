
import { errorMonitoringService } from '../errorMonitoringService';
import { scannerOptimizer } from '../scannerOptimizer';
import { ScanningConfig } from './types';

export class FrameCaptureManager {
  private lastCapturedFrame: HTMLCanvasElement | null = null;
  private config: ScanningConfig;

  constructor(config: ScanningConfig) {
    this.config = config;
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

  getLastCapturedFrame(): HTMLCanvasElement | null {
    return this.lastCapturedFrame;
  }

  updateConfig(newConfig: Partial<ScanningConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }
}
