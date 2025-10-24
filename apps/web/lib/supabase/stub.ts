import type { SupabaseClient } from '@supabase/supabase-js';

type QueryResult = { data: unknown; error: null };

interface MutationChain extends Promise<QueryResult> {
  select(): MutationChain;
  eq(): MutationChain;
  match(): MutationChain;
  order(): MutationChain;
  limit(): MutationChain;
  maybeSingle(): Promise<QueryResult>;
  single(): Promise<QueryResult>;
}

interface QueryChain extends Promise<QueryResult> {
  select(): QueryChain;
  eq(): QueryChain;
  in(): QueryChain;
  not(): QueryChain;
  match(): QueryChain;
  order(): QueryChain;
  limit(): QueryChain;
  filter(): QueryChain;
  insert(): MutationChain;
  update(): MutationChain;
  upsert(): MutationChain;
  delete(): MutationChain;
  maybeSingle(): Promise<QueryResult>;
  single(): Promise<QueryResult>;
}

function createResolvedPromise<T extends QueryResult>(result: T) {
  const promise = {
    then(onFulfilled?: (value: T) => unknown, onRejected?: (reason: unknown) => unknown) {
      try {
        const value = onFulfilled ? onFulfilled(result) : result;
        return Promise.resolve(value as T);
      } catch (error) {
        if (onRejected) {
          onRejected(error);
        }
        return Promise.resolve(result);
      }
    },
    catch() {
      return Promise.resolve(result);
    },
    finally(callback?: () => void) {
      callback?.();
      return Promise.resolve(result);
    },
  } as unknown as Promise<T>;

  return promise;
}

function createMutationChain(): MutationChain {
  const result: QueryResult = { data: null, error: null };
  const base = createResolvedPromise(result);
  const chain = Object.assign(base, {
    select: () => chain,
    eq: () => chain,
    match: () => chain,
    order: () => chain,
    limit: () => chain,
    maybeSingle: async () => ({ data: null, error: null }),
    single: async () => ({ data: null, error: null }),
  }) as MutationChain;

  return chain;
}

function createQueryChain(): QueryChain {
  const result: QueryResult = { data: [], error: null };
  const base = createResolvedPromise(result);
  const chain = Object.assign(base, {
    select: () => chain,
    eq: () => chain,
    in: () => chain,
    not: () => chain,
    match: () => chain,
    order: () => chain,
    limit: () => chain,
    filter: () => chain,
    insert: () => createMutationChain(),
    update: () => createMutationChain(),
    upsert: () => createMutationChain(),
    delete: () => createMutationChain(),
    maybeSingle: async () => ({ data: null, error: null }),
    single: async () => ({ data: null, error: null }),
  }) as QueryChain;

  return chain;
}

export function createSupabaseStub(): SupabaseClient {
  const client = {
    from: () => createQueryChain(),
    rpc: async () => ({ data: null, error: null }),
    auth: {
      getUser: async () => ({ data: { user: null }, error: null }),
      signOut: async () => ({ error: null }),
    },
    storage: {
      from: () => ({
        upload: async () => ({ data: null, error: null }),
        createSignedUrl: async () => ({ data: { signedUrl: '' }, error: null }),
        remove: async () => ({ data: [], error: null }),
      }),
    },
  } satisfies Record<string, unknown>;

  return client as SupabaseClient;
}
