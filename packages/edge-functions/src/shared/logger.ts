import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

export interface EdgeFunctionLogger {
  info(message: string, metadata?: Record<string, any>): void;
  warn(message: string, metadata?: Record<string, any>): void;
  error(message: string, error?: Error | unknown, metadata?: Record<string, any>): void;
  debug(message: string, metadata?: Record<string, any>): void;
}

export class SupabaseLogger implements EdgeFunctionLogger {
  private context: string;

  constructor(context: string) {
    this.context = context;
  }

  private formatMessage(level: string, message: string, metadata?: Record<string, any>): string {
    const timestamp = new Date().toISOString();
    const meta = metadata ? JSON.stringify(metadata) : '';
    return `[${timestamp}] [${level.toUpperCase()}] [${this.context}] ${message} ${meta}`;
  }

  info(message: string, metadata?: Record<string, any>): void {
    console.log(this.formatMessage('info', message, metadata));
  }

  warn(message: string, metadata?: Record<string, any>): void {
    console.warn(this.formatMessage('warn', message, metadata));
  }

  error(message: string, error?: Error | unknown, metadata?: Record<string, any>): void {
    const errorMeta = error instanceof Error 
      ? { ...metadata, error: error.message, stack: error.stack }
      : { ...metadata, error: String(error) };
    console.error(this.formatMessage('error', message, errorMeta));
  }

  debug(message: string, metadata?: Record<string, any>): void {
    console.debug(this.formatMessage('debug', message, metadata));
  }
}

export function createLogger(context: string): EdgeFunctionLogger {
  return new SupabaseLogger(context);
}