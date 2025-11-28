import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  getOpenAiWorkloadConfig,
  readOpenAiWorkloadEnv,
  resolveFinanceWorkloadKey,
  type OpenAiWorkloadKey,
} from '@prisma-glow/lib/openai/workloads';

afterEach(() => {
  vi.unstubAllEnvs();
});

describe('openai workload helpers', () => {
  it('parses default workload tags from OPENAI_REQUEST_TAGS', () => {
    vi.stubEnv('OPENAI_REQUEST_TAGS', 'service:rag,env:dev , workload:general');
    const envValues = readOpenAiWorkloadEnv('default');
    expect(envValues.requestTags).toEqual(['service:rag', 'env:dev', 'workload:general']);
  });

  it('prefers finance-specific credentials when available', () => {
    vi.stubEnv('OPENAI_API_KEY', 'sk-default');
    vi.stubEnv('OPENAI_API_KEY_FINANCE_PROD', 'sk-finance');
    vi.stubEnv('OPENAI_REQUEST_TAGS_FINANCE_PROD', 'service:rag,workload:finance');
    const config = getOpenAiWorkloadConfig('finance-prod');
    expect(config.apiKey).toBe('sk-finance');
    expect(config.requestTags).toEqual(['service:rag', 'workload:finance']);
  });

  it('throws when API key missing for requested workload', () => {
    expect(() => getOpenAiWorkloadConfig('default')).toThrow(/OpenAI API key is not configured/);
  });

  it('resolves finance workload key from NODE_ENV and override', () => {
    const cases: Array<{ env?: string; override?: OpenAiWorkloadKey; expected: OpenAiWorkloadKey }> = [
      { env: 'production', expected: 'finance-prod' },
      { env: 'staging', expected: 'finance-staging' },
      { env: 'development', expected: 'finance-staging' },
      { env: 'production', override: 'finance-staging', expected: 'finance-staging' },
    ];

    for (const testCase of cases) {
      vi.unstubAllEnvs();
      if (testCase.env) {
        vi.stubEnv('NODE_ENV', testCase.env);
      }
      if (testCase.override) {
        vi.stubEnv('OPENAI_FINANCE_WORKLOAD', testCase.override);
      }
      expect(resolveFinanceWorkloadKey()).toBe(testCase.expected);
    }
  });
});
