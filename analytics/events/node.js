import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import Ajv from 'ajv';

const schemaPath = fileURLToPath(new URL('./schema.json', import.meta.url));
const schema = JSON.parse(readFileSync(schemaPath, 'utf-8'));
const ajv = new Ajv({ allErrors: true, strict: false });
const validate = ajv.compile(schema);

export class AnalyticsEventValidationError extends Error {
  constructor(name, errors) {
    const details = (errors ?? []).map((error) => error.message).join('; ');
    super(`Invalid analytics event ${name}: ${details}`);
    this.name = 'AnalyticsEventValidationError';
    this.eventName = name;
    this.errors = errors ?? [];
  }
}

function assertValid(event) {
  if (!validate(event)) {
    throw new AnalyticsEventValidationError(event?.name ?? 'unknown', validate.errors ?? []);
  }
  return event;
}

export function buildTelemetryAlertEvent({ alertType, severity, message, orgId = null, context = {}, resolvedAt = null }) {
  const event = {
    name: 'telemetry.alert',
    properties: {
      alertType,
      severity: (severity ?? '').toUpperCase(),
      message,
      orgId,
      context: context ?? {},
      resolvedAt: resolvedAt ?? null,
    },
  };
  return assertValid(event);
}

export function telemetryAlertRowFromEvent(event) {
  if (event?.name !== 'telemetry.alert') {
    throw new AnalyticsEventValidationError(event?.name ?? 'unknown', [{ message: 'expected telemetry.alert event' }]);
  }
  const props = event.properties;
  return {
    org_id: props.orgId ?? null,
    alert_type: props.alertType,
    severity: props.severity,
    message: props.message,
    context: props.context ?? {},
    resolved_at: props.resolvedAt ?? null,
  };
}

export function buildAutonomyTelemetryEvent({ orgId, module, scenario, decision, metrics, actor = null }) {
  const event = {
    name: 'telemetry.autonomy_event',
    properties: {
      orgId,
      module,
      scenario,
      decision: (decision ?? '').toUpperCase(),
      metrics: metrics ?? {},
      actor: actor ?? null,
    },
  };
  return assertValid(event);
}

export function autonomyTelemetryRowFromEvent(event) {
  if (event?.name !== 'telemetry.autonomy_event') {
    throw new AnalyticsEventValidationError(event?.name ?? 'unknown', [{ message: 'expected telemetry.autonomy_event event' }]);
  }
  const props = event.properties;
  return {
    org_id: props.orgId,
    module: props.module,
    scenario: props.scenario,
    decision: props.decision,
    metrics: props.metrics,
    actor: props.actor ?? null,
  };
}

export function recordEventOnSpan(event, span) {
  if (!span) return;
  const attributes = {};
  for (const [key, value] of Object.entries(event.properties ?? {})) {
    if (value === null || value === undefined) {
      continue;
    }
    if (typeof value === 'object' && !Array.isArray(value)) {
      attributes[`event.${key}`] = JSON.stringify(value);
    } else {
      attributes[`event.${key}`] = value;
    }
  }
  span.addEvent(event.name, attributes);
}
