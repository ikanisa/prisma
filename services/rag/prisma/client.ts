import { PrismaClient, type Prisma } from '@prisma/client';

const globalSymbol = Symbol.for('prisma-glow.services.rag.prisma');

type GlobalWithPrisma = typeof globalThis & {
  [globalSymbol]?: PrismaClient;
};

type QueryObserver = (event: Prisma.QueryEvent) => void;

const queryObservers = new Set<QueryObserver>();

export function registerQueryObserver(observer: QueryObserver): () => void {
  queryObservers.add(observer);
  return () => queryObservers.delete(observer);
}

export function notifyQueryObservers(event: Prisma.QueryEvent) {
  for (const observer of queryObservers) {
    try {
      observer(event);
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('[rag][prisma] query observer failed', error);
    }
  }
}

type PrismaClientOptions = {
  enableQueryLogging?: boolean;
};

let prismaInstance: PrismaClient | null = null;

function createPrismaClient(options?: PrismaClientOptions): PrismaClient {
  const enableQueryLogging =
    options?.enableQueryLogging ?? process.env.RAG_PRISMA_LOG_QUERIES === 'true';

  const client = new PrismaClient({
    log: enableQueryLogging ? ['query', 'warn', 'error'] : ['warn', 'error'],
  });

  if (enableQueryLogging) {
    client.$on('query', (event) => {
      notifyQueryObservers(event);
      if (process.env.NODE_ENV !== 'test') {
        // eslint-disable-next-line no-console
        console.debug('[rag][prisma][query]', {
          model: event.model,
          action: event.action,
          durationMs: event.duration,
          params: event.params,
        });
      }
    });
  }

  return client;
}

export function getPrismaClient(options?: PrismaClientOptions): PrismaClient {
  if (prismaInstance) {
    return prismaInstance;
  }

  const globalWithPrisma = globalThis as GlobalWithPrisma;
  const existing = globalWithPrisma[globalSymbol];
  if (existing) {
    prismaInstance = existing;
    return existing;
  }

  const client = createPrismaClient(options);
  prismaInstance = client;
  globalWithPrisma[globalSymbol] = client;
  return client;
}

type CloseClientOptions = {
  force?: boolean;
};

export async function closePrismaClient(options?: CloseClientOptions) {
  if (!prismaInstance) return;
  const shouldDisconnect = options?.force ?? process.env.NODE_ENV === 'test';
  if (shouldDisconnect) {
    await prismaInstance.$disconnect();
    prismaInstance = null;
    const globalWithPrisma = globalThis as GlobalWithPrisma;
    delete globalWithPrisma[globalSymbol];
  }
}

export type { Prisma };
