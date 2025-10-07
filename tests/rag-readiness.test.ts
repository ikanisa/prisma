import { describe, expect, it, vi } from 'vitest';

import { buildReadinessSummary } from '../services/rag/readiness';

describe('buildReadinessSummary', () => {
  it('returns ok when all checks pass', async () => {
    const summary = await buildReadinessSummary({
      db: { query: vi.fn().mockResolvedValue({}) },
      supabaseUrl: 'https://example.supabase.co',
      supabaseServiceRoleKey: 'service-role',
      openAIApiKey: 'openai-key',
    });

    expect(summary.status).toBe('ok');
    expect(summary.checks.database.status).toBe('ok');
  });

  it('marks degraded when the database check fails', async () => {
    const summary = await buildReadinessSummary({
      db: { query: vi.fn().mockRejectedValue(new Error('db outage')) },
      supabaseUrl: 'https://example.supabase.co',
      supabaseServiceRoleKey: 'service-role',
      openAIApiKey: 'openai-key',
    });

    expect(summary.status).toBe('degraded');
    expect(summary.checks.database.status).toBe('error');
    expect(summary.checks.database.detail).toContain('db outage');
  });

  it('flags missing environment variables', async () => {
    const summary = await buildReadinessSummary({
      db: { query: vi.fn().mockResolvedValue({}) },
      supabaseUrl: '',
      supabaseServiceRoleKey: '',
      openAIApiKey: undefined,
    });

    expect(summary.status).toBe('degraded');
    expect(summary.checks.supabaseUrl.status).toBe('error');
    expect(summary.checks.supabaseServiceRoleKey.status).toBe('error');
    expect(summary.checks.openaiApiKey.status).toBe('error');
  });
});
