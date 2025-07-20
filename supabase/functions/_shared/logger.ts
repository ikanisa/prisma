/**
 * Centralized Logger for Edge Functions
 * Provides structured logging with consistent format
 */

export interface LogContext {
  function_name?: string;
  user_id?: string;
  phone_number?: string;
  request_id?: string;
  duration_ms?: number;
  [key: string]: any;
}

export const logger = {
  info: (message: string, context?: LogContext) => {
    console.log(JSON.stringify({
      level: 'info',
      message,
      timestamp: new Date().toISOString(),
      ...context
    }));
  },

  warn: (message: string, context?: LogContext) => {
    console.warn(JSON.stringify({
      level: 'warn',
      message,
      timestamp: new Date().toISOString(),
      ...context
    }));
  },

  error: (message: string, error?: any, context?: LogContext) => {
    console.error(JSON.stringify({
      level: 'error',
      message,
      error: error?.message || error,
      stack: error?.stack,
      timestamp: new Date().toISOString(),
      ...context
    }));
  },

  debug: (message: string, context?: LogContext) => {
    console.debug(JSON.stringify({
      level: 'debug',
      message,
      timestamp: new Date().toISOString(),
      ...context
    }));
  },

  /**
   * Log function execution with timing
   */
  async withTiming<T>(
    functionName: string, 
    operation: () => Promise<T>,
    context?: LogContext
  ): Promise<T> {
    const startTime = Date.now();
    logger.info(`Starting ${functionName}`, context);
    
    try {
      const result = await operation();
      const duration = Date.now() - startTime;
      logger.info(`Completed ${functionName}`, { 
        ...context, 
        duration_ms: duration,
        success: true 
      });
      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      logger.error(`Failed ${functionName}`, error, { 
        ...context, 
        duration_ms: duration,
        success: false 
      });
      throw error;
    }
  }
};