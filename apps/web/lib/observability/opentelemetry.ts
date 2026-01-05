/**
 * OpenTelemetry Integration
 * 
 * Distributed tracing with OpenTelemetry
 */

import { NodeSDK } from '@opentelemetry/sdk-node';
import { OTLPTraceExporter } from '@opentelemetry/exporter-otlp-http';
import { HttpInstrumentation } from '@opentelemetry/instrumentation-http';
import { Resource } from '@opentelemetry/resources';
import { SemanticResourceAttributes } from '@opentelemetry/semantic-conventions';
import { BatchSpanProcessor } from '@opentelemetry/sdk-trace-base';

let sdk: NodeSDK | null = null;

/**
 * Initialize OpenTelemetry SDK
 */
export function initializeOpenTelemetry(): void {
  if (sdk) {
    console.log('OpenTelemetry already initialized');
    return;
  }

  if (process.env.NODE_ENV === 'test') {
    console.log('Skipping OpenTelemetry initialization in test environment');
    return;
  }

  const serviceName = process.env.OTEL_SERVICE_NAME || 'prisma-glow';
  const serviceVersion = process.env.APP_VERSION || '1.0.0';

  // Choose exporter based on configuration
  const traceExporter = process.env.OTEL_EXPORTER_OTLP_ENDPOINT
    ? new OTLPTraceExporter({
        url: process.env.OTEL_EXPORTER_OTLP_ENDPOINT,
      })
    : null;

  if (!traceExporter) {
    console.warn('No trace exporter configured. Tracing will be disabled.');
    return;
  }

  sdk = new NodeSDK({
    resource: new Resource({
      [SemanticResourceAttributes.SERVICE_NAME]: serviceName,
      [SemanticResourceAttributes.SERVICE_VERSION]: serviceVersion,
      [SemanticResourceAttributes.DEPLOYMENT_ENVIRONMENT]: process.env.NODE_ENV || 'development',
    }),
    traceExporter,
    spanProcessor: new BatchSpanProcessor(traceExporter),
    instrumentations: [
      new HttpInstrumentation({
        enabled: true,
      }),
    ],
  });

  sdk.start();
  console.log(`OpenTelemetry initialized for service: ${serviceName}`);
}

/**
 * Shutdown OpenTelemetry SDK
 */
export async function shutdownOpenTelemetry(): Promise<void> {
  if (sdk) {
    await sdk.shutdown();
    sdk = null;
    console.log('OpenTelemetry shutdown complete');
  }
}

// Auto-initialize in production
if (process.env.NODE_ENV === 'production' && process.env.OTEL_ENABLED !== 'false') {
  initializeOpenTelemetry();
}

export { sdk };

