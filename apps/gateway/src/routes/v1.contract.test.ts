import { beforeAll, afterAll, describe, expect, it } from 'vitest';
import http from 'node:http';
import type { Express } from 'express';
import request from 'supertest';
import type { Test } from 'supertest';
import { createGatewayServer } from '../server.js';

let stubServer: http.Server;
let stubPort = 0;
let lastHeaders: http.IncomingHttpHeaders | null = null;
let releaseCalls = 0;

beforeAll(async () => {
  stubServer = http.createServer((req, res) => {
    const url = new URL(req.url || '/', 'http://localhost');
    res.setHeader('Content-Type', 'application/json');
    lastHeaders = req.headers;
    if (req.method === 'GET' && url.pathname === '/v1/autonomy/status') {
      const orgSlug = url.searchParams.get('orgSlug');
      res.end(JSON.stringify({ status: 'ok', orgSlug }));
      return;
    }
    if (req.method === 'GET' && url.pathname === '/v1/knowledge/web-sources') {
      res.end(JSON.stringify({ sources: [{ id: 's1' }] }));
      return;
    }
    if (req.method === 'GET' && url.pathname === '/v1/storage/documents') {
      res.end(JSON.stringify({ documents: [{ id: 'd1' }] }));
      return;
    }
    if (req.method === 'POST' && url.pathname === '/v1/storage/sign') {
      let body = '';
      req.on('data', (chunk) => (body += chunk));
      req.on('end', () => {
        const payload = JSON.parse(body || '{}');
        res.end(JSON.stringify({ ok: true, input: payload }));
      });
      return;
    }
    if (req.method === 'GET' && url.pathname === '/v1/tasks') {
      res.statusCode = 404;
      res.end(JSON.stringify({ error: 'not_found' }));
      return;
    }
    if (req.method === 'POST' && url.pathname === '/api/release-controls/check') {
      let body = '';
      req.on('data', (chunk) => (body += chunk));
      req.on('end', () => {
        const payload = JSON.parse(body || '{}');
        if (payload && payload.flaky && releaseCalls < 1) {
          releaseCalls += 1;
          res.statusCode = 503;
          res.end(JSON.stringify({ error: 'unavailable' }));
          return;
        }
        res.end(JSON.stringify({ ok: true, input: payload }));
      });
      return;
    }
    res.statusCode = 404;
    res.end(JSON.stringify({ error: 'not_found' }));
  });
  await new Promise<void>((resolve) => {
    stubServer.listen(0, '127.0.0.1', () => {
      const addr = stubServer.address();
      if (typeof addr === 'object' && addr) stubPort = addr.port;
      process.env.API_BASE_URL = `http://127.0.0.1:${stubPort}`;
      resolve();
    });
  });
});

afterAll(async () => {
  await new Promise<void>((resolve) => stubServer.close(() => resolve()))
    .catch(() => undefined);
  delete process.env.API_BASE_URL;
});

describe('gateway → API contract proxying', () => {
  let app: Express;
  beforeAll(async () => {
    app = await createGatewayServer();
  });
  const withOrgHeaders = <T extends Test>(req: T): T =>
    req
      .set('x-org-id', 'acme')
      .set('x-user-id', 'user-1')
      .set('x-org-memberships', 'acme:MANAGER');

  it('proxies autonomy/status to backend', async () => {
    const res = await withOrgHeaders(
      request(app)
        .get('/v1/autonomy/status')
        .set('Authorization', 'Bearer test-token')
        .query({ orgSlug: 'acme' }),
    );
    expect(res.status).toBe(200);
    expect(res.body.orgSlug).toBe('acme');
    // Verify trace propagation
    expect(lastHeaders && typeof lastHeaders['traceparent']).toBe('string');
    // Verify request id propagation
    expect(lastHeaders && typeof lastHeaders['x-request-id']).toBe('string');
    // Verify custom trace id propagation
    expect(lastHeaders && typeof lastHeaders['x-trace-id']).toBe('string');
    // Verify auth propagation
    expect(lastHeaders && lastHeaders['authorization']).toBe('Bearer test-token');
  });

  it('proxies release-controls/check to backend', async () => {
    const res = await withOrgHeaders(
      request(app).post('/v1/release-controls/check').send({ orgSlug: 'acme', engagementId: 'e1' }),
    );
    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
    expect(res.body.input.orgSlug).toBe('acme');
    expect(lastHeaders && typeof lastHeaders['traceparent']).toBe('string');
    expect(lastHeaders && typeof lastHeaders['x-request-id']).toBe('string');
    expect(lastHeaders && typeof lastHeaders['x-trace-id']).toBe('string');
  });

  it('retries on transient 503 upstream and eventually succeeds', async () => {
    releaseCalls = 0;
    const res = await withOrgHeaders(
      request(app)
        .post('/v1/release-controls/check')
        .send({ orgSlug: 'acme', engagementId: 'e1', flaky: true }),
    );
    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
  });

  it('forwards incoming traceparent when provided', async () => {
    const traceparent = '00-0123456789abcdef0123456789abcdef-0123456789abcdef-01';
    const res = await withOrgHeaders(
      request(app)
        .get('/v1/autonomy/status')
        .set('traceparent', traceparent)
        .query({ orgSlug: 'acme' }),
    );
    expect(res.status).toBe(200);
    expect(lastHeaders && lastHeaders['traceparent']).toBe(traceparent);
  });

  it('proxies knowledge web-sources to backend', async () => {
    const res = await withOrgHeaders(
      request(app)
        .get('/v1/knowledge/web-sources')
        .query({ orgSlug: 'acme' }),
    );
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.sources)).toBe(true);
  });

  it('proxies documents list to backend', async () => {
    const res = await withOrgHeaders(
      request(app)
        .get('/v1/storage/documents')
        .query({ orgSlug: 'acme' }),
    );
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.documents)).toBe(true);
  });

  it('proxies documents sign to backend', async () => {
    const res = await withOrgHeaders(
      request(app)
        .post('/v1/storage/sign')
        .send({ documentId: 'd1' }),
    );
    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
  });

  it('returns 502 when upstream responds 404', async () => {
    const res = await withOrgHeaders(request(app).get('/v1/tasks').query({ orgSlug: 'acme' }));
    expect(res.status).toBe(502);
    expect(typeof res.body.error).toBe('string');
  });
});
