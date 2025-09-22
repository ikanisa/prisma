
import { scanningManager } from '@/services/scanningManager';
import { qrScannerServiceNew } from '@/services/QRScannerService';
import { performanceMonitoringService } from '@/services/performanceMonitoringService';
import { errorMonitoringService } from '@/services/errorMonitoringService';
import { scannerPerformanceOptimizer } from './scannerPerformanceOptimizer';

export interface SystemStatus {
  overall: 'healthy' | 'warning' | 'error';
  components: {
    scanningManager: ComponentStatus;
    qrScannerService: ComponentStatus;
    performanceMonitoring: ComponentStatus;
    errorMonitoring: ComponentStatus;
  };
  performance: {
    memoryUsage: number;
    responseTime: number;
    errorRate: number;
  };
  recommendations: string[];
}

export interface ComponentStatus {
  status: 'healthy' | 'warning' | 'error';
  message: string;
  lastChecked: number;
}

export class SystemStatusMonitor {
  private lastStatusCheck = 0;
  private statusCache: SystemStatus | null = null;
  private readonly CACHE_DURATION = 30000; // 30 seconds

  async getSystemStatus(forceRefresh = false): Promise<SystemStatus> {
    const now = Date.now();
    
    if (!forceRefresh && this.statusCache && (now - this.lastStatusCheck) < this.CACHE_DURATION) {
      return this.statusCache;
    }

    console.log('Checking system status...');
    
    const status: SystemStatus = {
      overall: 'healthy',
      components: {
        scanningManager: await this.checkScanningManager(),
        qrScannerService: await this.checkQRScannerService(),
        performanceMonitoring: await this.checkPerformanceMonitoring(),
        errorMonitoring: await this.checkErrorMonitoring()
      },
      performance: await this.getPerformanceMetrics(),
      recommendations: []
    };

    // Determine overall status
    const componentStatuses = Object.values(status.components).map(c => c.status);
    if (componentStatuses.includes('error')) {
      status.overall = 'error';
    } else if (componentStatuses.includes('warning')) {
      status.overall = 'warning';
    }

    // Generate recommendations
    status.recommendations = this.generateRecommendations(status);

    this.statusCache = status;
    this.lastStatusCheck = now;

    return status;
  }

  private async checkScanningManager(): Promise<ComponentStatus> {
    try {
      const stats = scanningManager.getPerformanceStats();
      const isActive = scanningManager.isActive();
      
      if (stats && typeof stats === 'object') {
        return {
          status: 'healthy',
          message: `Scanning manager operational. Active: ${isActive}`,
          lastChecked: Date.now()
        };
      } else {
        return {
          status: 'warning',
          message: 'Scanning manager stats unavailable',
          lastChecked: Date.now()
        };
      }
    } catch (error) {
      return {
        status: 'error',
        message: `Scanning manager error: ${(error as Error).message}`,
        lastChecked: Date.now()
      };
    }
  }

  private async checkQRScannerService(): Promise<ComponentStatus> {
    try {
      const isActive = qrScannerServiceNew.isActive();
      const hasPermissions = qrScannerServiceNew.hasPermissions();
      
      if (hasPermissions) {
        return {
          status: 'healthy',
          message: `QR Scanner service ready. Active: ${isActive}`,
          lastChecked: Date.now()
        };
      } else {
        return {
          status: 'warning',
          message: 'QR Scanner service lacks camera permissions',
          lastChecked: Date.now()
        };
      }
    } catch (error) {
      return {
        status: 'error',
        message: `QR Scanner service error: ${(error as Error).message}`,
        lastChecked: Date.now()
      };
    }
  }

  private async checkPerformanceMonitoring(): Promise<ComponentStatus> {
    try {
      const stats = performanceMonitoringService.getScanningStats();
      
      if (stats) {
        return {
          status: 'healthy',
          message: 'Performance monitoring active',
          lastChecked: Date.now()
        };
      } else {
        return {
          status: 'warning',
          message: 'Performance monitoring limited',
          lastChecked: Date.now()
        };
      }
    } catch (error) {
      return {
        status: 'error',
        message: `Performance monitoring error: ${(error as Error).message}`,
        lastChecked: Date.now()
      };
    }
  }

  private async checkErrorMonitoring(): Promise<ComponentStatus> {
    try {
      // Test error monitoring functionality
      const testError = new Error('System status test');
      errorMonitoringService.logError(testError, 'system_status_check');
      
      return {
        status: 'healthy',
        message: 'Error monitoring operational',
        lastChecked: Date.now()
      };
    } catch (error) {
      return {
        status: 'error',
        message: `Error monitoring failed: ${(error as Error).message}`,
        lastChecked: Date.now()
      };
    }
  }

  private async getPerformanceMetrics(): Promise<SystemStatus['performance']> {
    const report = scannerPerformanceOptimizer.getOptimizationReport();
    
    return {
      memoryUsage: report.memoryUsage || 0,
      responseTime: report.initTime || 0,
      errorRate: 0 // This would come from error monitoring in a real implementation
    };
  }

  private generateRecommendations(status: SystemStatus): string[] {
    const recommendations: string[] = [];
    
    // Check for component issues
    Object.entries(status.components).forEach(([component, componentStatus]) => {
      if (componentStatus.status === 'error') {
        recommendations.push(`Fix ${component} errors: ${componentStatus.message}`);
      } else if (componentStatus.status === 'warning') {
        recommendations.push(`Address ${component} warnings: ${componentStatus.message}`);
      }
    });

    // Performance recommendations
    if (status.performance.memoryUsage > 50) {
      recommendations.push('High memory usage detected - consider enabling memory optimizations');
    }
    
    if (status.performance.responseTime > 3000) {
      recommendations.push('Slow response times - enable performance optimizations');
    }

    // Add optimization recommendations
    const optimizationReport = scannerPerformanceOptimizer.getOptimizationReport();
    recommendations.push(...optimizationReport.recommendations);

    return recommendations;
  }

  async runHealthCheck(): Promise<boolean> {
    const status = await this.getSystemStatus(true);
    const isHealthy = status.overall === 'healthy';
    
    console.log('System health check:', {
      status: status.overall,
      healthy: isHealthy,
      recommendations: status.recommendations.length
    });

    return isHealthy;
  }
}

export const systemStatusMonitor = new SystemStatusMonitor();
