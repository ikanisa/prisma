import { NextRequest, NextResponse } from 'next/server';
import {
  AccountingModule,
  ModuleInput,
  ModuleExecutionResult,
  ApprovalDecision,
  ApprovalDecisionState,
} from './types';
import { ModuleHandler } from './workflows';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isDecision(value: unknown): value is ApprovalDecisionState {
  return value === 'approved' || value === 'rejected' || value === 'pending';
}

function parseApprovals(value: unknown): ApprovalDecision[] | undefined {
  if (!Array.isArray(value)) {
    return undefined;
  }

  const approvals: ApprovalDecision[] = [];
  for (const item of value) {
    if (!isRecord(item)) {
      continue;
    }

    const decision = item.decision;
    if (!isDecision(decision)) {
      continue;
    }

    approvals.push({
      approverId:
        typeof item.approverId === 'string' && item.approverId.trim()
          ? item.approverId.trim()
          : undefined,
      role:
        typeof item.role === 'string' && item.role.trim()
          ? item.role.trim()
          : undefined,
      decision,
      notes:
        typeof item.notes === 'string' && item.notes.trim()
          ? item.notes.trim()
          : undefined,
      decidedAt:
        typeof item.decidedAt === 'string' && item.decidedAt.trim()
          ? item.decidedAt.trim()
          : undefined,
    });
  }

  return approvals;
}

function normalisePayload(value: unknown): Record<string, unknown> | undefined {
  if (!value) {
    return undefined;
  }
  if (isRecord(value)) {
    return value;
  }
  return undefined;
}

export async function handleModuleRequest(
  request: NextRequest,
  module: AccountingModule,
  handler: ModuleHandler,
) {
  let body: unknown;
  try {
    body = await request.json();
  } catch (error) {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  if (!isRecord(body)) {
    return NextResponse.json({ error: 'Body must be a JSON object' }, { status: 400 });
  }

  const { orgId, actorId } = body;

  if (typeof orgId !== 'string' || !orgId.trim()) {
    return NextResponse.json({ error: 'orgId is required' }, { status: 400 });
  }

  if (typeof actorId !== 'string' || !actorId.trim()) {
    return NextResponse.json({ error: 'actorId is required' }, { status: 400 });
  }

  const payload = normalisePayload(body.payload) ?? {};
  const metadata = normalisePayload(body.metadata) ?? {};
  const approvals = parseApprovals(body.approvals);

  const input: ModuleInput = {
    orgId: orgId.trim(),
    actorId: actorId.trim(),
    payload,
    approvals,
    metadata,
  };

  try {
    const result: ModuleExecutionResult = handler(input);
    return NextResponse.json({
      module: result.module,
      status: result.status,
      summary: result.summary,
      approvals: result.approvals,
      trace: result.trace,
      metrics: result.metrics,
      nextSteps: result.nextSteps,
      context: result.context,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Unexpected error',
        module,
      },
      { status: 500 },
    );
  }
}
