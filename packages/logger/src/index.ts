type LogLevel = 'info' | 'warn' | 'error';

type LogMetadata = Record<string, unknown>;

type ErrorLike = {
  name?: string;
  message?: string;
  stack?: string;
  cause?: unknown;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function serializeError(value: unknown): ErrorLike {
  if (!value || typeof value !== 'object') {
    return { message: String(value) };
  }

  const error = value as ErrorLike;
  return {
    name: error.name,
    message: error.message,
    stack: error.stack,
    cause: isRecord(error.cause) ? error.cause : undefined,
  };
}

function emit(level: LogLevel, message: string, details?: unknown) {
  const base: LogMetadata = {
    level,
    message,
    timestamp: new Date().toISOString(),
  };

  let payload: LogMetadata = base;

  if (details !== undefined) {
    if (details instanceof Error || (isRecord(details) && 'message' in details && 'stack' in details)) {
      payload = { ...base, error: serializeError(details) };
    } else if (isRecord(details)) {
      payload = { ...base, ...details };
    } else {
      payload = { ...base, data: details };
    }
  }

  const sink = level === 'error' ? console.error : level === 'warn' ? console.warn : console.info;

  sink(JSON.stringify(payload));
}

export const logger = {
  info: (message: string, details?: unknown) => emit('info', message, details),
  warn: (message: string, details?: unknown) => emit('warn', message, details),
  error: (message: string, details?: unknown) => emit('error', message, details),
};

export type Logger = typeof logger;
