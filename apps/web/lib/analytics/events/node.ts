type Primitive = string | number | boolean;

export type TelemetryAlertSeverity = 'INFO' | 'WARNING' | 'CRITICAL';

export class AnalyticsEventValidationError extends Error {
  errors: string[];

  constructor(name: string, errors: string[]) {
    super(`Invalid analytics event ${name}`);
    this.name = 'AnalyticsEventValidationError';
    this.errors = errors;
  }
}

export type TelemetryAlertPayload = {
  alertType: string;
  severity?: TelemetryAlertSeverity;
  message?: string;
  orgId?: string | null;
  context?: Record<string, unknown>;
  resolvedAt?: string | null;
  createdAt?: string;
};

export type TelemetryAlertEvent = {
  name: 'telemetry.alert';
  properties: {
    alertType: string;
    severity: TelemetryAlertSeverity;
    message: string;
    orgId: string | null;
    context: Record<string, unknown>;
    resolvedAt: string | null;
    createdAt: string;
  };
};

export type AutonomyTelemetryPayload = {
  orgId: string;
  module: string;
  scenario: string;
  decision?: string;
  metrics?: Record<string, unknown>;
  actor?: string | null;
  createdAt?: string;
};

export type AutonomyTelemetryEvent = {
  name: 'telemetry.autonomy_event';
  properties: {
    orgId: string;
    module: string;
    scenario: string;
    decision: string;
    metrics: Record<string, unknown>;
    actor: string | null;
    createdAt: string;
  };
};

const TELEMETRY_ALERT_SEVERITIES = new Set<TelemetryAlertSeverity>(['INFO', 'WARNING', 'CRITICAL']);

function validateTelemetryAlertPayload(payload: TelemetryAlertPayload): string[] {
  const errors: string[] = [];
  if (!payload || typeof payload !== 'object') {
    return ['payload must be an object'];
  }
  if (typeof payload.alertType !== 'string' || payload.alertType.trim().length === 0) {
    errors.push('alertType is required');
  }
  if (payload.severity && !TELEMETRY_ALERT_SEVERITIES.has(payload.severity)) {
    errors.push(`severity must be one of ${Array.from(TELEMETRY_ALERT_SEVERITIES).join(', ')}`);
  }
  if (payload.message !== undefined && typeof payload.message !== 'string') {
    errors.push('message must be a string');
  }
  if (payload.resolvedAt !== undefined && payload.resolvedAt !== null && typeof payload.resolvedAt !== 'string') {
    errors.push('resolvedAt must be a string or null');
  }
  return errors;
}

function validateAutonomyTelemetryPayload(payload: AutonomyTelemetryPayload): string[] {
  const errors: string[] = [];
  if (!payload || typeof payload !== 'object') {
    return ['payload must be an object'];
  }
  if (typeof payload.orgId !== 'string' || payload.orgId.trim().length === 0) {
    errors.push('orgId is required');
  }
  if (typeof payload.module !== 'string' || payload.module.trim().length === 0) {
    errors.push('module is required');
  }
  if (typeof payload.scenario !== 'string' || payload.scenario.trim().length === 0) {
    errors.push('scenario is required');
  }
  return errors;
}

export function buildTelemetryAlertEvent(payload: TelemetryAlertPayload): TelemetryAlertEvent {
  const errors = validateTelemetryAlertPayload(payload);
  if (errors.length > 0) {
    throw new AnalyticsEventValidationError('telemetry.alert', errors);
  }

  return {
    name: 'telemetry.alert',
    properties: {
      alertType: payload.alertType.trim(),
      severity: payload.severity ?? 'INFO',
      message: payload.message ?? '',
      orgId: payload.orgId ?? null,
      context: payload.context ?? {},
      resolvedAt: payload.resolvedAt ?? null,
      createdAt: payload.createdAt ?? new Date().toISOString(),
    },
  };
}

export function telemetryAlertRowFromEvent(event: TelemetryAlertEvent) {
  return {
    org_id: event.properties.orgId,
    alert_type: event.properties.alertType,
    severity: event.properties.severity,
    message: event.properties.message,
    context: event.properties.context,
    resolved_at: event.properties.resolvedAt,
    created_at: event.properties.createdAt,
  };
}

export function buildAutonomyTelemetryEvent(payload: AutonomyTelemetryPayload): AutonomyTelemetryEvent {
  const errors = validateAutonomyTelemetryPayload(payload);
  if (errors.length > 0) {
    throw new AnalyticsEventValidationError('telemetry.autonomy_event', errors);
  }

  return {
    name: 'telemetry.autonomy_event',
    properties: {
      orgId: payload.orgId.trim(),
      module: payload.module.trim(),
      scenario: payload.scenario.trim(),
      decision: payload.decision ?? 'ALLOWED',
      metrics: payload.metrics ?? {},
      actor: payload.actor ?? null,
      createdAt: payload.createdAt ?? new Date().toISOString(),
    },
  };
}

export function autonomyTelemetryRowFromEvent(event: AutonomyTelemetryEvent) {
  return {
    org_id: event.properties.orgId,
    module: event.properties.module,
    scenario: event.properties.scenario,
    decision: event.properties.decision,
    metrics: event.properties.metrics,
    actor: event.properties.actor,
    created_at: event.properties.createdAt,
  };
}

function toSpanAttributeValue(value: unknown): Primitive | undefined {
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    return value;
  }
  if (value === null) {
    return 'null';
  }
  if (value === undefined) {
    return undefined;
  }
  try {
    return JSON.stringify(value);
  } catch (_error) {
    return String(value);
  }
}

export function recordEventOnSpan(
  event: { name: string; properties?: Record<string, unknown> },
  span?: { addEvent: (name: string, attributes?: Record<string, Primitive>) => void },
) {
  if (!span) {
    return;
  }
  const props = event.properties ?? {};
  const attributes: Record<string, Primitive> = {};
  for (const [key, value] of Object.entries(props)) {
    const normalised = toSpanAttributeValue(value);
    if (normalised !== undefined) {
      attributes[key] = normalised;
    }
  }
  span.addEvent(event.name, Object.keys(attributes).length ? attributes : undefined);
}
