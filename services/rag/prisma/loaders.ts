export type UserRecord = {
  id: string;
  email: string;
  name?: string | null;
  avatarUrl?: string | null;
};

export type UserDelegate = {
  findMany: (args: {
    where: { id: { in: string[] } };
    select: {
      id: true;
      email: true;
      name: true;
      avatarUrl: true;
    };
  }) => Promise<UserRecord[]>;
};

export type UserLoaderPrismaClient = {
  user: UserDelegate;
};

type Deferred<T> = {
  resolve: (value: T) => void;
  reject: (error: unknown) => void;
};

export class UserLoader {
  private queue = new Map<string, Deferred<UserRecord | null>[]>();

  private cache = new Map<string, Promise<UserRecord | null>>();

  private scheduled = false;

  constructor(private readonly prisma: UserLoaderPrismaClient) {}

  load(id: string): Promise<UserRecord | null> {
    const cached = this.cache.get(id);
    if (cached) {
      return cached;
    }

    const promise = new Promise<UserRecord | null>((resolve, reject) => {
      const entry = this.queue.get(id);
      if (entry) {
        entry.push({ resolve, reject });
      } else {
        this.queue.set(id, [{ resolve, reject }]);
      }
    });

    this.cache.set(id, promise);
    this.scheduleFlush();
    return promise;
  }

  async loadMany(ids: readonly string[]): Promise<Array<UserRecord | null>> {
    return Promise.all(ids.map((id) => this.load(id)));
  }

  clear(id?: string): void {
    if (typeof id === 'string') {
      this.cache.delete(id);
      this.queue.delete(id);
      return;
    }
    this.cache.clear();
    this.queue.clear();
  }

  private scheduleFlush(): void {
    if (this.scheduled) {
      return;
    }

    this.scheduled = true;
    queueMicrotask(() => {
      void this.flush();
    });
  }

  private async flush(): Promise<void> {
    if (this.queue.size === 0) {
      this.scheduled = false;
      return;
    }

    const entries = Array.from(this.queue.entries());
    this.queue.clear();
    this.scheduled = false;

    const keys = entries.map(([key]) => key);

    try {
      const rows = await this.prisma.user.findMany({
        where: { id: { in: keys } },
        select: { id: true, email: true, name: true, avatarUrl: true },
      });

      const map = new Map(rows.map((row) => [row.id, row]));

      for (const [key, deferreds] of entries) {
        const value = map.get(key) ?? null;
        for (const deferred of deferreds) {
          deferred.resolve(value);
        }
      }
    } catch (error) {
      for (const [, deferreds] of entries) {
        for (const deferred of deferreds) {
          deferred.reject(error);
        }
      }
      for (const [key] of entries) {
        this.cache.delete(key);
      }
    }
  }
}

export const createUserLoader = (prisma: UserLoaderPrismaClient): UserLoader => new UserLoader(prisma);
