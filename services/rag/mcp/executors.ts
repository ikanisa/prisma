import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '../types/supabase.js';

import { extractVisionOcr } from '../openai-vision.js';

export interface TaskExecutionContext {
  supabase: SupabaseClient<Database>;
  logInfo?: (message: string, meta?: Record<string, unknown>) => void;
  logError: (message: string, error: unknown, meta?: Record<string, unknown>) => void;
}

export interface TaskExecutorResult {
  status: 'success' | 'error';
  output?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
}

export type TaskExecutor = (options: {
  input: Record<string, unknown> | undefined;
  context: TaskExecutionContext;
  sessionId: string;
  taskId: string;
}) => Promise<TaskExecutorResult>;

const DEFAULT_EMPTY_RESULT: TaskExecutorResult = {
  status: 'success',
  output: {
    note: 'Executor did not produce output.',
  },
  metadata: {
    executor: 'default',
  },
};

const auditRiskSummaryExecutor: TaskExecutor = async ({ input, context, sessionId, taskId }) => {
  try {
    const orgId = typeof input?.orgId === 'string' ? input.orgId : null;
    const engagementId = typeof input?.engagementId === 'string' ? input.engagementId : null;

    if (!orgId || !engagementId) {
      return {
        status: 'error',
        output: {
          error: 'orgId and engagementId are required for audit risk summary tasks.',
        },
      };
    }

    const [{ data: risks, error: riskError }, { data: responses, error: responseError }] = await Promise.all([
      context.supabase
        .from('audit_risks')
        .select('id, title, category, inherent_rating, residual_rating, status')
        .eq('org_id', orgId)
        .eq('engagement_id', engagementId)
        .limit(100),
      context.supabase
        .from('audit_responses')
        .select('id, risk_id, response_type, status')
        .eq('org_id', orgId)
        .eq('engagement_id', engagementId)
        .limit(200),
    ]);

    if (riskError) throw riskError;
    if (responseError) throw responseError;

    let highResidualCount = 0;
    let unresolvedResponseCount = 0;

    const riskSummaries = (risks ?? []).map((risk) => {
      const linkedResponses = (responses ?? []).filter((response) => response.risk_id === risk.id);
      if (risk.residual_rating === 'HIGH' || risk.residual_rating === 'SIGNIFICANT') {
        highResidualCount += 1;
      }
      unresolvedResponseCount += linkedResponses.filter((resp) => resp.status !== 'COMPLETED').length;
      return {
        id: risk.id,
        title: risk.title,
        category: risk.category,
        inherentRating: risk.inherent_rating,
        residualRating: risk.residual_rating,
        status: risk.status,
        responseSummary: {
          total: linkedResponses.length,
          byType: linkedResponses.reduce<Record<string, number>>((acc, resp) => {
            const type = resp.response_type ?? 'UNKNOWN';
            acc[type] = (acc[type] ?? 0) + 1;
            return acc;
          }, {}),
          open: linkedResponses.filter((resp) => resp.status !== 'COMPLETED').length,
        },
      };
    });

    context.logInfo?.('mcp.executor.audit_risk_summary', {
      sessionId,
      taskId,
      riskCount: riskSummaries.length,
    });

    return {
      status: 'success',
      output: {
        orgId,
        engagementId,
        riskCount: riskSummaries.length,
        risks: riskSummaries,
        generatedAt: new Date().toISOString(),
      },
      metadata: {
        executor: 'audit-risk-summary',
        riskCount: riskSummaries.length,
        highResidualCount,
        unresolvedResponseCount,
      },
    };
  } catch (error) {
    context.logError('mcp.executor.audit_risk_summary_failed', error, { sessionId, taskId });
    return {
      status: 'error',
      output: {
        error: error instanceof Error ? error.message : 'Unknown error in audit risk summary executor',
      },
      metadata: {
        executor: 'audit-risk-summary',
        error: true,
      },
    };
  }
};

