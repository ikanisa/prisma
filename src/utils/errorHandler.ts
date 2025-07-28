import { AppError } from '@/types/admin';

export class AppErrorHandler {
  static handle(error: unknown, context?: string): AppError {
    if (error instanceof AppError) {
      return error;
    }
    
    if (error instanceof Error) {
      const appError = new AppError(error.message, context);
      appError.stack = error.stack;
      return appError;
    }
    
    if (typeof error === 'string') {
      return new AppError(error, context);
    }
    
    return new AppError('An unknown error occurred', context);
  }
  
  static log(error: AppError): void {
    console.error(`[${error.code || 'ERROR'}] ${error.message}`, {
      context: error.stack,
      details: error.details
    });
  }
  
  static createError(message: string, code?: string, details?: Record<string, unknown>): AppError {
    const error = new AppError(message, code);
    error.details = details;
    return error;
  }
}