/**
 * Finance Review API - Missing Documents
 * 
 * Identifies ledger entries that lack supporting documentation
 * for audit trail compliance.
 * 
 * @route POST /api/review/missing-docs
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { financeReviewEnv } from '@/lib/finance-review/env';
import { supabaseAdmin } from '@/lib/finance-review/supabase';

/**
 * Request body schema
 */
const RequestBodySchema = z.object({
  orgId: z.string().uuid().optional(),
  days: z.number().int().min(1).max(90).default(30),
});

/**
 * POST /api/review/missing-docs
 * 
 * Find ledger entries without supporting documents
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { orgId = financeReviewEnv.DEFAULT_ORG_ID, days } = RequestBodySchema.parse(body);

    const since = new Date(Date.now() - days * 86400 * 1000).toISOString();

    // Fetch ledger entries with source_txn_id
    const { data: entries, error: entriesError } = await supabaseAdmin
      .from('ledger_entries')
      .select('*')
      .eq('org_id', orgId)
      .gte('created_at', since)
      .not('source_txn_id', 'is', null);

    if (entriesError) {
      throw new Error(`Failed to fetch ledger entries: ${entriesError.message}`);
    }

    type LedgerEntry = {
      id: string;
      date: string;
      account: string;
      debit: number | null;
      credit: number | null;
      currency: string | null;
      source_txn_id: string | null;
      memo: string | null;
    };

    const ledgerEntries: LedgerEntry[] = Array.isArray(entries)
      ? (entries as LedgerEntry[])
      : [];
    const missing: Array<{
      id: string;
      date: string;
      account: string;
      amount: number;
      currency: string | null;
      source_txn_id: string;
      memo: string | null;
    }> = [];

    // Check each entry for supporting documents
    for (const entry of ledgerEntries) {
      if (!entry.source_txn_id) {
        continue;
      }
      const { data: docs, error: docsError } = await supabaseAdmin
        .from('support_docs')
        .select('id')
        .eq('org_id', orgId)
        .eq('source_txn_id', entry.source_txn_id)
        .limit(1);

      if (docsError) {
        console.error('Error checking documents:', docsError);
        continue;
      }

      // If no documents found, add to missing list
      const supportingDocs = Array.isArray(docs) ? docs : [];
      if (supportingDocs.length === 0) {
        missing.push({
          id: entry.id,
          date: entry.date,
          account: entry.account,
          amount: entry.debit || entry.credit || 0,
          currency: entry.currency,
          source_txn_id: entry.source_txn_id,
          memo: entry.memo,
        });
      }
    }

    return NextResponse.json({
      count: missing.length,
      items: missing,
      period_days: days,
      org_id: orgId,
    });
  } catch (error) {
    console.error('Missing docs check failed:', error);

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
