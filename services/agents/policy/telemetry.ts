import { SpanStatusCode, trace } from '@opentelemetry/api';

import type { ToolPolicyResult } from './tool-policy.js';

export interface GuardrailTelemetryLogger {
  info?: (message: string, meta?: Record<string, unknown>) => void;
  warn?: (message: string, meta?: Record<string, unknown>) => void;
}

export interface GuardrailTelemetryOptions {
  logger?: GuardrailTelemetryLogger;
  spanName?: string;
  additionalAttributes?: Record<string, unknown>;
}

export function emitGuardrailTelemetry(result: ToolPolicyResult, options: GuardrailTelemetryOptions = {}): void {
  const tracer = trace.getTracer('services.agents.policy');
  const activeSpan = trace.getActiveSpan();
  const span = activeSpan ?? tracer.startSpan(options.spanName ?? 'agent.guardrail.evaluate');
  const createdSpan = activeSpan ? false : true;

  span.setAttribute('agent.guardrail.violation.count', result.violations.length);
  span.setAttribute('agent.guardrail.allowed.count', result.allowedTools.length);
  span.setAttribute('agent.guardrail.blocked.count', result.blockedTools.length);
  span.setAttribute('agent.guardrail.plan.steps', result.plan.steps.length);

  if (options.additionalAttributes) {
    for (const [key, value] of Object.entries(options.additionalAttributes)) {
      span.setAttribute(key, value as never);
    }
  }

  if (result.violations.length > 0) {
    for (const violation of result.violations) {
      span.addEvent('agent.guardrail.violation', {
        toolKey: violation.toolKey,
        stepIndex: violation.stepIndex,
        reason: violation.reason,
        code: violation.code,
        requiredRole: violation.requiredRole ?? 'n/a',
      });
    }
    span.setStatus({ code: SpanStatusCode.ERROR, message: 'Guardrail violations detected' });
    options.logger?.warn?.('agent.guardrail.violation_detected', {
      violations: result.violations,
      blockedTools: result.blockedTools,
    });
  } else {
    span.addEvent('agent.guardrail.pass', {
      allowedTools: result.allowedTools,
    });
    options.logger?.info?.('agent.guardrail.passed', {
      allowedTools: result.allowedTools,
    });
  }

  if (createdSpan) {
    span.end();
  }
}
