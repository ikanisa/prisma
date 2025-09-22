
import { analyticsService } from './analyticsService';
import { getConfig } from '@/utils/productionConfig';

interface ErrorContext {
  component?: string;
  action?: string;
  userId?: string;
  sessionId?: string;
  [key: string]: any;
}

class ErrorMonitoringService {
  private errorCount = 0;
  private config = getConfig();

  logError(error: Error, context?: string, metadata?: ErrorContext) {
    this.errorCount++;
    
    // Prevent spam - max errors per session
    if (this.errorCount > this.config.errorReporting.maxErrorsPerSession) {
      return;
    }

    const errorData = {
      message: error.message,
      stack: error.stack,
      context: context || 'unknown',
      timestamp: new Date().toISOString(),
      userAgent: this.config.errorReporting.includeUserAgent ? navigator.userAgent : undefined,
      url: this.config.errorReporting.includeUrl ? window.location.href : undefined,
      metadata
    };

    // Log to console in development
    if (this.config.features.debugMode) {
      console.error('[Error Monitor]', errorData);
    }

    // Track via analytics
    analyticsService.trackError(error.message, context || 'unknown');
  }

  logValidationError(field: string, value: any) {
    this.logError(new Error(`Validation failed for ${field}`), 'validation', {
      field,
      value: typeof value,
      hasValue: !!value
    });
  }

  logNetworkError(endpoint: string, status?: number) {
    this.logError(new Error(`Network error at ${endpoint}`), 'network', {
      endpoint,
      status
    });
  }

  logSupabaseError(operation: string, error: any) {
    this.logError(new Error(`Supabase ${operation} failed: ${error.message}`), 'supabase', {
      operation,
      errorCode: error.code,
      errorDetails: error.details
    });
  }

  getErrorCount() {
    return this.errorCount;
  }

  resetErrorCount() {
    this.errorCount = 0;
  }
}

export const errorMonitoringService = new ErrorMonitoringService();

// Global error handler
window.addEventListener('error', (event) => {
  errorMonitoringService.logError(event.error, 'global', {
    filename: event.filename,
    lineno: event.lineno,
    colno: event.colno
  });
});

// Unhandled promise rejection handler
window.addEventListener('unhandledrejection', (event) => {
  errorMonitoringService.logError(
    new Error(event.reason?.message || 'Unhandled promise rejection'),
    'promise_rejection',
    { reason: event.reason }
  );
});
