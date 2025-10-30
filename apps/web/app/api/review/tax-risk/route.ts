/**
 * Finance Review API - Tax Risk Assessment
 * 
 * Identifies ledger accounts without tax mapping entries,
 * indicating potential compliance gaps.
 * 
 * @route POST /api/review/tax-risk
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
  limit: z.number().int().min(1).max(5000).default(2000),
});

/**
 * POST /api/review/tax-risk
 * 
 * Find accounts without tax mapping
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { orgId = financeReviewEnv.DEFAULT_ORG_ID, limit } = RequestBodySchema.parse(body);

    // Get distinct accounts from recent ledger entries
    const { data: entries, error: entriesError } = await supabaseAdmin
      .from('ledger_entries')
      .select('id, account, date, memo, currency, debit, credit')
      .eq('org_id', orgId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (entriesError) {
      throw new Error(`Failed to fetch ledger entries: ${entriesError.message}`);
    }

    const gaps = [];
    const checkedAccounts = new Set<string>();

    // Check each unique account for tax mapping
    for (const entry of entries || []) {
      // Skip if we've already checked this account
      if (checkedAccounts.has(entry.account)) {
        continue;
      }

      checkedAccounts.add(entry.account);

      const { data: mappings, error: mappingsError } = await supabaseAdmin
        .from('tax_maps')
        .select('id')
        .eq('org_id', orgId)
        .eq('account', entry.account)
        .limit(1);

      if (mappingsError) {
        console.error('Error checking tax mappings:', mappingsError);
        continue;
      }

      // If no mapping found, this is a gap
      if (!mappings || mappings.length === 0) {
        gaps.push({
          account: entry.account,
          sample_entry_id: entry.id,
          sample_date: entry.date,
          sample_amount: entry.debit || entry.credit || 0,
          currency: entry.currency,
          memo: entry.memo,
        });
      }
    }

    return NextResponse.json({
      count: gaps.length,
      items: gaps,
      accounts_checked: checkedAccounts.size,
      org_id: orgId,
    });
  } catch (error) {
    console.error('Tax risk check failed:', error);

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
