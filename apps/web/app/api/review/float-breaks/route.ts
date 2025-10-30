/**
 * Finance Review API - Float Reconciliation
 * 
 * Compares SACCO float control account with MoMo settlement account
 * to identify reconciliation breaks.
 * 
 * @route POST /api/review/float-breaks
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { financeReviewEnv } from '@/lib/finance-review/env';
import { calculateAccountBalance } from '@/lib/finance-review/ledger';

/**
 * Request body schema
 */
const RequestBodySchema = z.object({
  orgId: z.string().uuid().optional(),
  controlAccount: z.string().default('SACCO_FLOAT_CONTROL'),
  settlementAccount: z.string().default('MOMO_SETTLEMENT'),
  toleranceAmount: z.number().default(1.0),
});

/**
 * POST /api/review/float-breaks
 * 
 * Reconcile SACCO float vs MoMo settlement
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      orgId = financeReviewEnv.DEFAULT_ORG_ID,
      controlAccount,
      settlementAccount,
      toleranceAmount,
    } = RequestBodySchema.parse(body);

    // Calculate balances for both accounts
    const controlBalance = await calculateAccountBalance(controlAccount, orgId);
    const settlementBalance = await calculateAccountBalance(settlementAccount, orgId);

    // Calculate difference
    const difference = Number((controlBalance - settlementBalance).toFixed(2));
    const isReconciled = Math.abs(difference) <= toleranceAmount;

    return NextResponse.json({
      control_account: controlAccount,
      control_balance: Number(controlBalance.toFixed(2)),
      settlement_account: settlementAccount,
      settlement_balance: Number(settlementBalance.toFixed(2)),
      difference,
      tolerance: toleranceAmount,
      is_reconciled: isReconciled,
      status: isReconciled ? 'GREEN' : Math.abs(difference) > 100 ? 'RED' : 'AMBER',
      org_id: orgId,
    });
  } catch (error) {
    console.error('Float reconciliation failed:', error);

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
