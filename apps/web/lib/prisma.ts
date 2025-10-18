/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-var-requires, @typescript-eslint/no-explicit-any, @typescript-eslint/no-require-imports */

// eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-var-requires
let PrismaClientCtor: any;

try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const PrismaPkg = require('@prisma/client');
  PrismaClientCtor = PrismaPkg?.PrismaClient ?? PrismaPkg;
} catch {
  PrismaClientCtor = class {
    async $connect() {}
    async $disconnect() {}
  };
}

type PrismaClientInstance = InstanceType<typeof PrismaClientCtor>;

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClientInstance;
};

export const prisma: PrismaClientInstance = (globalForPrisma.prisma ?? new PrismaClientCtor({
  log: ['error', 'warn'],
})) as PrismaClientInstance;

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}

export default prisma;
