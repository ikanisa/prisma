import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const authMock = vi.fn();
const supabaseAdminMock = {
  from: vi.fn(),
};
const recentLedgerEntriesMock = vi.fn();
const retrieveRelevantMock = vi.fn();
const openaiMock = {
  chat: {
    completions: {
      create: vi.fn(),
    },
  },
};

vi.mock('@/auth', () => ({
  auth: () => authMock(),
}));

vi.mock('../../../apps/web/auth', () => ({
  auth: () => authMock(),
}));

vi.mock('@/lib/finance-review/supabase', () => ({
  supabaseAdmin: supabaseAdminMock,
}));

vi.mock('../../../apps/web/lib/finance-review/supabase', () => ({
  supabaseAdmin: supabaseAdminMock,
}));

vi.mock('@/lib/finance-review/ledger', () => ({
  recentLedgerEntries: (...args: unknown[]) => recentLedgerEntriesMock(...args),
}));

vi.mock('../../../apps/web/lib/finance-review/ledger', () => ({
  recentLedgerEntries: (...args: unknown[]) => recentLedgerEntriesMock(...args),
}));

vi.mock('@/lib/finance-review/retrieval', () => ({
  retrieveRelevant: (...args: unknown[]) => retrieveRelevantMock(...args),
}));

vi.mock('../../../apps/web/lib/finance-review/retrieval', () => ({
  retrieveRelevant: (...args: unknown[]) => retrieveRelevantMock(...args),
}));

vi.mock('@/lib/finance-review/env', () => ({
  financeReviewEnv: {
    DEFAULT_ORG_ID: '00000000-0000-0000-0000-000000000000',
    OPENAI_API_KEY: 'test-key',
    CHAT_MODEL: 'gpt-4',
  },
}));

vi.mock('../../../apps/web/lib/finance-review/env', () => ({
  financeReviewEnv: {
    DEFAULT_ORG_ID: '00000000-0000-0000-0000-000000000000',
    OPENAI_API_KEY: 'test-key',
    CHAT_MODEL: 'gpt-4',
  },
}));

vi.mock('openai', () => ({
  default: vi.fn(() => openaiMock),
}));

vi.mock('@/agents/finance-review/cfo', () => ({
  CFO_PROMPT: 'CFO prompt',
  CFOResponseSchema: {
    parse: vi.fn((data) => data),
  },
}));

vi.mock('../../../apps/web/agents/finance-review/cfo', () => ({
  CFO_PROMPT: 'CFO prompt',
  CFOResponseSchema: {
    parse: vi.fn((data) => data),
  },
}));

vi.mock('@/agents/finance-review/auditor', () => ({
  AUDITOR_PROMPT: 'Auditor prompt',
  AuditorResponseSchema: {
    parse: vi.fn((data) => data),
  },
}));

vi.mock('../../../apps/web/agents/finance-review/auditor', () => ({
  AUDITOR_PROMPT: 'Auditor prompt',
  AuditorResponseSchema: {
    parse: vi.fn((data) => data),
  },
}));

import { POST } from '../../apps/web/app/api/review/run/route';

const ORG_ID = '10000000-0000-0000-0000-000000000001';
const USER_ID = '20000000-0000-0000-0000-000000000001';

