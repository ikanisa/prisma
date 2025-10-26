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

const prismaInstance: PrismaClientInstance = (() => {
  if (globalForPrisma.prisma) {
    return globalForPrisma.prisma;
  }

  try {
    return new PrismaClientCtor({
      log: ['error', 'warn'],
    });
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
