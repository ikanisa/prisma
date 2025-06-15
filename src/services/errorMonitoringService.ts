
import { analyticsService } from './analyticsService';

export interface ErrorDetails {
  message: string;
  stack?: string;
  componentStack?: string;
  errorBoundary?: string;
  userAgent?: string;
  url?: string;
  timestamp?: string;
}

export const errorMonitoringService = {
  async logError(error: Error | string, context?: string, additionalData?: Record<string, any>) {
    try {
      const errorDetails: ErrorDetails = {
        message: typeof error === 'string' ? error : error.message,
        stack: typeof error === 'object' && error.stack ? error.stack : undefined,
        userAgent: navigator.userAgent,
        url: window.location.href,
        timestamp: new Date().toISOString(),
        ...additionalData
      };

      // Log to analytics
      await analyticsService.trackError(errorDetails.message, context || 'unknown');

      // Log to console for development
      console.error('[Error Monitoring]', {
        error: errorDetails,
        context,
        additionalData
      });

      return true;
    } catch (monitoringError) {
      console.error('Error monitoring failed:', monitoringError);
      return false;
    }
  },

  // Specific error logging methods
  logNetworkError(url: string, status?: number) {
    return this.logError(`Network error: ${status || 'Unknown'} for ${url}`, 'network');
  },

  logValidationError(field: string, value: any) {
    return this.logError(`Validation failed for ${field}`, 'validation', { field, value });
  },

  logUserError(action: string, details?: Record<string, any>) {
    return this.logError(`User error during ${action}`, 'user_action', details);
  }
};

// Global error handler
window.addEventListener('error', (event) => {
  errorMonitoringService.logError(event.error || event.message, 'global_error', {
    filename: event.filename,
    lineno: event.lineno,
    colno: event.colno
  });
});

// Unhandled promise rejection handler
window.addEventListener('unhandledrejection', (event) => {
  errorMonitoringService.logError(
    `Unhandled promise rejection: ${event.reason}`,
    'promise_rejection'
  );
});
