export class AnalyticsEventValidationError extends Error {
  constructor(name: string, errors?: unknown[]) {
    super(`Invalid analytics event ${name}`);
    this.name = 'AnalyticsEventValidationError';
    this.errors = errors ?? [];
  }

  errors: unknown[];
}

export function buildTelemetryAlertEvent(payload: any) {
  return {
    name: 'telemetry.alert',
    properties: {
      alertType: payload.alertType,
      severity: payload.severity ?? 'INFO',
      message: payload.message ?? '',
      orgId: payload.orgId ?? null,
      context: payload.context ?? {},
      resolvedAt: payload.resolvedAt ?? null,
    },
  };
}

export function telemetryAlertRowFromEvent(event: any) {
  return {
    org_id: event.properties?.orgId ?? null,
    alert_type: event.properties?.alertType ?? 'UNKNOWN',
    severity: event.properties?.severity ?? 'INFO',
    message: event.properties?.message ?? '',
    context: event.properties?.context ?? {},
    resolved_at: event.properties?.resolvedAt ?? null,
  };
}

export function buildAutonomyTelemetryEvent(payload: any) {
  return {
    name: 'telemetry.autonomy_event',
    properties: {
      orgId: payload.orgId,
      module: payload.module,
      scenario: payload.scenario,
      decision: payload.decision ?? 'ALLOWED',
      metrics: payload.metrics ?? {},
      actor: payload.actor ?? null,
    },
  };
}

export function autonomyTelemetryRowFromEvent(event: any) {
  return {
    org_id: event.properties?.orgId ?? null,
    module: event.properties?.module ?? 'UNKNOWN',
    scenario: event.properties?.scenario ?? 'UNKNOWN',
    decision: event.properties?.decision ?? 'ALLOWED',
    metrics: event.properties?.metrics ?? {},
    actor: event.properties?.actor ?? null,
  };
}

export function recordEventOnSpan() {
  // no-op stub to satisfy instrumentation in tests
}