const auditEvidenceSummaryExecutor: TaskExecutor = async ({ input, context, sessionId, taskId }) => {
  try {
    const orgId = typeof input?.orgId === 'string' ? input.orgId : null;
    const engagementId = typeof input?.engagementId === 'string' ? input.engagementId : null;

    if (!orgId || !engagementId) {
      return {
        status: 'error',
        output: {
          error: 'orgId and engagementId are required for audit evidence summary tasks.',
        },
        metadata: {
          executor: 'audit-evidence-summary',
        },
      };
    }

    const { data: evidenceRows, error } = await context.supabase
      .from('audit_evidence')
      .select('id, procedure_id, description, obtained_at, document_id, workpaper_id')
      .eq('org_id', orgId)
      .eq('engagement_id', engagementId)
      .limit(500);

    if (error) throw error;

    const evidence = evidenceRows ?? [];
    const total = evidence.length;
    const byProcedure: Record<string, number> = {};
    let withDocuments = 0;
    let missingDocuments = 0;

    for (const row of evidence) {
      if (row.document_id) withDocuments += 1;
      else missingDocuments += 1;
      const procedureKey = row.procedure_id ?? 'UNASSIGNED';
      byProcedure[procedureKey] = (byProcedure[procedureKey] ?? 0) + 1;
    }

    context.logInfo?.('mcp.executor.audit_evidence_summary', {
      sessionId,
      taskId,
      evidenceCount: total,
    });

    return {
      status: 'success',
      output: {
        orgId,
        engagementId,
        evidenceCount: total,
        evidenceWithDocuments: withDocuments,
        byProcedure,
        generatedAt: new Date().toISOString(),
      },
      metadata: {
        executor: 'audit-evidence-summary',
        evidenceCount: total,
        evidenceWithDocuments: withDocuments,
        evidenceMissingDocuments: missingDocuments,
      },
    };
  } catch (error) {
    context.logError('mcp.executor.audit_evidence_summary_failed', error, { sessionId, taskId });
    return {
      status: 'error',
      output: {
        error: error instanceof Error ? error.message : 'Unknown error in audit evidence summary executor',
      },
      metadata: {
        executor: 'audit-evidence-summary',
        error: true,
      },
    };
  }
};

const documentVisionOcrExecutor: TaskExecutor = async ({ input, context, sessionId, taskId }) => {
  const url = typeof input?.url === 'string' ? input.url.trim() : '';
  const instructions = typeof input?.instructions === 'string' ? input.instructions : undefined;
  const language = typeof input?.language === 'string' && input.language.trim().length > 0
    ? `Respond in ${input.language.trim()} and preserve accents where applicable.`
    : undefined;
  const model = typeof input?.model === 'string' ? input.model : undefined;

  if (!url) {
    return {
      status: 'error',
      output: {
        error: 'Input "url" is required to run document OCR.',
      },
      metadata: {
        executor: 'document-vision-ocr',
      },
    };
  }

  try {
    const result = await extractVisionOcr({
      imageUrl: url,
      instructions,
      languageHint: language,
      model,
      logInfo: context.logInfo
        ? (message, meta) => context.logInfo?.(message, { sessionId, taskId, ...meta })
        : undefined,
      logError: (message, error, meta) => context.logError(message, error, { sessionId, taskId, ...meta }),
    });

    const textLength = result.text.length;

    return {
      status: 'success',
      output: {
        text: result.text,
        model: result.model,
        usage: result.usage ?? null,
        sourceUrl: url,
        generatedAt: new Date().toISOString(),
      },
      metadata: {
        executor: 'document-vision-ocr',
        textLength,
      },
    };
  } catch (error) {
    context.logError('mcp.executor.document_vision_ocr_failed', error, { sessionId, taskId, url });
    return {
      status: 'error',
      output: {
        error: error instanceof Error ? error.message : 'Failed to extract text from document image.',
      },
      metadata: {
        executor: 'document-vision-ocr',
        error: true,
      },
    };
  }
};

import {
  reconciliationExecutor as accountingReconciliationExecutor,
  journalExecutor as accountingJournalExecutor,
  closeStatusExecutor as accountingCloseExecutor,
} from './executors/accounting.js';

const executors: Record<string, TaskExecutor> = {
  'audit-risk-summary': auditRiskSummaryExecutor,
  'audit-evidence-summary': auditEvidenceSummaryExecutor,
  'accounting-reconciliation-summary': accountingReconciliationExecutor,
  'accounting-journal-summary': accountingJournalExecutor,
  'accounting-close-summary': accountingCloseExecutor,
  'document-vision-ocr': documentVisionOcrExecutor,
};

export function getTaskExecutor(key?: string): TaskExecutor | null {
  if (!key) return null;
  return executors[key] ?? null;
}

export async function executeTaskWithExecutor(options: {
  executorKey?: string;
  input: Record<string, unknown> | undefined;
  context: TaskExecutionContext;
  sessionId: string;
  taskId: string;
}): Promise<TaskExecutorResult> {
  const executor = getTaskExecutor(options.executorKey);
  if (!executor) {
    return DEFAULT_EMPTY_RESULT;
  }
  return executor({
    input: options.input,
    context: options.context,
    sessionId: options.sessionId,
    taskId: options.taskId,
  });
}
