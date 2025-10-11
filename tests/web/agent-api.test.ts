import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

type ResponseInitWithHeaders = ResponseInit & { headers?: Record<string, string> };

class MockNextResponse extends Response {
  static json(data: unknown, init?: ResponseInitWithHeaders) {
    return new MockNextResponse(JSON.stringify(data), {
      status: init?.status ?? 200,
      headers: {
        'content-type': 'application/json',
        ...(init?.headers ?? {}),
      },
    });
  }
}

vi.mock('next/server', () => ({
  NextResponse: MockNextResponse,
}));

const supabaseClientMock = {
  from: vi.fn(),
};

vi.mock('../../apps/web/lib/supabase/server', () => ({
  getSupabaseServiceClient: () => supabaseClientMock,
}));

describe('agent approvals API routes', () => {
  beforeEach(() => {
    supabaseClientMock.from.mockReset();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('GET /api/agent/approvals', () => {
    it('returns normalised approvals payload', async () => {
      const responsePayload = {
        data: [
          {
            id: 'approval-1',
            org_id: 'org-1',
            kind: 'AGENT_ACTION',
            stage: 'MANAGER',
            status: 'PENDING',
            requested_at: '2025-01-01T12:00:00Z',
            requested_by_user_id: 'user-1',
            approved_by_user_id: null,
            decision_at: null,
            decision_comment: null,
            context_json: { toolKey: 'docs.sign_url', standardsRefs: ['ISA 230'], orgSlug: 'demo' },
            session_id: 'session-1',
            action_id: 'action-1',
          },
        ],
        error: null,
      };

      const queryBuilder: any = {
        select: vi.fn().mockImplementation(() => queryBuilder),
        eq: vi.fn().mockImplementation(() => queryBuilder),
        order: vi.fn().mockImplementation(() => queryBuilder),
        limit: vi.fn().mockResolvedValue(responsePayload),
      };

      supabaseClientMock.from.mockReturnValue(queryBuilder);

      const request = Object.assign(new Request('https://example.com/api/agent/approvals?orgId=org-1'), {
        nextUrl: new URL('https://example.com/api/agent/approvals?orgId=org-1'),
      });

      const { GET } = await import('../../apps/web/app/api/agent/approvals/route');
      const res = await GET(request as any);
      expect(res.status).toBe(200);
      const body = (await res.json()) as { pending: unknown[]; history: unknown[] };
      expect(body.pending).toHaveLength(1);
      expect(body.history).toHaveLength(0);
      expect(body.pending[0]).toMatchObject({
        id: 'approval-1',
        orgId: 'org-1',
        toolKey: 'docs.sign_url',
        standards: ['ISA 230'],
        orgSlug: 'demo',
      });
      expect(supabaseClientMock.from).toHaveBeenCalledWith('approval_queue');
      expect(queryBuilder.select).toHaveBeenCalled();
      expect(queryBuilder.eq).toHaveBeenCalledWith('org_id', 'org-1');
      expect(queryBuilder.limit).toHaveBeenCalledWith(200);
    });

    it('returns 400 when orgId missing', async () => {
      const request = Object.assign(new Request('https://example.com/api/agent/approvals'), {
        nextUrl: new URL('https://example.com/api/agent/approvals'),
      });
      const { GET } = await import('../../apps/web/app/api/agent/approvals/route');
      const res = await GET(request as any);
      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body).toEqual({ error: 'orgId query parameter is required.' });
    });
  });

  describe('GET /api/agent/tool-registry', () => {
    it('merges global and org-specific tools', async () => {
      const responsePayload = {
        data: [
          {
            id: 'tool-1',
            key: 'docs.sign_url',
            label: 'Sign',
            description: null,
            min_role: 'MANAGER',
            sensitive: true,
            standards_refs: ['ISA 230'],
            enabled: true,
            metadata: {},
            org_id: null,
            updated_at: '2025-01-01T12:00:00Z',
            updated_by_user_id: null,
          },
        ],
        error: null,
      };

      const queryBuilder: any = {
        select: vi.fn().mockImplementation(() => queryBuilder),
        order: vi.fn().mockImplementation(() => queryBuilder),
        or: vi.fn().mockImplementation(() => queryBuilder),
        then: (resolve: (value: typeof responsePayload) => void) => Promise.resolve(resolve(responsePayload)),
        catch: () => queryBuilder,
      };

      supabaseClientMock.from.mockReturnValue(queryBuilder);

      const request = Object.assign(new Request('https://example.com/api/agent/tool-registry?orgId=org-1'), {
        nextUrl: new URL('https://example.com/api/agent/tool-registry?orgId=org-1'),
      });

      const { GET } = await import('../../apps/web/app/api/agent/tool-registry/route');
      const res = await GET(request as any);
      expect(res.status).toBe(200);
      const body = (await res.json()) as ToolsResponse;
      expect(body.tools).toHaveLength(1);
      expect(body.tools[0]).toMatchObject({ key: 'docs.sign_url', minRole: 'MANAGER', standardsRefs: ['ISA 230'] });
      expect(queryBuilder.or).toHaveBeenCalledWith('org_id.is.null,org_id.eq.org-1');
    });
  });

  describe('PATCH /api/agent/tool-registry', () => {
    it('updates tool flags', async () => {
      const eqMock = vi.fn().mockResolvedValue({ error: null });
      const updateMock = vi.fn().mockReturnValue({ eq: eqMock });
      supabaseClientMock.from.mockReturnValue({ update: updateMock });

      const { PATCH } = await import('../../apps/web/app/api/agent/tool-registry/route');

      const request = new Request('https://example.com/api/agent/tool-registry', {
        method: 'PATCH',
        body: JSON.stringify({ id: 'tool-1', enabled: false, updatedByUserId: 'user-1' }),
        headers: { 'content-type': 'application/json' },
      });

      const res = await PATCH(request as any);
      expect(res.status).toBe(200);
      expect(updateMock).toHaveBeenCalledWith(expect.objectContaining({ enabled: false }));
      expect(eqMock).toHaveBeenCalledWith('id', 'tool-1');
    });
  });

  describe('POST /api/agent/approvals/[id]/decision', () => {
    const originalEnv = { ...process.env };

    beforeEach(() => {
      vi.stubGlobal('fetch', vi.fn());
    });

    afterEach(() => {
      Object.assign(process.env, originalEnv);
      (global.fetch as unknown as vi.Mock).mockRestore?.();
    });

    it('forwards decision payload to agent service', async () => {
      process.env.NEXT_PUBLIC_API_BASE = 'https://api.example.com';
      const fetchMock = global.fetch as unknown as vi.Mock;
      fetchMock.mockResolvedValue(
        new MockNextResponse(JSON.stringify({ approval: { id: 'approval-1' } }), {
          status: 200,
          headers: { 'content-type': 'application/json' },
        }),
      );

      const { POST } = await import('../../apps/web/app/api/agent/approvals/[id]/decision/route');

      const request = Object.assign(
        new Request('https://example.com/api/agent/approvals/approval-1/decision', {
          method: 'POST',
          body: JSON.stringify({ decision: 'approved', comment: 'Looks good', orgSlug: 'demo' }),
          headers: {
            'content-type': 'application/json',
            cookie: 'session=abc',
            authorization: 'Bearer token',
          },
        }),
        { nextUrl: new URL('https://example.com/api/agent/approvals/approval-1/decision') },
      );

      const res = await POST(request as any, { params: { id: 'approval-1' } });
      expect(res.status).toBe(200);
      expect(fetchMock).toHaveBeenCalledWith('https://api.example.com/v1/approvals/approval-1/decision', {
        method: 'POST',
        headers: expect.objectContaining({
          'content-type': 'application/json',
          cookie: 'session=abc',
          authorization: 'Bearer token',
        }),
        body: JSON.stringify({ decision: 'APPROVED', comment: 'Looks good', evidence: undefined, orgSlug: 'demo' }),
        redirect: 'manual',
      });
    });

    it('returns 500 when service URL missing', async () => {
      delete process.env.NEXT_PUBLIC_API_BASE;
      delete process.env.AGENT_SERVICE_URL;

      const { POST } = await import('../../apps/web/app/api/agent/approvals/[id]/decision/route');
      const request = Object.assign(
        new Request('https://example.com/api/agent/approvals/approval-1/decision', {
          method: 'POST',
          body: JSON.stringify({ decision: 'APPROVED' }),
          headers: { 'content-type': 'application/json' },
        }),
        { nextUrl: new URL('https://example.com/api/agent/approvals/approval-1/decision') },
      );

      const res = await POST(request as any, { params: { id: 'approval-1' } });
      expect(res.status).toBe(500);
      const body = await res.json();
      expect(body).toEqual({ error: 'Agent service URL is not configured' });
    });
  });
});

interface ToolsResponse {
  tools: { key: string }[];
}