describe('POST /api/review/run', () => {
  beforeEach(() => {
    authMock.mockReset();
    supabaseAdminMock.from.mockReset();
    recentLedgerEntriesMock.mockReset();
    retrieveRelevantMock.mockReset();
    openaiMock.chat.completions.create.mockReset();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('returns 401 when user is not authenticated', async () => {
    authMock.mockResolvedValue(null);

    const response = await POST(
      new Request('https://example.com/api/review/run', {
        method: 'POST',
        body: JSON.stringify({
          orgId: ORG_ID,
          hours: 24,
        }),
      }) as any
    );

    expect(response.status).toBe(401);
    const body = await response.json();
    expect(body).toEqual({ error: 'Authentication required' });
  });

  it('returns 403 when user is not a member of the organization', async () => {
    authMock.mockResolvedValue({
      user: { id: USER_ID, email: 'test@example.com' },
    });

    const fromMock = vi.fn((table: string) => {
      if (table === 'memberships') {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              eq: vi.fn(() => ({
                maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
              })),
            })),
          })),
        };
      }
      throw new Error(`Unexpected table ${table}`);
    });

    supabaseAdminMock.from = fromMock;

    const response = await POST(
      new Request('https://example.com/api/review/run', {
        method: 'POST',
        body: JSON.stringify({
          orgId: ORG_ID,
          hours: 24,
        }),
      }) as any
    );

    expect(response.status).toBe(403);
    const body = await response.json();
    expect(body).toEqual({
      error: 'User not authorised for organisation',
      orgId: ORG_ID,
    });
  });

  it('successfully executes review when user is authenticated and authorized', async () => {
    authMock.mockResolvedValue({
      user: { id: USER_ID, email: 'test@example.com' },
    });

    const membershipMock = vi.fn().mockResolvedValue({
      data: { role: 'admin' },
      error: null,
    });

    const controlLogMock = vi.fn().mockResolvedValue({
      data: { id: '30000000-0000-0000-0000-000000000001' },
      error: null,
    });

    const fromMock = vi.fn((table: string) => {
      if (table === 'memberships') {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              eq: vi.fn(() => ({
                maybeSingle: membershipMock,
              })),
            })),
          })),
        };
      }
      if (table === 'controls_logs') {
        return {
          insert: vi.fn(() => ({
            select: vi.fn(() => ({
              single: controlLogMock,
            })),
          })),
        };
      }
      throw new Error(`Unexpected table ${table}`);
    });

    supabaseAdminMock.from = fromMock;

    recentLedgerEntriesMock.mockResolvedValue([
      {
        date: '2025-01-01',
        account: 'Cash',
        debit: 1000,
        credit: null,
        currency: 'USD',
        memo: 'Test entry',
      },
    ]);

    retrieveRelevantMock.mockResolvedValue([
      { chunk_text: 'Relevant context' },
    ]);

    openaiMock.chat.completions.create.mockResolvedValueOnce({
      choices: [
        {
          message: {
            content: JSON.stringify({
              status: 'GREEN',
              issues: [],
            }),
          },
        },
      ],
    });

    openaiMock.chat.completions.create.mockResolvedValueOnce({
      choices: [
        {
          message: {
            content: JSON.stringify({
              risk_level: 'GREEN',
              exceptions: [],
            }),
          },
        },
      ],
    });

    const response = await POST(
      new Request('https://example.com/api/review/run', {
        method: 'POST',
        body: JSON.stringify({
          orgId: ORG_ID,
          hours: 24,
        }),
      }) as any
    );

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body).toHaveProperty('status', 'GREEN');
    expect(body).toHaveProperty('cfo');
    expect(body).toHaveProperty('auditor');
    expect(body).toHaveProperty('tasks');
    expect(body).toHaveProperty('controlLogId');

    // Verify ledger was called with correct org ID
    expect(recentLedgerEntriesMock).toHaveBeenCalledWith(24, ORG_ID);
    expect(retrieveRelevantMock).toHaveBeenCalledWith(
      expect.any(String),
      ORG_ID,
      12
    );
  });

  it('resolves user ID from email when ID is not directly available', async () => {
    authMock.mockResolvedValue({
      user: { email: 'test@example.com' },
    });

    const userLookupMock = vi.fn().mockResolvedValue({
      data: { user_id: USER_ID },
      error: null,
    });

    const membershipMock = vi.fn().mockResolvedValue({
      data: { role: 'admin' },
      error: null,
    });

    const controlLogMock = vi.fn().mockResolvedValue({
      data: { id: '30000000-0000-0000-0000-000000000001' },
      error: null,
    });

    const fromMock = vi.fn((table: string) => {
      if (table === 'app_users') {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              maybeSingle: userLookupMock,
            })),
          })),
        };
      }
      if (table === 'memberships') {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              eq: vi.fn(() => ({
                maybeSingle: membershipMock,
              })),
            })),
          })),
        };
      }
      if (table === 'controls_logs') {
        return {
          insert: vi.fn(() => ({
            select: vi.fn(() => ({
              single: controlLogMock,
            })),
          })),
        };
      }
      throw new Error(`Unexpected table ${table}`);
    });

    supabaseAdminMock.from = fromMock;

    recentLedgerEntriesMock.mockResolvedValue([]);
    retrieveRelevantMock.mockResolvedValue([]);

    openaiMock.chat.completions.create.mockResolvedValue({
      choices: [
        {
          message: {
            content: JSON.stringify({
              status: 'GREEN',
              risk_level: 'GREEN',
              issues: [],
              exceptions: [],
            }),
          },
        },
      ],
    });

    const response = await POST(
      new Request('https://example.com/api/review/run', {
        method: 'POST',
        body: JSON.stringify({
          orgId: ORG_ID,
          hours: 24,
        }),
      }) as any
    );

    expect(response.status).toBe(200);
    expect(userLookupMock).toHaveBeenCalled();
  });
});
