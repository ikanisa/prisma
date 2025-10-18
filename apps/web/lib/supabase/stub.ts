/* eslint-disable @typescript-eslint/no-explicit-any */
import type { SupabaseClient } from '@supabase/supabase-js';

type QueryResult = { data: unknown; error: null };

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

function createMutationChain() {
  const result: QueryResult = { data: null, error: null };
  const chain: any = {
    select: () => chain,
    eq: () => chain,
    match: () => chain,
    order: () => chain,
    limit: () => chain,
    maybeSingle: async () => ({ data: null, error: null }),
    single: async () => ({ data: null, error: null }),
  };

  return Object.assign(createResolvedPromise(result), chain);
}

function createQueryChain() {
  const result: QueryResult = { data: [], error: null };
  const chain: any = {
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
  };

  return Object.assign(createResolvedPromise(result), chain);
}

export function createSupabaseStub(): SupabaseClient {
  const client: any = {
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
  };

  return client as SupabaseClient;
}
