import { trace } from '@opentelemetry/api';

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

type LogPayload = Record<string, unknown>;

type ContextProvider = () => LogPayload | null | undefined;

interface EmitOptions {
  level: LogLevel;
  message: string;
  details?: unknown;
  defaultMeta: LogPayload;
  scope?: string;
}

interface LoggerOptions {
  defaultMeta?: LogPayload;
  scope?: string;
}

type LogMethod = (message: string, details?: unknown) => void;

export interface Logger {
  debug: LogMethod;
  info: LogMethod;
  warn: LogMethod;
  error: LogMethod;
  child: (options: LoggerOptions) => Logger;
}

let contextProvider: ContextProvider | null = null;

export function setLogContextProvider(provider: ContextProvider | null): void {
  contextProvider = provider;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && value.constructor === Object;
}

function normalize(value: unknown): unknown {
  if (value === null || value === undefined) {
    return undefined;
  }

  if (value instanceof Error) {
    return {
      name: value.name,
      message: value.message,
      stack: value.stack,
    } satisfies LogPayload;
  }

  if (Array.isArray(value)) {
    const items = value
      .slice(0, 10)
      .map((entry) => normalize(entry))
      .filter((entry) => entry !== undefined);
    return items.length ? items : undefined;
  }

  if (isPlainObject(value)) {
    const output: LogPayload = {};
    for (const [key, entry] of Object.entries(value)) {
      const normalised = normalize(entry);
      if (normalised !== undefined) {
        output[key] = normalised;
      }
    }
    return Object.keys(output).length ? output : undefined;
  }

  if (typeof value === 'number' || typeof value === 'boolean' || typeof value === 'string') {
    return value;
  }

  return String(value);
}

function buildTraceContext(): LogPayload {
  const span = trace.getActiveSpan();
  if (!span) {
    return {};
  }

  const spanContext = span.spanContext();
  return {
    traceId: spanContext.traceId,
    spanId: spanContext.spanId,
  } satisfies LogPayload;
}

function selectConsole(level: LogLevel): (message?: unknown) => void {
  switch (level) {
    case 'debug':
      return console.debug.bind(console);
    case 'info':
      return console.info.bind(console);
    case 'warn':
      return console.warn.bind(console);
    case 'error':
      return console.error.bind(console);
    default:
      return console.log.bind(console);
  }
}

function emit({ level, message, details, defaultMeta, scope }: EmitOptions): void {
  const base: LogPayload = {
    level,
    message,
    timestamp: new Date().toISOString(),
    ...defaultMeta,
  };

  if (scope) {
    base.scope = scope;
  }

  const traceMeta = buildTraceContext();
  const contextualMeta = contextProvider?.() ?? {};
  const payload: LogPayload = { ...contextualMeta, ...traceMeta, ...base };

  if (details !== undefined) {
    const normalised = normalize(details);
    if (normalised && typeof normalised === 'object' && !Array.isArray(normalised)) {
      Object.assign(payload, normalised as LogPayload);
    } else if (normalised !== undefined) {
      payload.details = normalised;
    }
  }

  const sink = selectConsole(level);
  sink(JSON.stringify(payload));
}

export function createLogger(options: LoggerOptions = {}): Logger {
  const initialMeta = normalize(options.defaultMeta ?? {});
  const scope = typeof options.scope === 'string' && options.scope.trim() ? options.scope.trim() : undefined;
  const meta: LogPayload = isPlainObject(initialMeta) ? { ...initialMeta } : {};

  const log = (level: LogLevel): LogMethod => {
    return (message: string, details?: unknown) => {
      emit({ level, message, details, defaultMeta: meta, scope });
    };
  };

  return {
    debug: log('debug'),
    info: log('info'),
    warn: log('warn'),
    error: log('error'),
    child(childOptions: LoggerOptions): Logger {
      const override = normalize(childOptions.defaultMeta ?? {});
      const childMeta = isPlainObject(override) ? { ...meta, ...override } : { ...meta };
      const childScope = childOptions.scope ?? scope;
      return createLogger({ defaultMeta: childMeta, scope: childScope });
    },
  };
}

export const logger = createLogger();
