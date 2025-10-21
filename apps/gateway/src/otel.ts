import { NodeTracerProvider } from '@opentelemetry/sdk-trace-node';
import { BatchSpanProcessor } from '@opentelemetry/sdk-trace-base';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { Resource } from '@opentelemetry/resources';
import { SemanticResourceAttributes } from '@opentelemetry/semantic-conventions';
import { env } from './env.js';

let initialised = false;

export function initTracing() {
  if (initialised) return;
  const serviceName = env.OTEL_SERVICE_NAME || 'gateway';
  const environment = env.SENTRY_ENVIRONMENT || env.ENVIRONMENT || env.NODE_ENV || 'development';
  const version = env.SERVICE_VERSION || env.SENTRY_RELEASE || 'dev';
  const endpoint = env.OTEL_EXPORTER_OTLP_ENDPOINT;
  if (!endpoint) {
    // No exporter configured; skip setup to avoid noisy errors.
    initialised = true;
    return;
  }
  const provider = new NodeTracerProvider({
    resource: new Resource({
      [SemanticResourceAttributes.SERVICE_NAME]: serviceName,
      'service.namespace': 'prisma-glow',
      'deployment.environment': environment,
      'service.version': version,
    }),
  });
  provider.addSpanProcessor(new BatchSpanProcessor(new OTLPTraceExporter({ url: endpoint })));
  provider.register();
  initialised = true;
}
