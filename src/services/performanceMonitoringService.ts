
import { errorMonitoringService } from './errorMonitoringService';
import { supabase } from '@/integrations/supabase/client';

interface PerformanceMetric {
  metric_name: string;
  value: number;
  metadata?: Record<string, any>;
  timestamp: string;
  session_id: string;
}

interface ScanningPerformance {
  scanAttempts: number;
  successfulScans: number;
  avgProcessingTime: number;
  failureReasons: Record<string, number>;
  lightingConditions: Record<string, number>;
  methodsUsed: Record<string, number>;
}

class PerformanceMonitoringService {
  private metrics: PerformanceMetric[] = [];
  private sessionId: string;
  private scanningStats: ScanningPerformance = {
    scanAttempts: 0,
    successfulScans: 0,
    avgProcessingTime: 0,
    failureReasons: {},
    lightingConditions: {},
    methodsUsed: {}
  };

  constructor() {
    this.sessionId = this.generateSessionId();
    this.initializePerformanceObserver();
  }

  private generateSessionId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  private initializePerformanceObserver(): void {
    if ('PerformanceObserver' in window) {
      try {
        const observer = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            this.trackMetric('web_vitals', entry.duration, {
              name: entry.name,
              type: entry.entryType
            });
          }
        });
        
        observer.observe({ entryTypes: ['measure', 'navigation'] });
      } catch (error) {
        console.log('Performance Observer not supported:', error);
      }
    }
  }

  trackMetric(name: string, value: number, metadata?: Record<string, any>): void {
    const metric: PerformanceMetric = {
      metric_name: name,
      value,
      metadata,
      timestamp: new Date().toISOString(),
      session_id: this.sessionId
    };

    this.metrics.push(metric);

    // Auto-flush if we have too many metrics
    if (this.metrics.length >= 50) {
      this.flushMetrics();
    }
  }

  trackScanAttempt(method: string, lightingCondition: string): void {
    this.scanningStats.scanAttempts++;
    this.scanningStats.lightingConditions[lightingCondition] = 
      (this.scanningStats.lightingConditions[lightingCondition] || 0) + 1;
    this.scanningStats.methodsUsed[method] = 
      (this.scanningStats.methodsUsed[method] || 0) + 1;

    this.trackMetric('scan_attempt', 1, { method, lightingCondition });
  }

  trackScanSuccess(processingTime: number, method: string, confidence: number): void {
    this.scanningStats.successfulScans++;
    
    // Update average processing time
    const totalTime = this.scanningStats.avgProcessingTime * (this.scanningStats.successfulScans - 1);
    this.scanningStats.avgProcessingTime = (totalTime + processingTime) / this.scanningStats.successfulScans;

    this.trackMetric('scan_success', processingTime, { method, confidence });
  }

  trackScanFailure(reason: string, method: string): void {
    this.scanningStats.failureReasons[reason] = 
      (this.scanningStats.failureReasons[reason] || 0) + 1;

    this.trackMetric('scan_failure', 1, { reason, method });
  }

  trackUserInteraction(action: string, component: string, metadata?: Record<string, any>): void {
    this.trackMetric('user_interaction', 1, { action, component, ...metadata });
  }

  trackCameraPerformance(metric: string, value: number): void {
    this.trackMetric('camera_performance', value, { metric });
  }

  getSuccessRate(): number {
    if (this.scanningStats.scanAttempts === 0) return 0;
    return (this.scanningStats.successfulScans / this.scanningStats.scanAttempts) * 100;
  }

  getScanningStats(): ScanningPerformance {
    return { ...this.scanningStats };
  }

  async flushMetrics(): Promise<void> {
    if (this.metrics.length === 0) return;

    try {
      const { error } = await supabase.functions.invoke('analytics-collector', {
        body: {
          metrics: this.metrics,
          sessionStats: this.scanningStats
        }
      });

      if (error) {
        console.error('Failed to flush metrics:', error);
        errorMonitoringService.logError(new Error(error.message), 'metrics_flush');
      } else {
        this.metrics = []; // Clear metrics after successful flush
      }
    } catch (error) {
      console.error('Error flushing metrics:', error);
      errorMonitoringService.logError(error as Error, 'metrics_flush');
    }
  }

  // Memory and performance optimization
  measureMemoryUsage(): void {
    if ('memory' in performance) {
      const memory = (performance as any).memory;
      this.trackMetric('memory_usage', memory.usedJSHeapSize, {
        total: memory.totalJSHeapSize,
        limit: memory.jsHeapSizeLimit
      });
    }
  }

  measureFPS(): void {
    let lastTime = performance.now();
    let frames = 0;

    const measureFrame = () => {
      frames++;
      const currentTime = performance.now();
      
      if (currentTime >= lastTime + 1000) {
        const fps = Math.round((frames * 1000) / (currentTime - lastTime));
        this.trackMetric('fps', fps);
        
        frames = 0;
        lastTime = currentTime;
      }
      
      requestAnimationFrame(measureFrame);
    };

    requestAnimationFrame(measureFrame);
  }

  cleanup(): void {
    this.flushMetrics();
  }
}

export const performanceMonitoringService = new PerformanceMonitoringService();
