type PrismaClientLike = {
  $connect(): Promise<void> | void;
  $disconnect(): Promise<void> | void;
  $queryRaw<T = unknown>(...args: unknown[]): Promise<T> | T;
  $on?(
    event: 'query' | 'error' | 'warn' | 'info',
    callback: (payload: Record<string, unknown>) => void,
  ): void;
};

type PrismaClientConstructor = new (...args: unknown[]) => PrismaClientLike;

const FallbackPrismaClient: PrismaClientConstructor = class implements PrismaClientLike {
  constructor() {}

  async $connect(): Promise<void> {
    return Promise.resolve();
  }

  async $disconnect(): Promise<void> {
    return Promise.resolve();
  }

  async $queryRaw<T = unknown>(): Promise<T> {
    return Promise.resolve(undefined as T);
  }

  // eslint-disable-next-line class-methods-use-this
  $on(): void {
    // no-op for fallback implementation
  }
};

let PrismaClientCtor: PrismaClientConstructor = FallbackPrismaClient;

try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const PrismaPkg = require('@prisma/client');
  const candidate = PrismaPkg?.PrismaClient ?? PrismaPkg;
  if (typeof candidate === 'function') {
    PrismaClientCtor = candidate as PrismaClientConstructor;
  }
} catch {
  PrismaClientCtor = FallbackPrismaClient;
}

type PrismaClientInstance = InstanceType<PrismaClientConstructor>;

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClientInstance;
};

const prismaInstance: PrismaClientInstance = (() => {
  if (globalForPrisma.prisma) {
    return globalForPrisma.prisma;
  }

  const shouldLogQueries =
    (process.env.PRISMA_LOG_QUERIES ?? process.env.SUPABASE_QUERY_LOGGING ?? 'false').toLowerCase() ===
    'true';

  try {
    const client = new PrismaClientCtor({
      log: shouldLogQueries
        ? ['error', 'warn', { level: 'query', emit: 'event' }]
        : ['error', 'warn'],
    } as Record<string, unknown>);

    if (shouldLogQueries && typeof client.$on === 'function') {
      client.$on('query', (event: Record<string, unknown>) => {
        const payload = {
          level: 'debug',
          msg: 'prisma.query',
          query: event.query ?? event['query'],
          params: event.params ?? event['params'],
          durationMs: event.duration ?? event['duration'],
        };
        console.log(JSON.stringify(payload));
      });
    }

    return client;
  } catch (error) {
    const message = error instanceof Error ? error.message : '';
    const needsFallback =
      message.includes('did not initialize yet') ||
      message.includes('has not been generated') ||
      message.includes('.prisma/client');

    if (!needsFallback) {
      throw error;
    }

    PrismaClientCtor = FallbackPrismaClient;
    return new PrismaClientCtor();
  }
})();

export const prisma: PrismaClientInstance = prismaInstance;

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}

export default prisma;
