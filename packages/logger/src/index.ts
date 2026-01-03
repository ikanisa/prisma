/**
 * @prisma-glow/logger
 * 
 * Unified structured logging for Prisma Glow applications.
 * Uses Pino-style API (context first, message last) for structured logging.
 */

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface LogContext {
  [key: string]: unknown;
}

export interface Logger {
  debug(context: LogContext, message: string): void;
  debug(message: string): void;
  info(context: LogContext, message: string): void;
  info(message: string): void;
  warn(context: LogContext, message: string): void;
  warn(message: string): void;
  error(context: LogContext, message: string): void;
  error(message: string): void;
  child(context: LogContext): Logger;
}

function formatLog(level: LogLevel, context: LogContext | undefined, message: string): string {
  const timestamp = new Date().toISOString();
  const contextStr = context && Object.keys(context).length > 0 
    ? ` ${JSON.stringify(context)}` 
    : '';
  return `[${timestamp}] ${level.toUpperCase()}:${contextStr} ${message}`;
}

class ConsoleLogger implements Logger {
  private baseContext: LogContext;

  constructor(baseContext: LogContext = {}) {
    this.baseContext = baseContext;
  }

  private log(level: LogLevel, contextOrMessage: LogContext | string, message?: string): void {
    let context: LogContext | undefined;
    let msg: string;

    if (typeof contextOrMessage === 'string') {
      context = Object.keys(this.baseContext).length > 0 ? this.baseContext : undefined;
      msg = contextOrMessage;
    } else {
      context = { ...this.baseContext, ...contextOrMessage };
      msg = message || '';
    }

    const formatted = formatLog(level, context, msg);
    
    switch (level) {
      case 'debug':
        // eslint-disable-next-line no-console
        console.debug(formatted);
        break;
      case 'info':
        // eslint-disable-next-line no-console
        console.info(formatted);
        break;
      case 'warn':
        // eslint-disable-next-line no-console
        console.warn(formatted);
        break;
      case 'error':
        // eslint-disable-next-line no-console
        console.error(formatted);
        break;
    }
  }

  debug(contextOrMessage: LogContext | string, message?: string): void {
    this.log('debug', contextOrMessage, message);
  }

  info(contextOrMessage: LogContext | string, message?: string): void {
    this.log('info', contextOrMessage, message);
  }

  warn(contextOrMessage: LogContext | string, message?: string): void {
    this.log('warn', contextOrMessage, message);
  }

  error(contextOrMessage: LogContext | string, message?: string): void {
    this.log('error', contextOrMessage, message);
  }

  child(context: LogContext): Logger {
    return new ConsoleLogger({ ...this.baseContext, ...context });
  }
}

/**
 * Default logger instance.
 * Use logger.child({ component: 'name' }) to create scoped loggers.
 */
export const logger: Logger = new ConsoleLogger();

/**
 * Create a logger with base context.
 * @example
 * const log = createLogger({ component: 'gateway' });
 * log.info({ requestId: '123' }, 'Request received');
 */
export function createLogger(context: LogContext = {}): Logger {
  return new ConsoleLogger(context);
}

