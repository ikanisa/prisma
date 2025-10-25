/* @vitest-environment node */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

describe('web sentry breadcrumbs', () => {
  let events: unknown[];

  beforeEach(() => {
    vi.resetModules();
    events = [];
    process.env.NODE_ENV = 'test';
    process.env.WEB_SENTRY_DSN = 'https://examplePublicKey@sentry.io/67890';
    process.env.NEXT_PUBLIC_SENTRY_DSN = 'https://examplePublicKey@sentry.io/67890';
    process.env.SENTRY_ENVIRONMENT = 'test';
    process.env.SENTRY_RELEASE = 'vitest-web';

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
  });

  afterEach(() => {
    delete process.env.WEB_SENTRY_DSN;
    delete process.env.NEXT_PUBLIC_SENTRY_DSN;
    delete process.env.SENTRY_ENVIRONMENT;
    delete process.env.SENTRY_RELEASE;
    delete (globalThis as any).__SENTRY_TRANSPORT__;
    vi.resetModules();
  });

  it('adds breadcrumbs to captured exceptions', async () => {
    const { Sentry } = await import('../../apps/web/src/main');

    Sentry.addBreadcrumb({ category: 'user-action', message: 'clicked open dialog' });
    const error = new Error('web sentry test');
    Sentry.captureException(error);
    await Sentry.flush(1000);

    expect(events.length).toBeGreaterThan(0);
    const envelope = events[events.length - 1] as any;
    const items = Array.isArray(envelope?.[1]) ? envelope[1] : [];
    const payload = items?.[0]?.[1] ?? {};
    const breadcrumbs = Array.isArray(payload.breadcrumbs) ? payload.breadcrumbs : [];
    const messages = breadcrumbs.map((crumb: any) => crumb?.message).filter(Boolean);
    expect(messages).toContain('clicked open dialog');
  });
});
