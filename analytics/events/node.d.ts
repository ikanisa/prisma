export interface TelemetryAlertEvent {
  name: 'telemetry.alert';
  properties: {
    alertType: string;
    severity: 'INFO' | 'WARNING' | 'ERROR' | 'CRITICAL';
    message: string;
    orgId: string | null;
    context: Record<string, unknown>;
    resolvedAt: string | null;
  };
}

export interface AutonomyTelemetryEvent {
  name: 'telemetry.autonomy_event';
  properties: {
    orgId: string;
    module: string;
    scenario: string;
    decision: 'APPROVED' | 'REVIEW' | 'REFUSED';
    metrics: Record<string, unknown>;
    actor: string | null;
  };
}

export type AnalyticsEvent = TelemetryAlertEvent | AutonomyTelemetryEvent;

export class AnalyticsEventValidationError extends Error {
  constructor(name: string, errors?: Array<{ message?: string } | string>);
  eventName: string;
  errors: Array<{ message?: string } | string>;
}

export function buildTelemetryAlertEvent(input: {
  alertType: string;
  severity: string;
  message: string;
  orgId?: string | null;
  context?: Record<string, unknown> | null;
  resolvedAt?: string | null;
}): TelemetryAlertEvent;

export function telemetryAlertRowFromEvent(event: AnalyticsEvent): {
  org_id: string | null;
  alert_type: string;
  severity: string;
  message: string;
  context: Record<string, unknown>;
  resolved_at: string | null;
};

export function buildAutonomyTelemetryEvent(input: {
  orgId: string;
  module: string;
  scenario: string;
  decision: string;
  metrics: Record<string, unknown>;
  actor?: string | null;
}): AutonomyTelemetryEvent;

export function autonomyTelemetryRowFromEvent(event: AnalyticsEvent): {
  org_id: string;
  module: string;
  scenario: string;
  decision: string;
  metrics: Record<string, unknown>;
  actor: string | null;
};

export function recordEventOnSpan(event: AnalyticsEvent, span?: { addEvent: (name: string, attributes?: Record<string, unknown>) => void }): void;
