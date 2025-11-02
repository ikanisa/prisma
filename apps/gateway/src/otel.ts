import { setupNodeOtel, getTracerName } from '@prisma-glow/otel';
import { logger } from '@prisma-glow/logging';
import { env } from './env.js';

let initialised = false;

export function getTracerServiceName(): string {
  return getTracerName();
}

export async function initTracing(): Promise<void> {
  if (initialised) return;

  try {
    const environment = env.SENTRY_ENVIRONMENT || env.ENVIRONMENT || env.NODE_ENV;
    const version = env.SERVICE_VERSION || env.SENTRY_RELEASE;

    await setupNodeOtel({
      serviceName: env.OTEL_SERVICE_NAME || 'gateway',
      environment,
      version,
      logger: logger.child({ scope: 'gateway' }),
    });
  } catch (error) {
    logger.warn('gateway.telemetry.init_failed', {
      error: error instanceof Error ? error.message : String(error),
    });
  } finally {
    initialised = true;
  }
}
