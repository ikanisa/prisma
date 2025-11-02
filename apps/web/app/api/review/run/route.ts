/**
 * Finance Review API - Run Review
 * 
 * Orchestrates CFO + Auditor dual-agent review of recent ledger activity.
 * Returns joint assessment with issues, recommendations, and proposed entries.
 * 
 * @route POST /api/review/run
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import OpenAI from 'openai';

import { auth } from '@/auth';
import { financeReviewEnv } from '@/lib/finance-review/env';
import { recentLedgerEntries } from '@/lib/finance-review/ledger';
import { retrieveRelevant } from '@/lib/finance-review/retrieval';
import { supabaseAdmin } from '@/lib/finance-review/supabase';
import type { FinanceReviewDatabase } from '@/lib/finance-review/supabase';
import type { PostgrestSingleResponse } from '@supabase/supabase-js';
import { CFO_PROMPT, CFOResponseSchema } from '@/agents/finance-review/cfo';
import { AUDITOR_PROMPT, AuditorResponseSchema } from '@/agents/finance-review/auditor';

const openai = new OpenAI({ apiKey: financeReviewEnv.OPENAI_API_KEY });

/**
 * Request body schema
 */
const RequestBodySchema = z.object({
  orgId: z.string().uuid().optional(),
  hours: z.number().int().min(1).max(168).default(24),
});

/**
 * POST /api/review/run
 *
 * Execute dual-agent financial review
 */
export async function POST(request: NextRequest) {
  try {
    // Parse and validate request body
    const body = await request.json();
    const { orgId: requestedOrgId, hours } = RequestBodySchema.parse(body);
    const targetOrgId = requestedOrgId ?? financeReviewEnv.DEFAULT_ORG_ID;

    // Authentication: Verify user session
    const session = await auth();
    const sessionUser = session?.user as { id?: string | null; email?: string | null } | undefined;
    const headerUserId = request.headers.get('x-user-id');

    let userId: string | null = sessionUser?.id ?? null;

    // Resolve user ID from email if not directly available
    if (!userId && sessionUser?.email) {
      const email = sessionUser.email.toLowerCase();
      // Note: supabaseAdmin typing is complex; using runtime type for database operations
      const { data: lookup, error: lookupError } = await supabaseAdmin
        .from('app_users')
        .select('user_id')
        .eq('email', email)
        .maybeSingle<{ user_id: string }>();
      
      if (lookupError) {
        console.error('finance-review.resolve-user-failed', lookupError);
        return NextResponse.json(
          { error: 'Unable to resolve user identity' },
          { status: 500 }
        );
      }
      
      if (lookup?.user_id) {
        userId = lookup.user_id;
      }
    }

    // Fallback to header-based user ID (for service-to-service calls)
    if (!userId && headerUserId) {
      userId = headerUserId;
    }

    // Require authentication
    if (!userId) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Authorization: Verify org membership
    const { data: membership, error: membershipError } = await supabaseAdmin
      .from('memberships')
      .select('role')
      .eq('org_id', targetOrgId)
      .eq('user_id', userId)
      .maybeSingle<{ role: string }>();

    if (membershipError) {
      console.error('finance-review.membership-check-failed', membershipError);
      return NextResponse.json(
        { error: 'Unable to verify organisation access' },
        { status: 500 }
      );
    }

    if (!membership) {
      return NextResponse.json(
        { error: 'User not authorised for organisation', orgId: targetOrgId },
        { status: 403 }
      );
    }

    // Fetch recent ledger entries
    const ledger = await recentLedgerEntries(hours, targetOrgId);

    // Retrieve relevant context via RAG
    const retrievals = await retrieveRelevant(
      'daily close risk review for finance data, SACCO float reconciliation, MoMo settlement',
      targetOrgId,
      12
    );

    // Build context for agents
    const ledgerContext = ledger
      .map(
        (r) =>
          `${r.date}|${r.account}|${r.debit ?? 0}|${r.credit ?? 0}|${r.currency}|${r.memo ?? ''}`
      )
      .join('\n');

    const retrievalContext = retrievals.map((r) => r.chunk_text).join('\n');

    const context = `
=== Recent Ledger Entries ===
${ledgerContext}

=== Relevant Context (RAG) ===
${retrievalContext}
`.trim();

    // CFO Agent review
    const cfoCompletion = await openai.chat.completions.create({
      model: financeReviewEnv.CHAT_MODEL,
      messages: [
        { role: 'system', content: CFO_PROMPT },
        { role: 'user', content: context },
      ],
      temperature: 0.2,
      response_format: { type: 'json_object' },
    });

    const cfoResponseText = cfoCompletion.choices[0]?.message?.content || '{}';
    const cfoResponse = CFOResponseSchema.parse(JSON.parse(cfoResponseText));

    // Auditor Agent review (includes CFO output for challenge)
    const auditorCompletion = await openai.chat.completions.create({
      model: financeReviewEnv.CHAT_MODEL,
      messages: [
        { role: 'system', content: AUDITOR_PROMPT },
        { role: 'user', content: context },
        {
          role: 'assistant',
          content: `CFO Agent found:\n${JSON.stringify(cfoResponse, null, 2)}`,
        },
      ],
      temperature: 0.2,
      response_format: { type: 'json_object' },
    });

    const auditorResponseText = auditorCompletion.choices[0]?.message?.content || '{}';
    const auditorResponse = AuditorResponseSchema.parse(JSON.parse(auditorResponseText));

    // Determine overall status (worst case between CFO and Auditor)
    const statusPriority = { GREEN: 0, AMBER: 1, RED: 2 };
    const overallStatus: FinanceReviewDatabase['public']['Tables']['controls_logs']['Row']['status'] =
      statusPriority[auditorResponse.risk_level] >= statusPriority[cfoResponse.status]
        ? auditorResponse.risk_level
        : cfoResponse.status;

    // Log to controls_logs
    type ControlLogInsert = FinanceReviewDatabase['public']['Tables']['controls_logs']['Insert'];

    const controlLogPayload: ControlLogInsert = {
      org_id: orgId,
      control_key: 'daily_review',
      period: new Date().toISOString().slice(0, 10),
      status: overallStatus,
      details: {
        cfo: cfoResponse,
        auditor: auditorResponse,
        ledger_entries_count: ledger.length,
        retrieval_chunks: retrievals.length,
      } as Record<string, unknown>,
    };

    const { data: controlLog, error: logError } = (await supabaseAdmin
      .from('controls_logs')
      // Supabase typings under strict template inference fall back to `never`; cast after validating payload.
      .insert([controlLogPayload] as never)
      .select('id')
      .single()) as PostgrestSingleResponse<{ id: string }>;

    if (logError) {
      console.error('Failed to log control execution:', logError);
    }

    // Extract actionable tasks
    const tasks: string[] = [
      ...cfoResponse.issues.map((i) => `[CFO] ${i.type}: ${i.explain}`),
      ...auditorResponse.exceptions.map((e) => `[Auditor] ${e.ref}: ${e.recommendation}`),
    ];

    const responseBody = ResponseSchema.parse({
      status: overallStatus,
      cfo: cfoResponse,
      auditor: auditorResponse,
      tasks,
      controlLogId: controlLog?.id || crypto.randomUUID(),
    });

    return NextResponse.json(responseBody);
  } catch (error) {
    console.error('Review run failed:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request', details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Internal server error', message: String(error) },
      { status: 500 }
    );
  }
}
