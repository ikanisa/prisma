import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createSupabaseStub } from '../stubs/supabase-client';

const RAG_MODULE_PATH = '../../services/rag/index.ts';

function setEnv(name: string, value: string | undefined) {
  if (typeof value === 'string') {
    process.env[name] = value;
  } else {
    delete process.env[name];
  }
}

describe('RAG service OpenAI client lazy loading', () => {
  const originalEnv: Record<string, string | undefined> = {};

  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();

    for (const key of ['OPENAI_API_KEY', 'SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY', 'SUPABASE_JWT_SECRET']) {
      originalEnv[key] = process.env[key];
    }

    setEnv('OPENAI_API_KEY', undefined);
    setEnv('SUPABASE_URL', 'https://stub.supabase.co');
    setEnv('SUPABASE_SERVICE_ROLE_KEY', 'service-role-key');
    setEnv('SUPABASE_JWT_SECRET', 'jwt-secret');

    vi.doMock('pdf-parse', () => ({
      __esModule: true,
      default: async () => ({ text: '' }),
    }));

    vi.doMock('pg', () => ({
      Client: class {
        async connect() {}
        async query() {
          return { rows: [] };
        }
        async end() {}
      },
    }));

    const supabaseStub = createSupabaseStub({});
    vi.doMock('@supabase/supabase-js', () => ({
      __esModule: true,
      createClient: vi.fn(() => supabaseStub),
    }));
  });

  afterEach(() => {
    for (const [key, value] of Object.entries(originalEnv)) {
      setEnv(key, value);
    }

    vi.unmock('pdf-parse');
    vi.unmock('pg');
    vi.unmock('@supabase/supabase-js');
    vi.unmock('@prisma-glow/lib/openai/client');
    vi.resetModules();
  });

  it('does not construct the OpenAI client during module import when credentials are missing', async () => {
    const getOpenAIClient = vi.fn(() => {
      throw new Error('OpenAI client should not be constructed during import');
    });

    vi.doMock('@prisma-glow/lib/openai/client', () => ({
      __esModule: true,
      getOpenAIClient,
    }));

    const module = await import(RAG_MODULE_PATH);
    expect(module.default).toBeDefined();
    expect(getOpenAIClient).not.toHaveBeenCalled();
  });
});
