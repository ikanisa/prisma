import { describe, expect, it, vi } from 'vitest';
import type { PrismaClient } from '@prisma/client';
import { createAgentManifestLoader } from '../prisma/agent-manifest-loader.js';

describe('createAgentManifestLoader', () => {
  const createPrismaStub = (manifests: Array<{ id: string; agentKey: string; createdAt: Date }>) => {
    return {
      agentManifest: {
        findMany: vi.fn().mockImplementation(async (params) => {
          const requestedKeys: string[] = params?.where?.agentKey?.in ?? [];
          return manifests
            .filter((manifest) => requestedKeys.includes(manifest.agentKey))
            .sort((a, b) => {
              if (a.agentKey === b.agentKey) {
                return b.createdAt.getTime() - a.createdAt.getTime();
              }
              return a.agentKey.localeCompare(b.agentKey);
            });
        }),
      },
    } as unknown as PrismaClient;
  };

  it('deduplicates requests and returns the latest manifest by createdAt', async () => {
    const manifests = [
      { id: 'v1', agentKey: 'director.core', createdAt: new Date('2024-10-01T10:00:00Z') },
      { id: 'v2', agentKey: 'director.core', createdAt: new Date('2024-10-02T10:00:00Z') },
      { id: 'v3', agentKey: 'safety.core', createdAt: new Date('2024-10-03T10:00:00Z') },
    ];
    const prisma = createPrismaStub(manifests);
    const loader = createAgentManifestLoader({ prisma, maxBatchSize: 100 });

    const [directorId, safetyId] = await Promise.all([
      loader.load('director.core'),
      loader.load('safety.core'),
    ]);

    const findMany = (prisma.agentManifest.findMany as unknown as ReturnType<typeof vi.fn>);
    expect(findMany).toHaveBeenCalledTimes(1);
    expect(findMany.mock.calls[0][0]?.where?.agentKey?.in).toEqual(['director.core', 'safety.core']);
    expect(directorId).toBe('v2');
    expect(safetyId).toBe('v3');
  });

  it('returns null for missing manifests and caches results when enabled', async () => {
    const manifests = [{ id: 'v1', agentKey: 'agent.alpha', createdAt: new Date('2024-11-01T00:00:00Z') }];
    const prisma = createPrismaStub(manifests);
    const loader = createAgentManifestLoader({ prisma, maxBatchSize: 10, cache: true });

    const first = await loader.load('agent.alpha');
    const missing = await loader.load('agent.beta');
    const second = await loader.load('agent.alpha');

    expect(first).toBe('v1');
    expect(second).toBe('v1');
    expect(missing).toBeNull();
    const calls = (prisma.agentManifest.findMany as unknown as ReturnType<typeof vi.fn>).mock.calls;
    expect(calls).toHaveLength(2);
    expect(calls[0][0]?.where?.agentKey?.in).toEqual(['agent.alpha']);
    expect(calls[1][0]?.where?.agentKey?.in).toEqual(['agent.beta']);
  });
});
