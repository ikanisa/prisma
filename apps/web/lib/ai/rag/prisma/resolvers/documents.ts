export type DocumentDelegate = {
  findMany: (args: {
    where: { orgId: string } | { orgId: { in: string[] } };
    orderBy?: { createdAt: 'asc' | 'desc' };
    take?: number;
    include: {
      uploadedBy: {
        select: {
          id: true;
          email: true;
          name: true;
          avatarUrl: true;
        };
      };
      engagement: {
        select: {
          id: true;
          title: true;
        };
      };
    };
  }) => Promise<unknown[]>;
};

export type DocumentResolverPrisma = {
  document: DocumentDelegate;
};

export interface DocumentFeedOptions {
  limit?: number;
  order?: 'asc' | 'desc';
}

export const resolveDocumentFeed = async (
  prisma: DocumentResolverPrisma,
  orgId: string,
  options: DocumentFeedOptions = {},
): Promise<unknown[]> => {
  const take = typeof options.limit === 'number' && options.limit > 0 ? options.limit : 50;
  const order = options.order ?? 'desc';

  return prisma.document.findMany({
    where: { orgId },
    orderBy: { createdAt: order },
    take,
    include: {
      uploadedBy: {
        select: { id: true, email: true, name: true, avatarUrl: true },
      },
      engagement: {
        select: { id: true, title: true },
      },
    },
  });
};
