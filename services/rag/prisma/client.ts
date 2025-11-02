export type PrismaClientLike = {
  $on?: (event: string, cb: (payload: unknown) => void) => void;
};

export type PrismaClientConstructor = new (options?: Record<string, unknown>) => PrismaClientLike;

const FallbackPrismaClient: PrismaClientConstructor = class implements PrismaClientLike {
  constructor() {}
};

let cachedPrismaClientCtor: PrismaClientConstructor | undefined;

const loadPrismaClientConstructor = (): PrismaClientConstructor => {
  if (cachedPrismaClientCtor) {
    return cachedPrismaClientCtor;
  }

  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const pkg = require('@prisma/client');
    const candidate = pkg?.PrismaClient ?? pkg;
    if (typeof candidate === 'function') {
      cachedPrismaClientCtor = candidate as PrismaClientConstructor;
      return cachedPrismaClientCtor;
    }
  } catch {
    // Fall through to the fallback client.
  }

  cachedPrismaClientCtor = FallbackPrismaClient;
  return cachedPrismaClientCtor;
};

export interface QueryLogEvent {
  query: string;
  params?: string;
  durationMs?: number;
  timestamp: Date;
}

export type QueryLogger = (event: QueryLogEvent) => void;

const parseBoolean = (value: string | undefined): boolean | undefined => {
  if (!value) {
    return undefined;
  }

  const normalized = value.trim().toLowerCase();
  if (['1', 'true', 'yes', 'on'].includes(normalized)) {
    return true;
  }
  if (['0', 'false', 'no', 'off'].includes(normalized)) {
    return false;
  }
  return undefined;
};

export const determineLogLevels = (explicit?: boolean): Array<'query' | 'warn' | 'error'> => {
  const levels: Array<'query' | 'warn' | 'error'> = ['error', 'warn'];
  let enabled = explicit;

  if (typeof enabled !== 'boolean') {
    enabled =
      parseBoolean(process.env.RAG_PRISMA_LOG_QUERIES) ??
      parseBoolean(process.env.PRISMA_LOG_QUERIES) ??
      (process.env.NODE_ENV !== 'production');
  }

  if (enabled) {
    levels.push('query');
  }

  return levels;
};

export const attachQueryLogger = (
  client: PrismaClientLike,
  logger?: QueryLogger,
  options?: { fallbackToConsole?: boolean },
): void => {
  if (typeof client?.$on !== 'function') {
    return;
  }

  const effectiveLogger: QueryLogger | undefined = logger ??
    (options?.fallbackToConsole ?? true
      ? (event) => {
          const suffix = event.params && event.params.length > 0 ? ` params=${event.params}` : '';
          const duration = typeof event.durationMs === 'number' ? `${event.durationMs.toFixed(2)}ms` : 'n/a';
          console.info(`[rag-prisma] ${duration} ${event.query}${suffix}`);
        }
      : undefined);

  if (!effectiveLogger) {
    return;
  }

  client.$on('query', (payload: unknown) => {
    if (!payload || typeof payload !== 'object') {
      return;
    }

    const { query, params, duration } = payload as {
      query?: string;
      params?: string;
      duration?: number;
    };

    effectiveLogger({
      query: query ?? '<unknown query>',
      params,
      durationMs: typeof duration === 'number' ? duration : undefined,
      timestamp: new Date(),
    });
  });
};

export interface ServicePrismaClientOptions {
  logQueries?: boolean;
  queryLogger?: QueryLogger;
  clientCtor?: PrismaClientConstructor;
}

export const createServicePrismaClient = (
  options: ServicePrismaClientOptions = {},
): PrismaClientLike => {
  const PrismaCtor = options.clientCtor ?? loadPrismaClientConstructor();
  const log = determineLogLevels(options.logQueries);
  const client = new PrismaCtor({ log });

  if (log.includes('query') || options.queryLogger) {
    attachQueryLogger(client, options.queryLogger);
  }

  return client;
};

export const __setPrismaClientConstructorForTests = (ctor: PrismaClientConstructor | undefined) => {
  cachedPrismaClientCtor = ctor;
};
