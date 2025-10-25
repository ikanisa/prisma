import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import supertest from 'supertest';

const ORG_ID = '11111111-2222-3333-4444-555555555555';
const USER_ID = '99999999-aaaa-bbbb-cccc-dddddddddddd';
const MEMBERSHIP = `${ORG_ID}:ADMIN`;

async function createServer(allowedOrigins = 'https://allowed.example.com') {
  process.env.NODE_ENV = 'test';
  process.env.API_ALLOWED_ORIGINS = allowedOrigins;
  const { default: createGatewayServer } = await import('../../apps/gateway/src/server.js');
  return createGatewayServer();
}

describe('Gateway integration', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  afterEach(() => {
    delete process.env.API_ALLOWED_ORIGINS;
  });

  it('enforces rate limits after the configured capacity is reached', async () => {
    const app = await createServer();
    const agent = supertest(app);

    for (let i = 0; i < 60; i += 1) {
      await agent
        .get('/v1/health')
        .set('origin', 'https://allowed.example.com')
        .set('x-org-id', ORG_ID)
        .set('x-user-id', USER_ID)
        .set('x-org-memberships', MEMBERSHIP)
        .expect(200);
    }

    const blocked = await agent
      .get('/v1/health')
      .set('origin', 'https://allowed.example.com')
      .set('x-org-id', ORG_ID)
      .set('x-user-id', USER_ID)
      .set('x-org-memberships', MEMBERSHIP)
      .expect(429);

    expect(blocked.body).toEqual(
      expect.objectContaining({ error: 'rate_limit_exceeded', retryAfterSeconds: expect.any(Number) }),
    );
    expect(blocked.headers['retry-after']).toBeDefined();
  });

  it('rejects requests from origins outside the allow list', async () => {
    const app = await createServer('https://allowed.example.com');
    const agent = supertest(app);

    const response = await agent
      .get('/v1/health')
      .set('origin', 'https://forbidden.example.com')
      .set('x-org-id', ORG_ID)
      .set('x-user-id', USER_ID)
      .set('x-org-memberships', MEMBERSHIP)
      .expect(403);

    expect(response.body).toEqual({ error: 'cors_origin_not_allowed' });
  });
});
