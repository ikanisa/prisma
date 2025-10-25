/* @vitest-environment node */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { AddressInfo } from 'node:net';

vi.mock('@prisma-glow/system-config', () => ({
  DEFAULT_ROLE_HIERARCHY: ['ADMIN', 'MANAGER', 'USER'],
  createSystemConfigAccessor: () => ({
    withConfig: async (handler: (config: Record<string, unknown>) => unknown) => handler({}),
  }),
}));

vi.mock('@prisma-glow/analytics', () => ({
  createAnalyticsClient: () => ({ track: vi.fn(), identify: vi.fn() }),
}));

describe('gateway sentry breadcrumbs', () => {
  let events: unknown[];

  beforeEach(() => {
    vi.resetModules();
    events = [];
    process.env.NODE_ENV = 'test';
    process.env.SENTRY_DSN = 'https://examplePublicKey@sentry.io/13579';
    process.env.SENTRY_ENVIRONMENT = 'test';
    process.env.SENTRY_RELEASE = 'vitest';

    (globalThis as any).__SENTRY_TRANSPORT__ = () => {
      return {
        send: async (event: unknown) => {
          events.push(event);
          return {} as any;
        },
        flush: async () => true,
        recordLostEvent: () => false,
      };
    };

    vi.doMock('../../apps/gateway/src/routes/v1.ts', async () => {
      const express = (await import('express')).default;
      const router = express.Router();
      router.get('/boom', () => {
        throw new Error('simulated gateway failure');
      });
      return { default: router };
    });
  });

  afterEach(() => {
    delete process.env.SENTRY_DSN;
    delete process.env.SENTRY_ENVIRONMENT;
    delete process.env.SENTRY_RELEASE;
    delete (globalThis as any).__SENTRY_TRANSPORT__;
    vi.resetModules();
    vi.doUnmock('../../apps/gateway/src/routes/v1.ts');
  });

  it('captures request breadcrumbs for failing routes', async () => {
    const Sentry = await import('@sentry/node');
    const { createGatewayServer } = await import('../../apps/gateway/src/server.js');
    const app = createGatewayServer();

    const server = app.listen(0);
    const port = (server.address() as AddressInfo).port;

    const response = await fetch(`http://127.0.0.1:${port}/v1/boom`, {
      headers: {
        'x-request-id': 'req-sentry-breadcrumb',
        'x-org-id': 'org-123',
        'x-user-id': 'user-456',
        'x-org-memberships': 'org-123:admin',
      },
    });

    expect(response.status).toBe(500);
    await new Promise<void>((resolve) => server.close(() => resolve()));

    await Sentry.flush(1000);

    expect(events.length).toBeGreaterThanOrEqual(1);
    const envelope = events[events.length - 1] as any;
    const items = Array.isArray(envelope?.[1]) ? envelope[1] : [];
    const payload = items?.[0]?.[1] ?? {};
    const exceptionMessage = payload?.exception?.values?.[0]?.value ?? '';
    expect(exceptionMessage).toContain('simulated gateway failure');

    const breadcrumbs = Array.isArray(payload.breadcrumbs) ? payload.breadcrumbs : [];
    const requestBreadcrumb = breadcrumbs.find((crumb: any) => crumb?.category === 'request');
    expect(requestBreadcrumb).toBeDefined();
    expect(requestBreadcrumb?.message).toBe('GET /v1/boom');
    expect(requestBreadcrumb?.data).toMatchObject({
      path: '/v1/boom',
      method: 'GET',
      requestId: 'req-sentry-breadcrumb',
    });
  });
});
