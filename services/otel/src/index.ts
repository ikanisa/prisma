import { diag, DiagConsoleLogger, DiagLogLevel, context, trace, SpanStatusCode } from '@opentelemetry/api';
import type { Context, Span, SpanOptions as OtelSpanOptions, Attributes, Link } from '@opentelemetry/api';
import { NodeTracerProvider } from '@opentelemetry/sdk-trace-node';
import { BatchSpanProcessor } from '@opentelemetry/sdk-trace-base';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { Resource } from '@opentelemetry/resources';
import { SemanticResourceAttributes } from '@opentelemetry/semantic-conventions';
import { registerInstrumentations } from '@opentelemetry/instrumentation';
import type { Instrumentation } from '@opentelemetry/instrumentation';
import { getTelemetryConfig, resolveTraceExporter } from '@prisma-glow/system-config';
import { createLogger, type Logger } from '@prisma-glow/logging';

type Headers = Record<string, string>;

type TraceExporter = {
  name?: string;
  resolvedEndpoint?: string | null;
  resolvedHeaders?: Headers;
};

export interface SetupOptions {
  serviceName?: string;
  environment?: string;
  version?: string;
  namespace?: string;
  exporterEndpoint?: string;
  exporterHeaders?: Headers;
  instrumentations?: Instrumentation[];
  logger?: Logger;
  diagLogLevel?: DiagLogLevel;
  disableSystemConfig?: boolean;
}

export interface SetupResult {
  serviceName: string;
  environment: string;
  exporter?: {
    name?: string;
    endpoint?: string | null;
  };
}

export interface SpanOptions {
  tracerName?: string;
  attributes?: Attributes;
  links?: Link[];
  context?: Context;
  spanOptions?: OtelSpanOptions;
}

let provider: NodeTracerProvider | null = null;
let setupPromise: Promise<SetupResult> | null = null;
let tracerName = 'app';

const defaultLogger = createLogger({ scope: 'otel' });

type ExporterDetails = {
  name?: string;
  endpoint?: string | null;
  headers?: Headers;
};

function pickExporter(
  options: SetupOptions,
  telemetryExporters: TraceExporter[],
): ExporterDetails | null {
  if (options.exporterEndpoint) {
    return {
      name: 'env',
      endpoint: options.exporterEndpoint,
      headers: options.exporterHeaders ?? {},
    };
  }

  const candidate = telemetryExporters.find((entry) => entry.resolvedEndpoint);
  if (!candidate) {
    return null;
  }

  return {
    name: candidate.name,
    endpoint: candidate.resolvedEndpoint ?? null,
    headers: candidate.resolvedHeaders ?? {},
  };
}

async function loadTelemetryConfig(disable: boolean): Promise<ReturnType<typeof getTelemetryConfig> | null> {
  if (disable) {
    return null;
  }
  try {
    return await getTelemetryConfig();
  } catch (error) {
    defaultLogger.warn('otel.telemetry_config_load_failed', {
      error: error instanceof Error ? error.message : String(error),
    });
    return null;
  }
}

export async function setupNodeOtel(options: SetupOptions = {}): Promise<SetupResult> {
  if (setupPromise) {
    return setupPromise;
  }

  setupPromise = (async () => {
    const log = options.logger ?? defaultLogger;
    const diagLevel = options.diagLogLevel ?? DiagLogLevel.ERROR;
    diag.setLogger(new DiagConsoleLogger(), diagLevel);

    const telemetry = await loadTelemetryConfig(Boolean(options.disableSystemConfig));

    const telemetryNamespace = telemetry?.namespace ?? 'prisma-glow';
    const resolvedServiceName =
      options.serviceName ||
      process.env.OTEL_SERVICE_NAME ||
      telemetry?.defaultService ||
      'application';
    const telemetryEnvironment = telemetry?.defaultEnvironmentEnv
      ? process.env[telemetry.defaultEnvironmentEnv]?.trim()
      : undefined;
    const environment =
      options.environment ||
      process.env.SENTRY_ENVIRONMENT ||
      process.env.ENVIRONMENT ||
      process.env.NODE_ENV ||
      telemetryEnvironment ||
      'development';
    const version = options.version || process.env.SERVICE_VERSION || process.env.SENTRY_RELEASE || 'dev';
    const namespace = options.namespace || telemetryNamespace;

    const telemetryExporters = telemetry?.traces?.map(resolveTraceExporter) ?? [];
    const exporter = pickExporter(options, telemetryExporters);

    const resource = new Resource({
      [SemanticResourceAttributes.SERVICE_NAME]: resolvedServiceName,
      'service.namespace': namespace,
      'deployment.environment': environment,
      'service.version': version,
    });

    provider = new NodeTracerProvider({ resource });

    if (exporter?.endpoint) {
      provider.addSpanProcessor(
        new BatchSpanProcessor(
          new OTLPTraceExporter({ url: exporter.endpoint, headers: exporter.headers })
        )
      );
    } else {
      log.warn('otel.exporter_unavailable', { reason: 'missing_endpoint' });
    }

    provider.register();

    if (options.instrumentations && options.instrumentations.length > 0) {
      registerInstrumentations({ instrumentations: options.instrumentations });
    }

    tracerName = resolvedServiceName;
    log.info('otel.initialised', {
      serviceName: resolvedServiceName,
      environment,
      exporter: exporter?.name ?? null,
      endpoint: exporter?.endpoint ?? null,
    });

    return {
      serviceName: resolvedServiceName,
      environment,
      exporter: exporter ? { name: exporter.name, endpoint: exporter.endpoint ?? null } : undefined,
    } satisfies SetupResult;
  })();

  return setupPromise;
}

export function getTracerName(): string {
  return tracerName;
}

export async function shutdownNodeOtel(): Promise<void> {
  if (!provider) {
    return;
  }
  await provider.shutdown().catch((error) => {
    const message = error instanceof Error ? error.message : String(error ?? '');
    if (message) {
      defaultLogger.warn('otel.shutdown_failed', {
        error: message,
      });
    }
  });
  provider = null;
  setupPromise = null;
}

export async function withSpan<T>(
  name: string,
  fn: (span: Span) => Promise<T> | T,
  options: SpanOptions = {},
): Promise<T> {
  const tracer = trace.getTracer(options.tracerName ?? tracerName);
  const activeContext = options.context ?? context.active();
  const spanOptions: OtelSpanOptions = {
    ...options.spanOptions,
    attributes: {
      ...options.spanOptions?.attributes,
      ...options.attributes,
    },
    links: options.links,
  };

  return await context.with(activeContext, async () => {
    return await tracer.startActiveSpan(name, spanOptions, async (span) => {
      try {
        const result = await fn(span);
        span.setStatus({ code: SpanStatusCode.OK });
        return result;
      } catch (error) {
        const err = error instanceof Error ? error : new Error(String(error));
        span.recordException(err);
        span.setStatus({ code: SpanStatusCode.ERROR, message: err.message });
        throw error;
      } finally {
        span.end();
      }
    });
  });
}
