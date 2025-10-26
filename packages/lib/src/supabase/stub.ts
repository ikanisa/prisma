import type {
  AuthChangeEvent,
  Session,
  SupabaseClient,
  User,
} from '@supabase/supabase-js';

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

function createStubUser(email: string): User {
  const now = new Date().toISOString();
  const idBase = email.replace(/[^a-z0-9]/gi, '-').toLowerCase();

  return {
    id: `stub-user-${idBase || 'anonymous'}`,
    aud: 'authenticated',
    email,
    phone: '',
    role: 'authenticated',
    app_metadata: { provider: 'stub' },
    user_metadata: { email },
    created_at: now,
    updated_at: now,
    confirmation_sent_at: now,
    email_confirmed_at: now,
    last_sign_in_at: now,
    identities: [],
    is_anonymous: false,
    factors: [],
  } satisfies User;
}

function createStubSession(email: string): Session {
  const user = createStubUser(email);
  const expiresAt = Math.floor(Date.now() / 1000) + 3600;
  const accessToken = `stub-access-${Math.random().toString(36).slice(2)}`;
  const refreshToken = `stub-refresh-${Math.random().toString(36).slice(2)}`;

  return {
    access_token: accessToken,
    refresh_token: refreshToken,
    token_type: 'bearer',
    expires_in: 3600,
    expires_at: expiresAt,
    provider_token: null,
    provider_refresh_token: null,
    user,
  } satisfies Session;
}

type AuthListener = (event: AuthChangeEvent, session: Session | null) => void;

export function createSupabaseStub(): SupabaseClient {
  let currentSession: Session | null = null;
  const listeners = new Set<AuthListener>();

  const notify = (event: AuthChangeEvent, session: Session | null) => {
    for (const listener of listeners) {
      try {
        listener(event, session);
      } catch {
        // ignore listener errors to keep stub resilient
      }
    }
  };

  const client = {
    from: () => createQueryChain(),
    rpc: async () => ({ data: null, error: null }),
    auth: {
      async getUser() {
        return { data: { user: currentSession?.user ?? null }, error: null };
      },
      async getSession() {
        return { data: { session: currentSession }, error: null };
      },
      onAuthStateChange(callback: AuthListener) {
        listeners.add(callback);
        callback('INITIAL_SESSION', currentSession);
        const subscription = {
          id: `stub-${Math.random().toString(36).slice(2)}`,
          unsubscribe: () => {
            listeners.delete(callback);
          },
        };
        return { data: { subscription }, error: null };
      },
      async signInWithOtp({ email }: { email: string }) {
        const normalisedEmail = email.trim().toLowerCase();
        currentSession = createStubSession(normalisedEmail || 'user@example.com');
        notify('SIGNED_IN', currentSession);
        return { data: { user: currentSession.user, session: currentSession }, error: null };
      },
      async signOut() {
        currentSession = null;
        notify('SIGNED_OUT', null);
        return { error: null };
      },
    },
    storage: {
      from: () => ({
        upload: async () => ({ data: null, error: null }),
        createSignedUrl: async () => ({ data: { signedUrl: '' }, error: null }),
        remove: async () => ({ data: [], error: null }),
      }),
    },
  } satisfies Record<string, unknown>;

  return client as unknown as SupabaseClient;
}
