# Agent Guardrails

This document captures the policy gates, telemetry hooks, and validation routines that protect the Prisma Glow agent runtime.

## Tool allow list enforcement

Tool usage is governed by the allow-list definitions in `services/agents/policy/allow-list.ts`. Each entry specifies the
roles that may invoke a tool alongside contextual flags that must be present (or absent) before execution. The
`enforceToolPolicy` helper filters disallowed tool intents from generated plans and emits structured violations for review.

When updating the allow list:

1. Document the new capability and expected role requirements in `allow-list.ts`.
2. Extend the golden task coverage in `services/agents/tests/golden-plan.test.ts` to exercise the new rules.
3. Re-run the harness with `pnpm test --filter "services/agents/tests"` to ensure the regression suite stays green.

## Prompt manifest workflow

Planner prompts now live under `packages/agents/prompts/` and are tracked through a manifest with immutable checksums. The
utilities in `packages/agents/src/prompts.ts` verify the manifest before the guardrail harness instantiates, preventing
accidental edits from bypassing code review. When editing a prompt:

1. Update the prompt file in `packages/agents/prompts/`.
2. Recalculate the SHA-256 checksum (`sha256sum <file>`) and update `manifest.json`.
3. Commit both the prompt change and the manifest update together so the checksum verification remains consistent.

## Guardrail telemetry

Guardrail outcomes are sent to the OpenTelemetry pipeline via `emitGuardrailTelemetry`. The helper annotates the active span
(or creates a new one) with violation counts and detailed events, and forwards structured logs through the optional logger
interface. Instrumentation ensures downstream dashboards capture the distinction between successful policy evaluations and
blocked tool usage.

Operational steps for telemetry updates:

1. Provide a logger that implements `info`/`warn` when integrating with application services so guardrail decisions are traced
   in application logs.
2. Ensure the OTEL exporter for the service is configured (see `services/rag/index.ts` for an example) so span attributes and
   events propagate to the observability stack.
3. Tag spans with meaningful metadata (e.g., organization, engagement, persona) through the `additionalAttributes` option
   when invoking `enforceToolPolicy`.

## Evaluation harness

The guardrail evaluation harness (`services/agents/tests/harness.ts`) validates prompt integrity, detects common prompt
injection phrases, and executes golden tasks to confirm allow-list enforcement. The suite must pass before deploying any
changes that touch agent prompts, policy definitions, or telemetry wiring.
