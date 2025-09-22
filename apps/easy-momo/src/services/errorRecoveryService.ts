
import { errorMonitoringService } from './errorMonitoringService';
import { performanceMonitoringService } from './performanceMonitoringService';
import { toastService } from './toastService';

export interface RecoveryOptions {
  maxRetries?: number;
  retryDelay?: number;
  exponentialBackoff?: boolean;
  fallbackActions?: (() => Promise<void>)[];
}

export interface ErrorContext {
  operation: string;
  timestamp: number;
  userAgent?: string;
  networkStatus?: string;
  cameraPermissions?: string;
  previousErrors?: string[];
}

class ErrorRecoveryService {
  private retryAttempts = new Map<string, number>();
  private errorHistory: ErrorContext[] = [];
  private circuitBreakers = new Map<string, { failures: number; lastFailure: number; isOpen: boolean }>();

  async withRetry<T>(
    operation: () => Promise<T>,
    operationName: string,
    options: RecoveryOptions = {}
  ): Promise<T> {
    const {
      maxRetries = 3,
      retryDelay = 1000,
      exponentialBackoff = true,
      fallbackActions = []
    } = options;

    let lastError: Error;
    const startTime = performance.now();

    for (let attempt = 1; attempt <= maxRetries + 1; attempt++) {
      try {
        // Check circuit breaker
        if (this.isCircuitOpen(operationName)) {
          throw new Error(`Circuit breaker open for ${operationName}`);
        }

        const result = await operation();
        
        // Reset on success
        this.resetCircuitBreaker(operationName);
        this.retryAttempts.delete(operationName);
        
        const duration = performance.now() - startTime;
        performanceMonitoringService.trackMetric('recovery_success', duration, {
          operation: operationName,
          attempts: attempt
        });

        return result;

      } catch (error) {
        lastError = error as Error;
        
        // Record circuit breaker failure
        this.recordFailure(operationName);
        
        const context: ErrorContext = {
          operation: operationName,
          timestamp: Date.now(),
          userAgent: navigator.userAgent,
          networkStatus: navigator.onLine ? 'online' : 'offline',
          previousErrors: this.errorHistory.slice(-3).map(e => e.operation)
        };

        this.errorHistory.push(context);
        errorMonitoringService.logError(lastError, 'recovery_attempt', {
          attempt,
          operationName,
          context
        });

        // If this is the last attempt, try fallback actions
        if (attempt > maxRetries) {
          for (const fallback of fallbackActions) {
            try {
              await fallback();
              toastService.info('Recovery Action', 'Attempting alternative method...');
            } catch (fallbackError) {
              console.log('Fallback action failed:', fallbackError);
            }
          }
          break;
        }

        // Calculate delay with exponential backoff
        const delay = exponentialBackoff 
          ? retryDelay * Math.pow(2, attempt - 1)
          : retryDelay;

        await this.delay(delay);
        
        this.retryAttempts.set(operationName, attempt);
      }
    }

    // Final failure handling
    const duration = performance.now() - startTime;
    performanceMonitoringService.trackMetric('recovery_failure', duration, {
      operation: operationName,
      totalAttempts: maxRetries + 1
    });

    throw lastError!;
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private isCircuitOpen(operation: string): boolean {
    const breaker = this.circuitBreakers.get(operation);
    if (!breaker) return false;

    const now = Date.now();
    const cooldownPeriod = 30000; // 30 seconds

    if (breaker.isOpen && now - breaker.lastFailure > cooldownPeriod) {
      breaker.isOpen = false;
      breaker.failures = 0;
    }

    return breaker.isOpen;
  }

  private recordFailure(operation: string): void {
    const breaker = this.circuitBreakers.get(operation) || {
      failures: 0,
      lastFailure: 0,
      isOpen: false
    };

    breaker.failures++;
    breaker.lastFailure = Date.now();

    // Open circuit after 5 failures
    if (breaker.failures >= 5) {
      breaker.isOpen = true;
      toastService.error(
        'Service Temporarily Unavailable',
        `${operation} is experiencing issues. Trying alternative methods...`
      );
    }

    this.circuitBreakers.set(operation, breaker);
  }

  private resetCircuitBreaker(operation: string): void {
    this.circuitBreakers.delete(operation);
  }

  getErrorSummary(): { operation: string; count: number }[] {
    const errorCounts = new Map<string, number>();
    
    this.errorHistory.forEach(error => {
      const current = errorCounts.get(error.operation) || 0;
      errorCounts.set(error.operation, current + 1);
    });

    return Array.from(errorCounts.entries()).map(([operation, count]) => ({
      operation,
      count
    }));
  }

  clearHistory(): void {
    this.errorHistory = [];
    this.retryAttempts.clear();
    this.circuitBreakers.clear();
  }
}

export const errorRecoveryService = new ErrorRecoveryService();
