import * as Sentry from '@sentry/nextjs';
import type { Transport, TransportOptions } from '@sentry/types';

declare global {
  // eslint-disable-next-line no-var
  var __SENTRY_TRANSPORT__: ((options: TransportOptions) => Transport) | undefined;
}

const resolveDsn = () => {
  const specific = process.env.WEB_SENTRY_DSN;
  if (specific && specific.trim().length > 0) {
    return specific;
  }
  const browser = process.env.NEXT_PUBLIC_SENTRY_DSN;
  if (browser && browser.trim().length > 0) {
    return browser;
  }
  const fallback = process.env.SENTRY_DSN;
  if (fallback && fallback.trim().length > 0) {
    return fallback;
  }
  return null;
};

const getSampleRate = () => {
  const raw =
    process.env.NEXT_PUBLIC_SENTRY_TRACES_SAMPLE_RATE ??
    process.env.SENTRY_TRACES_SAMPLE_RATE ??
    process.env.SENTRY_TRACE_SAMPLE_RATE ??
    process.env.SENTRY_SAMPLE_RATE ??
    '0';
  const parsed = Number.parseFloat(raw);
  if (Number.isFinite(parsed) && parsed >= 0 && parsed <= 1) {
    return parsed;
  }
  return 0;
};

const configureSentry = () => {
  const dsn = resolveDsn();
  if (!dsn) {
    return;
  }

  const existingClient = Sentry.getCurrentHub().getClient();
  if (existingClient) {
    return;
  }

  const environment =
    process.env.NEXT_PUBLIC_SENTRY_ENVIRONMENT ??
    process.env.SENTRY_ENVIRONMENT ??
    process.env.ENVIRONMENT ??
    process.env.NODE_ENV ??
    'development';

  const release =
    process.env.NEXT_PUBLIC_SENTRY_RELEASE ??
    process.env.SENTRY_RELEASE ??
    process.env.SERVICE_VERSION ??
    undefined;

  const transportFactory = globalThis?.__SENTRY_TRANSPORT__;

  Sentry.init({
    dsn,
    environment,
    release,
    tracesSampleRate: getSampleRate(),
    transport: typeof transportFactory === 'function' ? transportFactory : undefined,
    beforeBreadcrumb(breadcrumb, hint) {
      if (breadcrumb.category === 'console' && hint?.data?.arguments) {
        try {
          breadcrumb.message = hint.data.arguments
            .map((argument: unknown) => {
              if (typeof argument === 'string') {
                return argument;
              }
              return JSON.stringify(argument);
            })
            .join(' ');
        } catch {
          // ignore serialization issues
        }
      }
      return breadcrumb;
    },
  });
};

configureSentry();

export { Sentry };
