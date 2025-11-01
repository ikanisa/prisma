import { afterEach, describe, expect, it } from 'vitest';
import { setupNodeOtel, withSpan, shutdownNodeOtel } from '@prisma-glow/otel';
import { trace } from '@opentelemetry/api';

const TEST_EXPORTER_ENDPOINT = 'http://localhost:4318/v1/traces';

afterEach(async () => {
  await shutdownNodeOtel();
});

describe('otel setup smoke', () => {
  it('initialises a tracer provider and records spans', async () => {
    const result = await setupNodeOtel({
      serviceName: 'test-gateway',
      environment: 'test',
      version: 'sha',
      exporterEndpoint: TEST_EXPORTER_ENDPOINT,
    });

    expect(result.serviceName).toBe('test-gateway');
    const tracer = trace.getTracer(result.serviceName);

    await expect(
      withSpan('observability.smoke', async (span) => {
        span.setAttribute('smoke', true);
        expect(span.spanContext().traceId).toHaveLength(32);
      }),
    ).resolves.not.toThrow();

    const span = tracer.startSpan('manual');
    expect(span.spanContext().traceId).toHaveLength(32);
    span.end();
  });
});
