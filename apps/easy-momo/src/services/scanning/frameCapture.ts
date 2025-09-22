
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
      console.log('Attempting to capture frame from video element:', {
        videoWidth: videoElement.videoWidth,
        videoHeight: videoElement.videoHeight,
        readyState: videoElement.readyState,
        paused: videoElement.paused
      });

      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      
      if (!ctx) {
        console.error('Failed to get canvas context');
        return null;
      }

      // Wait for video to be ready
      if (!videoElement.videoWidth || !videoElement.videoHeight) {
        console.warn('Video not ready for capture - dimensions not available');
        return null;
      }

      if (videoElement.readyState < 2) {
        console.warn('Video not ready for capture - readyState:', videoElement.readyState);
        return null;
      }

      canvas.width = videoElement.videoWidth;
      canvas.height = videoElement.videoHeight;
      
      // Capture the current frame
      ctx.drawImage(videoElement, 0, 0, canvas.width, canvas.height);
      
      console.log('Frame captured successfully:', {
        canvasWidth: canvas.width,
        canvasHeight: canvas.height
      });
      
      // Optimize image if optimization is enabled
      if (this.config.enableOptimization) {
        this.lastCapturedFrame = scannerOptimizer.optimizeImageForProcessing(canvas);
      } else {
        this.lastCapturedFrame = canvas;
      }
      
      return this.lastCapturedFrame;
    } catch (error) {
      console.error('Frame capture error:', error);
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
