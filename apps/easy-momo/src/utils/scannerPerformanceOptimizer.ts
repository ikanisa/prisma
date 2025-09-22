
import { scanningManager } from '@/services/scanningManager';
import { performanceMonitoringService } from '@/services/performanceMonitoringService';

export interface PerformanceMetrics {
  initTime: number;
  scanTime: number;
  memoryUsage: number;
  cpuUsage: number;
  frameRate: number;
}

export class ScannerPerformanceOptimizer {
  private metrics: PerformanceMetrics = {
    initTime: 0,
    scanTime: 0,
    memoryUsage: 0,
    cpuUsage: 0,
    frameRate: 0
  };

  private performanceObserver?: PerformanceObserver;

  startMonitoring(): void {
    console.log('Starting scanner performance monitoring...');
    
    // Monitor performance entries
    if ('PerformanceObserver' in window) {
      this.performanceObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (entry.name.includes('scanner') || entry.name.includes('qr')) {
            this.updateMetrics(entry);
          }
        }
      });

      this.performanceObserver.observe({ 
        entryTypes: ['measure', 'navigation', 'paint'] 
      });
    }

    // Monitor memory usage
    this.monitorMemoryUsage();
    
    // Track frame rate
    this.monitorFrameRate();
  }

  stopMonitoring(): void {
    console.log('Stopping scanner performance monitoring...');
    
    if (this.performanceObserver) {
      this.performanceObserver.disconnect();
    }
  }

  private updateMetrics(entry: PerformanceEntry): void {
    if (entry.name.includes('init')) {
      this.metrics.initTime = entry.duration;
    } else if (entry.name.includes('scan')) {
      this.metrics.scanTime = entry.duration;
    }

    // Report to performance monitoring service
    performanceMonitoringService.trackMetric(entry.name, entry.duration);
  }

  private monitorMemoryUsage(): void {
    if ('memory' in performance) {
      const memory = (performance as any).memory;
      this.metrics.memoryUsage = memory.usedJSHeapSize / 1024 / 1024; // MB
      
      performanceMonitoringService.trackMetric('scanner_memory_usage', this.metrics.memoryUsage);
    }
  }

  private monitorFrameRate(): void {
    let frameCount = 0;
    let lastTime = performance.now();

    const countFrames = () => {
      frameCount++;
      const currentTime = performance.now();
      
      if (currentTime - lastTime >= 1000) {
        this.metrics.frameRate = frameCount;
        frameCount = 0;
        lastTime = currentTime;
        
        performanceMonitoringService.trackMetric('scanner_frame_rate', this.metrics.frameRate);
      }
      
      requestAnimationFrame(countFrames);
    };

    requestAnimationFrame(countFrames);
  }

  optimizeForDevice(): void {
    console.log('Optimizing scanner for current device...');
    
    // Detect device capabilities
    const isMobile = /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    const hasTouch = 'ontouchstart' in window;
    const isLowEnd = this.detectLowEndDevice();

    // Apply optimizations based on device
    const optimizations = {
      enableOptimization: isLowEnd,
      enableAI: !isLowEnd,
      retryCount: isLowEnd ? 1 : 3,
      cacheEnabled: true,
      frameSkipping: isLowEnd
    };

    scanningManager.updateConfig(optimizations);
    
    console.log('Scanner optimizations applied:', optimizations);
    performanceMonitoringService.trackUserInteraction('scanner_optimized', 'performance', {
      isMobile,
      hasTouch,
      isLowEnd,
      optimizations
    });
  }

  private detectLowEndDevice(): boolean {
    // Basic low-end device detection
    const memory = (navigator as any).deviceMemory;
    const cores = navigator.hardwareConcurrency;
    
    if (memory && memory <= 2) return true;
    if (cores && cores <= 2) return true;
    
    // Check for slower performance
    if (this.metrics.initTime > 3000) return true;
    if (this.metrics.frameRate < 15) return true;
    
    return false;
  }

  getOptimizationReport(): PerformanceMetrics & { recommendations: string[] } {
    const recommendations: string[] = [];
    
    if (this.metrics.initTime > 2000) {
      recommendations.push('Consider enabling frame skipping for faster initialization');
    }
    
    if (this.metrics.memoryUsage > 50) {
      recommendations.push('Memory usage is high - enable caching optimizations');
    }
    
    if (this.metrics.frameRate < 20) {
      recommendations.push('Low frame rate detected - reduce scan frequency');
    }

    return {
      ...this.metrics,
      recommendations
    };
  }
}

export const scannerPerformanceOptimizer = new ScannerPerformanceOptimizer();
