type PrismaClientLike = {
  $connect(): Promise<void> | void;
  $disconnect(): Promise<void> | void;
};

type PrismaClientConstructor = new (...args: unknown[]) => PrismaClientLike;

const FallbackPrismaClient: PrismaClientConstructor = class implements PrismaClientLike {
  constructor(..._args: unknown[]) {}

  async $connect(): Promise<void> {
    return Promise.resolve();
  }

  async $disconnect(): Promise<void> {
    return Promise.resolve();
  }
};

let PrismaClientCtor: PrismaClientConstructor = FallbackPrismaClient;

try {
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

const prismaInstance: PrismaClientInstance = globalForPrisma.prisma ?? new PrismaClientCtor({
  log: ['error', 'warn'],
});

export const prisma: PrismaClientInstance = prismaInstance;

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}

export default prisma;
