import Ajv from 'ajv';
import addFormats from 'ajv-formats';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const schema = require('./schema/analytics-event.schema.json');

const ajv = new Ajv({ allErrors: true, removeAdditional: false, useDefaults: true });
addFormats(ajv);
const validate = ajv.compile(schema);

function ensureTimestamp(event) {
  if (!event.timestamp) {
    event.timestamp = new Date().toISOString();
  }
  return event;
}

export function normaliseEvent(event, defaults = {}) {
  const enriched = { ...defaults, ...event };
  if (enriched.tags == null) {
    enriched.tags = [];
  }
  if (enriched.properties == null) {
    enriched.properties = {};
  }
  if (enriched.context == null) {
    enriched.context = {};
  }
  if (enriched.metadata == null) {
    enriched.metadata = {};
  }

  const valid = validate(enriched);
  if (!valid) {
    const details = (validate.errors ?? []).map((error) => `${error.instancePath || 'event'} ${error.message}`).join('; ');
    const validationError = new Error(`Invalid analytics event: ${details || 'unknown error'}`);
    validationError.errors = validate.errors;
    throw validationError;
  }

  return ensureTimestamp(enriched);
}

export function createAnalyticsClient(options = {}) {
  const endpoint = (options.endpoint ?? process.env.ANALYTICS_SERVICE_URL ?? '').trim();
  const apiKey = (options.apiKey ?? process.env.ANALYTICS_SERVICE_TOKEN ?? '').trim();
  const service = options.service ?? process.env.OTEL_SERVICE_NAME ?? 'analytics-client';
  const environment =
    options.environment ??
    process.env.SENTRY_ENVIRONMENT ??
    process.env.ENVIRONMENT ??
    process.env.NODE_ENV ??
    'development';
  const onError = typeof options.onError === 'function' ? options.onError : undefined;

  async function record(event) {
    if (!endpoint) {
      return;
    }

    const payload = normaliseEvent(event, { service });
    if (environment && !payload.metadata.environment) {
      payload.metadata.environment = environment;
    }

    const url = endpoint.endsWith('/') ? `${endpoint.slice(0, -1)}/v1/analytics/events` : `${endpoint}/v1/analytics/events`;

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          ...(apiKey ? { authorization: `Bearer ${apiKey}` } : {}),
        },
        body: JSON.stringify(payload),
      });
      if (!response.ok) {
        const text = await response.text();
        throw new Error(`Analytics service responded with ${response.status}: ${text}`);
      }
    } catch (error) {
      if (onError) {
        onError(error, payload);
      } else if (process.env.NODE_ENV !== 'production') {
        console.warn('analytics.record_failed', error);
      }
    }
  }

  return { record };
}

export { schema };
