import DataLoader from 'dataloader';
import type { PrismaClient, Prisma } from '@prisma/client';
import { getPrismaClient } from './client.js';

type AgentManifest = Prisma.AgentManifestGetPayload<{
  select: {
    id: true;
    agentKey: true;
    createdAt: true;
  };
}>;

type LoaderOptions = {
  prisma?: PrismaClient;
  enableQueryLogging?: boolean;
  maxBatchSize?: number;
};

type LoaderResult = {
  load: (agentKey?: string | null) => Promise<string | null>;
  clear: (agentKey: string) => void;
  clearAll: () => void;
};

function selectLatestByKey(manifests: AgentManifest[]): Map<string, AgentManifest> {
  const latest = new Map<string, AgentManifest>();
  for (const manifest of manifests) {
    const existing = latest.get(manifest.agentKey);
    if (!existing || existing.createdAt < manifest.createdAt) {
      latest.set(manifest.agentKey, manifest);
    }
  }
  return latest;
}

export function createAgentManifestLoader(options?: LoaderOptions): LoaderResult {
  const prisma = options?.prisma ?? getPrismaClient({
    enableQueryLogging: options?.enableQueryLogging,
  });

  const loader = new DataLoader<string, string | null>(
    async (keys) => {
      const uniqueKeys = Array.from(new Set(keys.filter((key): key is string => Boolean(key))));
      if (uniqueKeys.length === 0) {
        return keys.map(() => null);
      }

      const manifests = await prisma.agentManifest.findMany({
        where: {
          agentKey: {
            in: uniqueKeys,
          },
        },
        orderBy: [
          { agentKey: 'asc' },
          { createdAt: 'desc' },
        ],
      });

      const latestByKey = selectLatestByKey(manifests);
      return keys.map((key) => {
        if (!key) return null;
        return latestByKey.get(key)?.id ?? null;
      });
    },
    {
      maxBatchSize: options?.maxBatchSize ?? 50,
      cache: true,
    },
  );

  return {
    load(agentKey?: string | null) {
      if (!agentKey) return Promise.resolve(null);
      return loader.load(agentKey);
    },
    clear(agentKey: string) {
      loader.clear(agentKey);
    },
    clearAll() {
      loader.clearAll();
    },
  };
}

export type AgentManifestLoader = ReturnType<typeof createAgentManifestLoader>;
