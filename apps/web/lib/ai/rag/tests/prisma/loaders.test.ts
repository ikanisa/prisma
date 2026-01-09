import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createUserLoader, type UserLoaderPrismaClient } from '../../prisma/loaders';

describe('UserLoader', () => {
  let prisma: UserLoaderPrismaClient;

  beforeEach(() => {
    prisma = {
      user: {
        findMany: vi.fn(async ({ where }: { where: { id: { in: string[] } } }) =>
          where.id.in.map((id) => ({ id, email: `${id}@example.test`, name: id.toUpperCase(), avatarUrl: null })),
        ),
      },
    };
  });

  it('batches requests made in the same tick', async () => {
    const loader = createUserLoader(prisma);

    const promiseA = loader.load('a');
    const promiseB = loader.load('b');

    const [a, b] = await Promise.all([promiseA, promiseB]);

    expect(prisma.user.findMany).toHaveBeenCalledTimes(1);
    expect(a?.id).toBe('a');
    expect(b?.id).toBe('b');
  });

  it('caches results between calls', async () => {
    const loader = createUserLoader(prisma);

    await loader.load('user-1');
    await loader.load('user-1');

    expect(prisma.user.findMany).toHaveBeenCalledTimes(1);
  });
});
