export const queryKeys = {
  agents: {
    tasks: (orgSlug: string | null) => ['agents', 'tasks', orgSlug ?? ''] as const,
  },
  documents: {
    list: (orgSlug: string | null, repo?: string | null) =>
      ['documents', 'list', orgSlug ?? '', repo ?? 'all'] as const,
  },
  auth: {
    session: () => ['auth', 'supabase', 'session'] as const,
  },
} as const;

export type QueryKeyFactory = typeof queryKeys;
