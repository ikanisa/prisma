type PrismaClientLike = {
  $connect(): Promise<void> | void;
  $disconnect(): Promise<void> | void;
  $queryRaw<T = unknown>(...args: unknown[]): Promise<T> | T;
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

const shouldLogQueries = (): boolean => {
  const explicit = process.env.PRISMA_LOG_QUERIES ?? process.env.NEXT_PUBLIC_PRISMA_LOG_QUERIES;
  if (typeof explicit === 'string') {
    if (explicit.trim().length === 0) {
      return false;
    }
    const normalized = explicit.trim().toLowerCase();
    return normalized === '1' || normalized === 'true' || normalized === 'yes';
  }

  return process.env.NODE_ENV !== 'production';
};

const createLogConfiguration = (): Array<'query' | 'warn' | 'error'> => {
  const levels: Array<'query' | 'warn' | 'error'> = ['error', 'warn'];
  if (shouldLogQueries()) {
    levels.push('query');
  }
  return levels;
};

const prismaInstance: PrismaClientInstance = (() => {
  if (globalForPrisma.prisma) {
    return globalForPrisma.prisma;
  }

  try {
    const instance = new PrismaClientCtor({
      log: createLogConfiguration(),
    });

    if (shouldLogQueries() && typeof (instance as { $on?: unknown }).$on === 'function') {
      const listener = (event: unknown) => {
        if (!event || typeof event !== 'object') {
          return;
        }

        const { query, params, duration } = event as {
          query?: string;
          params?: string;
          duration?: number;
        };

        const formattedDuration = typeof duration === 'number' ? `${duration.toFixed(2)}ms` : 'n/a';
        const parameters = typeof params === 'string' && params.length > 0 ? ` params=${params}` : '';
        console.info(`[prisma] ${formattedDuration} ${query ?? '<unknown query>'}${parameters}`);
      };

      try {
        (instance as { $on: (event: string, cb: (payload: unknown) => void) => void }).$on('query', listener);
      } catch {
        // Best effort logging; Prisma implementations without $on support are ignored.
      }
    }

    return instance;
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
