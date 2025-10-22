import type { SupabaseClient } from '@supabase/supabase-js';
import type OpenAI from 'openai';
import { randomUUID } from 'crypto';

interface SupabaseLike {
  from(table: string): any;
}

interface OpenAiLike {
  responses: { create(payload: any): Promise<any> };
}

function extractResponseText(response: any): string {
  if (!response) return '';
  if (typeof response.output_text === 'string') {
    return response.output_text;
  }
  if (Array.isArray(response.output)) {
    return response.output
      .flatMap((item: any) => (Array.isArray(item?.content) ? item.content : []))
      .map((part: any) => (typeof part?.text === 'string' ? part.text : ''))
      .filter((text: string) => text.length > 0)
      .join('\n');
  }
  if (Array.isArray(response.choices) && response.choices[0]?.message?.content) {
    return String(response.choices[0].message.content);
  }
  return '';
}

export interface AuditExecutionContext {
  orgId: string;
  orgSlug: string;
  engagementId: string;
  userId: string;
}

export class AuditExecutionAgent {
  constructor(private readonly deps: {
    supabase: SupabaseLike;
    openai: OpenAiLike;
    logInfo: (msg: string, meta?: Record<string, unknown>) => void;
    logError: (msg: string, err: unknown, meta?: Record<string, unknown>) => void;
  }) {}

  async runRiskAssessment(context: AuditExecutionContext, objective: string) {
    const { supabase, logInfo } = this.deps;

    const riskSignals = await supabase
      .from('audit_risk_signals')
      .select('id, source, kind, payload, created_at')
      .eq('org_id', context.orgId)
      .eq('engagement_id', context.engagementId)
      .order('created_at', { ascending: false })
      .limit(20);

    logInfo('audit_execution.risk_signals_loaded', {
      orgId: context.orgId,
      engagementId: context.engagementId,
      count: Array.isArray(riskSignals?.data) ? riskSignals.data.length : 0,
    });

    return {
      summary: 'Risk assessment automation pending implementation.',
      signals: riskSignals?.data ?? [],
      recommendedActions: ['Integrate analytics engine', 'Pull risk signals from ADA tables'],
    };
  }

  async generateAuditPlan(context: AuditExecutionContext, question: string) {
    const { openai, logInfo } = this.deps;
    logInfo('audit_execution.plan_stub', { context, question });
    const response = await openai.responses.create({
      model: process.env.AGENT_MODEL ?? 'gpt-4.1-mini',
      input: [
        {
          role: 'system',
          content:
            'You are an audit execution specialist. Propose structured tasks covering planning, risk assessment, analytics, sampling, KAM drafting, and evidence. Output JSON with sections risk, procedures, analytics, sampling, governance.',
        },
        {
          role: 'user',
          content: question,
        },
      ],
      text: { format: 'json_object' },
    });

    const text = extractResponseText(response).trim();
    let parsedPlan: Record<string, unknown> | null = null;
    if (text) {
      try {
        const candidate = JSON.parse(text);
        if (candidate && typeof candidate === 'object' && !Array.isArray(candidate)) {
          parsedPlan = candidate as Record<string, unknown>;
        } else {
          this.deps.logError('audit_execution.plan_parse_failed', new Error('Invalid plan shape'), { raw: text });
        }
      } catch (error) {
        this.deps.logError('audit_execution.plan_parse_failed', error, { raw: text });
      }
    }

    return {
      plan: parsedPlan,
    };
  }
}
