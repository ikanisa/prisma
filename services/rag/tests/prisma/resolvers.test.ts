import { describe, expect, it, vi } from 'vitest';
import { resolveDocumentFeed } from '../../prisma/resolvers/documents';
import { resolveOrganizationDashboard } from '../../prisma/resolvers/organization';
import { createUserLoader } from '../../prisma/loaders';

describe('resolveDocumentFeed', () => {
  it('requests related data via include selections', async () => {
    const findMany = vi.fn(async () => []);
    const prisma = { document: { findMany } };

    await resolveDocumentFeed(prisma, 'org-1', { limit: 10 });

    expect(findMany).toHaveBeenCalledWith({
      where: { orgId: 'org-1' },
      orderBy: { createdAt: 'desc' },
      take: 10,
      include: {
        uploadedBy: {
          select: { id: true, email: true, name: true, avatarUrl: true },
        },
        engagement: {
          select: { id: true, title: true },
        },
      },
    });
  });
});

describe('resolveOrganizationDashboard', () => {
  it('batches user hydration across memberships and tasks', async () => {
    const membershipRows = [
      { id: 'mem-1', role: 'MANAGER', userId: 'user-1' },
      { id: 'mem-2', role: 'EMPLOYEE', userId: 'user-2' },
    ];
    const taskRows = [
      { id: 'task-1', title: 'Prepare return', status: 'open', assignedTo: 'user-1' },
      { id: 'task-2', title: 'File documents', status: 'done', assignedTo: null },
    ];

    const prisma = {
      organization: {
        findUnique: vi.fn(async () => ({ id: 'org-1', name: 'Acme', slug: 'acme' })),
      },
      membership: {
        findMany: vi.fn(async () => membershipRows),
      },
      task: {
        findMany: vi.fn(async () => taskRows),
      },
      user: {
        findMany: vi.fn(async ({ where }: { where: { id: { in: string[] } } }) =>
          where.id.in.map((id) => ({ id, email: `${id}@example.test`, name: id.toUpperCase(), avatarUrl: null })),
        ),
      },
      $transaction: vi.fn(async (promises: Promise<unknown>[]) => Promise.all(promises)),
    };

    const loader = createUserLoader(prisma);
    const result = await resolveOrganizationDashboard(prisma, 'org-1', { userLoader: loader });

    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    expect(prisma.user.findMany).toHaveBeenCalledTimes(1);
    expect(result.memberships[0]).toMatchObject({ user: { id: 'user-1' } });
    expect(result.tasks[0]).toMatchObject({ assignee: { id: 'user-1' } });
  });
});
