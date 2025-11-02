import { createUserLoader, UserLoader, UserLoaderPrismaClient, UserRecord } from '../loaders';

export type OrganizationDelegate = {
  findUnique: (args: {
    where: { id: string };
    select: {
      id: true;
      name: true;
      slug: true;
    };
  }) => Promise<unknown>;
};

export type MembershipDelegate = {
  findMany: (args: {
    where: { orgId: string };
    select: {
      id: true;
      role: true;
      userId: true;
    };
  }) => Promise<Array<{ id: string; role: string; userId: string }>>;
};

export type TaskDelegate = {
  findMany: (args: {
    where: { orgId: string };
    select: {
      id: true;
      title: true;
      status: true;
      assignedTo: true;
    };
    orderBy?: { createdAt: 'asc' | 'desc' };
  }) => Promise<Array<{ id: string; title: string; status: string | null; assignedTo: string | null }>>;
};

export type OrganizationResolverPrisma = UserLoaderPrismaClient & {
  organization: OrganizationDelegate;
  membership: MembershipDelegate;
  task: TaskDelegate;
  $transaction?: <T>(promises: Promise<T>[]) => Promise<T[]>;
};

export interface OrganizationDashboardOptions {
  orderTasks?: 'asc' | 'desc';
  userLoader?: UserLoader;
}

export interface OrganizationDashboardResult {
  organization: unknown;
  memberships: Array<{
    id: string;
    role: string;
    userId: string;
    user: UserRecord | null;
  }>;
  tasks: Array<{
    id: string;
    title: string;
    status: string | null;
    assignedTo: string | null;
    assignee: UserRecord | null;
  }>;
}

const collectUserIds = (
  memberships: Array<{ userId: string }>,
  tasks: Array<{ assignedTo: string | null }>,
): string[] => {
  const ids = new Set<string>();
  for (const membership of memberships) {
    ids.add(membership.userId);
  }
  for (const task of tasks) {
    if (task.assignedTo) {
      ids.add(task.assignedTo);
    }
  }
  return Array.from(ids);
};

export const resolveOrganizationDashboard = async (
  prisma: OrganizationResolverPrisma,
  orgId: string,
  options: OrganizationDashboardOptions = {},
): Promise<OrganizationDashboardResult> => {
  const loader = options.userLoader ?? createUserLoader(prisma);

  const queries = [
    prisma.organization.findUnique({
      where: { id: orgId },
      select: { id: true, name: true, slug: true },
    }),
    prisma.membership.findMany({
      where: { orgId },
      select: { id: true, role: true, userId: true },
    }),
    prisma.task.findMany({
      where: { orgId },
      select: { id: true, title: true, status: true, assignedTo: true },
      orderBy: { createdAt: options.orderTasks ?? 'desc' },
    }),
  ] as const;

  const executor = typeof prisma.$transaction === 'function'
    ? prisma.$transaction.bind(prisma)
    : async (items: readonly Promise<unknown>[]) => Promise.all(items);

  const [organization, memberships, tasks] = (await executor(queries)) as [
    unknown,
    Array<{ id: string; role: string; userId: string }>,
    Array<{ id: string; title: string; status: string | null; assignedTo: string | null }>,
  ];

  const userIds = collectUserIds(memberships, tasks);
  let userMap = new Map<string, UserRecord>();
  if (userIds.length > 0) {
    const users = await loader.loadMany(userIds);
    userMap = new Map(users.filter((user): user is UserRecord => Boolean(user)).map((user) => [user.id, user]));
  }

  return {
    organization,
    memberships: memberships.map((membership) => ({
      ...membership,
      user: userMap.get(membership.userId) ?? null,
    })),
    tasks: tasks.map((task) => ({
      ...task,
      assignee: task.assignedTo ? userMap.get(task.assignedTo) ?? null : null,
    })),
  };
};
