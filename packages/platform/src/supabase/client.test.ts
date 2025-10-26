import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const ORIGINAL_ENV = { ...process.env };

const resetEnv = () => {
  Object.assign(process.env, ORIGINAL_ENV);
  delete process.env.SUPABASE_URL;
  delete process.env.NEXT_PUBLIC_SUPABASE_URL;
  delete process.env.VITE_SUPABASE_URL;
  delete process.env.SUPABASE_ANON_KEY;
  delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  delete process.env.VITE_SUPABASE_PUBLISHABLE_KEY;
  delete process.env.SUPABASE_ALLOW_STUB;
  delete process.env.VITE_SUPABASE_ALLOW_STUB;
  delete process.env.NEXT_PUBLIC_SUPABASE_ALLOW_STUB;
};

beforeEach(() => {
  resetEnv();
  vi.resetModules();
});

afterEach(() => {
  resetEnv();
  vi.resetModules();
});

describe('getBrowserSupabaseClient', () => {
  it('falls back to the stub client when credentials are missing and stub mode is enabled', async () => {
    process.env.SUPABASE_ALLOW_STUB = 'true';

    const module = await import('./client');
    const client = module.getBrowserSupabaseClient();

    expect(module.isSupabaseConfigured).toBe(false);

    const events: Array<{ event: string; email: string | null }> = [];
    const { data } = client.auth.onAuthStateChange((event, session) => {
      events.push({ event, email: session?.user?.email ?? null });
    });

    const signInResult = await client.auth.signInWithOtp({ email: 'stub@example.com' });
    expect(signInResult.error).toBeNull();

    const sessionResponse = await client.auth.getSession();
    expect(sessionResponse.data.session?.user.email).toBe('stub@example.com');

    await client.auth.signOut();

    expect(events.some((entry) => entry.event === 'SIGNED_IN')).toBe(true);
    expect(events.some((entry) => entry.event === 'SIGNED_OUT')).toBe(true);
    expect(events.at(-1)?.email).toBeNull();

    data.subscription.unsubscribe();
  });

  it('marks Supabase as configured when both URL and anon key are present', async () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://example.supabase.co';
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'example-anon-key';

    const module = await import('./client');

    expect(module.isSupabaseConfigured).toBe(true);
  });
});
