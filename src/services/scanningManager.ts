
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
      const config = {
        fps: this.config.enableOptimization ? 8 : 10,
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
        const result = await this.scanProcessor.processScannedCode(decodedText);
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

  captureCurrentFrame(videoElement: HTMLVideoElement): HTMLCanvasElement | null {
    const frame = this.frameCaptureManager.captureCurrentFrame(videoElement);
    this.scanProcessor.setLastCapturedFrame(frame);
    return frame;
  }

  async enhancedScan(canvas: HTMLCanvasElement): Promise<QRProcessingResult> {
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
export type { ScanningConfig, ScanResult };
