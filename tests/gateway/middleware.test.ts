import { describe, expect, it, vi } from 'vitest';
import { createOrgGuard } from '../../apps/gateway/org-guard.js';
import { createApiKeyValidator } from '../../apps/gateway/api-key.js';
import { createIdempotencyMiddleware } from '../../apps/gateway/idempotency-middleware.js';

describe('OrgGuard', () => {
  function createResponse() {
    return {
      statusCode: 200,
      locals: {},
      status: vi.fn(function (code: number) {
        this.statusCode = code;
        return this;
      }),
      json: vi.fn(function (body: unknown) {
        this.body = body;
        return this;
      }),
    } as any;
  }

  it('rejects missing organisation identifier', () => {
    const guard = createOrgGuard();
    const req: any = { headers: {}, requestId: 'req-1', path: '/resource' };
    const res = createResponse();
    const next = vi.fn();

    guard(req, res, next);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ error: 'invalid_org_id' });
    expect(next).not.toHaveBeenCalled();
  });

  it('allows valid organisation identifier', () => {
    const guard = createOrgGuard();
    const orgId = '11111111-2222-3333-4444-555555555555';
    const req: any = { headers: { 'x-org-id': orgId }, requestId: 'req-2', path: '/resource' };
    const res = createResponse();
    const next = vi.fn();

    guard(req, res, next);

    expect(req.orgId).toBe(orgId);
    expect(next).toHaveBeenCalled();
  });
});

describe('API key validator', () => {
  function createResponse() {
    return {
      statusCode: 200,
      locals: {},
      status: vi.fn(function (code: number) {
        this.statusCode = code;
        return this;
      }),
      json: vi.fn(function (body: unknown) {
        this.body = body;
        return this;
      }),
    } as any;
  }

  it('rejects requests without API key', () => {
    const validator = createApiKeyValidator({ apiKeys: ['secret'] });
    const req: any = { headers: {}, requestId: 'req-3', path: '/secure' };
    const res = createResponse();
    const next = vi.fn();

    validator(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ error: 'missing_api_key' });
    expect(next).not.toHaveBeenCalled();
  });

  it('accepts configured API key', () => {
    const validator = createApiKeyValidator({ apiKeys: ['secret'] });
    const req: any = { headers: { 'x-api-key': 'secret' }, requestId: 'req-4', path: '/secure' };
    const res = createResponse();
    const next = vi.fn();

    validator(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(req.apiKey).toBe('secret');
  });
});

describe('Idempotency middleware', () => {
  function createResponse() {
    return {
      statusCode: 200,
      headers: {} as Record<string, string>,
      locals: {},
      status: vi.fn(function (code: number) {
        this.statusCode = code;
        return this;
      }),
      json: vi.fn(function (body: unknown) {
        this.body = body;
        return this;
      }),
      setHeader: vi.fn(function (key: string, value: string) {
        this.headers[key] = value;
      }),
    } as any;
  }

  it('returns cached response when available', async () => {
    const store = {
      find: vi.fn().mockResolvedValue({ statusCode: 201, response: { ok: true }, requestId: 'req-old' }),
      store: vi.fn(),
    };
    const middleware = createIdempotencyMiddleware(store as any, { resource: 'tests:cached' });

    const req: any = {
      headers: { 'x-idempotency-key': 'abc123' },
      orgId: '11111111-2222-3333-4444-555555555555',
      method: 'POST',
      path: '/tests',
      requestId: 'req-5',
    };
    const res = createResponse();
    const next = vi.fn();

    await middleware(req, res, next);

    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith({ ok: true });
    expect(next).not.toHaveBeenCalled();
  });

  it('stores new responses on success', async () => {
    const store = {
      find: vi.fn().mockResolvedValue(null),
      store: vi.fn().mockResolvedValue(undefined),
    };
    const middleware = createIdempotencyMiddleware(store as any, { resource: 'tests:new' });

    const req: any = {
      headers: { 'x-idempotency-key': 'cache-key' },
      orgId: '11111111-2222-3333-4444-555555555555',
      method: 'POST',
      path: '/tests',
      requestId: 'req-6',
    };
    const res = createResponse();

    const next = vi.fn(() => {
      res.status(202);
      res.json({ ok: true });
    });

    await middleware(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(store.store).toHaveBeenCalledWith({
      orgId: req.orgId,
      resource: 'tests:new',
      key: 'cache-key',
      statusCode: 202,
      response: { ok: true },
      requestId: 'req-6',
    });
  });
});
