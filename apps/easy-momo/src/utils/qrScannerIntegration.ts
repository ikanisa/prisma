
import { scanningManager } from '@/services/scanningManager';
import { qrScannerServiceNew } from '@/services/QRScannerService';
import { performanceMonitoringService } from '@/services/performanceMonitoringService';
import { errorMonitoringService } from '@/services/errorMonitoringService';

export interface IntegrationTestResult {
  success: boolean;
  component: string;
  duration: number;
  error?: string;
}

export class QRScannerIntegrationTester {
  private testResults: IntegrationTestResult[] = [];

  async runFullIntegrationTest(): Promise<IntegrationTestResult[]> {
    console.log('Starting QR Scanner integration tests...');
    this.testResults = [];

    // Test 1: Scanning Manager Initialization
    await this.testScanningManagerInit();
    
    // Test 2: QR Scanner Service Integration
    await this.testQRScannerService();
    
    // Test 3: Performance Monitoring Integration
    await this.testPerformanceMonitoring();
    
    // Test 4: Error Handling Integration
    await this.testErrorHandling();

    // Test 5: End-to-End Scan Flow
    await this.testEndToEndFlow();

    console.log('Integration tests completed:', this.testResults);
    return this.testResults;
  }

  private async testScanningManagerInit(): Promise<void> {
    const startTime = performance.now();
    try {
      // Test scanning manager configuration
      const isActive = scanningManager.isActive();
      const stats = scanningManager.getPerformanceStats();
      
      this.testResults.push({
        success: true,
        component: 'ScanningManager',
        duration: performance.now() - startTime
      });
    } catch (error) {
      this.testResults.push({
        success: false,
        component: 'ScanningManager',
        duration: performance.now() - startTime,
        error: (error as Error).message
      });
    }
  }

  private async testQRScannerService(): Promise<void> {
    const startTime = performance.now();
    try {
      // Test service instantiation and basic methods
      const hasPermissions = qrScannerServiceNew.hasPermissions();
      const isActive = qrScannerServiceNew.isActive();
      
      this.testResults.push({
        success: true,
        component: 'QRScannerService',
        duration: performance.now() - startTime
      });
    } catch (error) {
      this.testResults.push({
        success: false,
        component: 'QRScannerService',
        duration: performance.now() - startTime,
        error: (error as Error).message
      });
    }
  }

  private async testPerformanceMonitoring(): Promise<void> {
    const startTime = performance.now();
    try {
      // Test performance monitoring integration
      performanceMonitoringService.trackUserInteraction('integration_test', 'scanner');
      const stats = performanceMonitoringService.getScanningStats();
      
      this.testResults.push({
        success: true,
        component: 'PerformanceMonitoring',
        duration: performance.now() - startTime
      });
    } catch (error) {
      this.testResults.push({
        success: false,
        component: 'PerformanceMonitoring',
        duration: performance.now() - startTime,
        error: (error as Error).message
      });
    }
  }

  private async testErrorHandling(): Promise<void> {
    const startTime = performance.now();
    try {
      // Test error monitoring integration
      const testError = new Error('Integration test error');
      errorMonitoringService.logError(testError, 'integration_test');
      
      this.testResults.push({
        success: true,
        component: 'ErrorHandling',
        duration: performance.now() - startTime
      });
    } catch (error) {
      this.testResults.push({
        success: false,
        component: 'ErrorHandling',
        duration: performance.now() - startTime,
        error: (error as Error).message
      });
    }
  }

  private async testEndToEndFlow(): Promise<void> {
    const startTime = performance.now();
    try {
      // Test complete scan flow simulation
      const mockUSSD = '*182*1*1*0789123456*2500#';
      const telURI = qrScannerServiceNew.createTelURI(mockUSSD);
      
      if (!telURI.startsWith('tel:')) {
        throw new Error('Invalid tel URI generation');
      }
      
      this.testResults.push({
        success: true,
        component: 'EndToEndFlow',
        duration: performance.now() - startTime
      });
    } catch (error) {
      this.testResults.push({
        success: false,
        component: 'EndToEndFlow',
        duration: performance.now() - startTime,
        error: (error as Error).message
      });
    }
  }

  getTestSummary(): { passed: number; failed: number; total: number } {
    const passed = this.testResults.filter(r => r.success).length;
    const failed = this.testResults.filter(r => !r.success).length;
    return { passed, failed, total: this.testResults.length };
  }
}

export const qrScannerIntegrationTester = new QRScannerIntegrationTester();
