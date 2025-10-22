import { NodeTracerProvider } from '@opentelemetry/sdk-trace-node';
import { BatchSpanProcessor } from '@opentelemetry/sdk-trace-base';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { Resource } from '@opentelemetry/resources';
import { SemanticResourceAttributes } from '@opentelemetry/semantic-conventions';
import { getTelemetryConfig, resolveTraceExporter } from '@prisma-glow/system-config';
import { logInfo, logWarn } from '../logger.js';
import { env } from './env.js';

let initialised = false;
let tracerServiceName = env.OTEL_SERVICE_NAME || 'gateway';

export function getTracerServiceName(): string {
  return tracerServiceName;
}

export async function initTracing(): Promise<void> {
  if (initialised) return;

  try {
    const telemetry = await getTelemetryConfig();
    tracerServiceName = env.OTEL_SERVICE_NAME || telemetry.defaultService || 'gateway';
    const environment =
      env.SENTRY_ENVIRONMENT ||
      env.ENVIRONMENT ||
      (telemetry.defaultEnvironmentEnv ? process.env[telemetry.defaultEnvironmentEnv]?.trim() : undefined) ||
      env.NODE_ENV ||
      'development';
    const version = env.SERVICE_VERSION || env.SENTRY_RELEASE || 'dev';

    const resolvedExporters = telemetry.traces.map(resolveTraceExporter);
    const exporter = resolvedExporters.find((candidate) => candidate.resolvedEndpoint);
    if (!exporter || !exporter.resolvedEndpoint) {
      logWarn('gateway.telemetry.disabled', {
        reason: 'no_exporter',
      });
      initialised = true;
      return;
    }

    const provider = new NodeTracerProvider({
      resource: new Resource({
        [SemanticResourceAttributes.SERVICE_NAME]: tracerServiceName,
        'service.namespace': telemetry.namespace,
        'deployment.environment': environment,
        'service.version': version,
      }),
    });

    provider.addSpanProcessor(
      new BatchSpanProcessor(
        new OTLPTraceExporter({ url: exporter.resolvedEndpoint, headers: exporter.resolvedHeaders })
      )
    );
    provider.register();
    logInfo('gateway.telemetry.initialised', {
      exporter: exporter.name,
      endpoint: exporter.resolvedEndpoint,
    });
  } catch (error) {
    logWarn('gateway.telemetry.init_failed', {
      error: error instanceof Error ? error.message : String(error),
    });
  } finally {
    initialised = true;
  }
}
