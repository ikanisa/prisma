
import { Html5QrcodeScanner } from 'html5-qrcode';
import { performanceMonitoringService } from './performanceMonitoringService';
import { scannerOptimizer } from './scannerOptimizer';
import { ScanningConfig, ScanResult, DEFAULT_SCANNING_CONFIG } from './scanning/types';
import { FrameCaptureManager } from './scanning/frameCapture';
import { ScanProcessor } from './scanning/scanProcessor';
import { EnhancedScanProcessor } from './scanning/enhancedScanProcessor';
import { QRProcessingResult } from './aiQRProcessingService';

class ScanningManager {
  private scanner: Html5QrcodeScanner | null = null;
  private config: ScanningConfig;
  private isScanning = false;
  private scanStartTime = 0;
  private videoElement: HTMLVideoElement | null = null;
  
  private frameCaptureManager: FrameCaptureManager;
  private scanProcessor: ScanProcessor;
  private enhancedScanProcessor: EnhancedScanProcessor;

  constructor(config: Partial<ScanningConfig> = {}) {
    this.config = { ...DEFAULT_SCANNING_CONFIG, ...config };
    this.frameCaptureManager = new FrameCaptureManager(this.config);
    this.scanProcessor = new ScanProcessor(this.config);
    this.enhancedScanProcessor = new EnhancedScanProcessor(this.config);
  }

  async initializeScanner(elementId: string): Promise<void> {
    const initStartTime = performance.now();
    
    try {
      console.log('Initializing QR scanner with element ID:', elementId);
      
      // Clear any existing scanner
      if (this.scanner) {
        try {
          await this.scanner.clear();
        } catch (error) {
          console.warn('Error clearing existing scanner:', error);
        }
      }

      const config = {
        fps: this.config.enableOptimization ? 8 : 10,
        qrbox: { width: 280, height: 280 },
        aspectRatio: 1.0,
        experimentalFeatures: {
          useBarCodeDetectorIfSupported: true
        },
        videoConstraints: {
          facingMode: "environment" // Use back camera by default
        }
      };

      console.log('Scanner config:', config);

      this.scanner = new Html5QrcodeScanner(elementId, config, false);
      this.isScanning = true;
      
      const initTime = performance.now() - initStartTime;
      performanceMonitoringService.trackMetric('scanner_init_time', initTime);
      
      console.log('Scanner initialized successfully in', initTime, 'ms');
      
    } catch (error) {
      const initTime = performance.now() - initStartTime;
      console.error('Scanner initialization failed:', error);
      performanceMonitoringService.trackMetric('scanner_init_error_time', initTime);
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

    console.log('Starting QR scanning...');
    this.scanStartTime = performance.now();
    performanceMonitoringService.trackUserInteraction('scan_start', 'scanner');

    this.scanner.render(
      async (decodedText) => {
        console.log('QR code decoded:', decodedText);
        const result = await this.scanProcessor.processScannedCode(decodedText);
        onSuccess(result);
      },
      (errorMessage) => {
        // Only handle significant errors, not routine "no QR found" messages
        if (!errorMessage.includes('No QR code found') && 
            !errorMessage.includes('NotFoundException') &&
            !errorMessage.includes('NotFound')) {
          console.error('QR scanner error:', errorMessage);
          performanceMonitoringService.trackScanFailure('scanner_error', 'camera');
          onError(errorMessage);
        }
      }
    );

    // Try to get the video element after a short delay
    setTimeout(() => {
      this.findVideoElement();
    }, 1000);
  }

  private findVideoElement(): void {
    try {
      // Try to find the video element created by html5-qrcode
      const videoElements = document.querySelectorAll('video');
      if (videoElements.length > 0) {
        this.videoElement = videoElements[0] as HTMLVideoElement;
        console.log('Video element found:', {
          width: this.videoElement.videoWidth,
          height: this.videoElement.videoHeight,
          readyState: this.videoElement.readyState
        });
        
        // Wait for video to be ready
        this.videoElement.addEventListener('loadedmetadata', () => {
          console.log('Video metadata loaded:', {
            width: this.videoElement?.videoWidth,
            height: this.videoElement?.videoHeight
          });
        });
        
        this.videoElement.addEventListener('canplay', () => {
          console.log('Video can play - ready for frame capture');
        });
      } else {
        console.warn('No video elements found');
      }
    } catch (error) {
      console.error('Error finding video element:', error);
    }
  }

  captureCurrentFrame(videoElement?: HTMLVideoElement): HTMLCanvasElement | null {
    const targetVideo = videoElement || this.videoElement;
    
    if (!targetVideo) {
      console.warn('No video element available for frame capture');
      return null;
    }
    
    const frame = this.frameCaptureManager.captureCurrentFrame(targetVideo);
    this.scanProcessor.setLastCapturedFrame(frame);
    return frame;
  }

  async enhancedScan(canvas: HTMLCanvasElement): Promise<QRProcessingResult> {
    console.log('Starting enhanced scan...');
    return this.enhancedScanProcessor.enhancedScan(canvas);
  }

  getLastCapturedFrame(): HTMLCanvasElement | null {
    return this.frameCaptureManager.getLastCapturedFrame();
  }

  updateConfig(newConfig: Partial<ScanningConfig>): void {
    this.config = { ...this.config, ...newConfig };
    this.frameCaptureManager.updateConfig(this.config);
    this.scanProcessor.updateConfig(this.config);
    this.enhancedScanProcessor.updateConfig(this.config);
    performanceMonitoringService.trackUserInteraction('config_update', 'scanner', newConfig);
  }

  async stop(): Promise<void> {
    const stopStartTime = performance.now();
    
    console.log('Stopping QR scanner...');
    
    if (this.scanner) {
      try {
        await this.scanner.clear();
        this.scanner = null;
        this.isScanning = false;
        this.videoElement = null;
        
        const stopTime = performance.now() - stopStartTime;
        performanceMonitoringService.trackMetric('scanner_stop_time', stopTime);
        
        // Flush performance metrics
        performanceMonitoringService.flushMetrics();
        
        console.log('Scanner stopped successfully');
        
      } catch (error) {
        console.error('Error stopping scanner:', error);
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
        config: this.config,
        hasVideoElement: !!this.videoElement
      },
      optimizer: scannerOptimizer.getOptimizationStats(),
      performance: performanceMonitoringService.getScanningStats()
    };
  }
}

export const scanningManager = new ScanningManager();
export type { ScanningConfig, ScanResult };
