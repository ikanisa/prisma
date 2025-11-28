/**
 * Finance Review System - Ledger Query Helpers
 * 
 * Utility functions for querying and analyzing ledger entries
 * for financial review processes.
 * 
 * @module finance-review/ledger
 */

import { supabaseAdmin } from './supabase';

/**
 * Ledger entry from database
 */
export interface LedgerEntry {
  id: string;
  org_id: string;
  sacco_id: string | null;
  date: string;
  account: string;
  debit: number | null;
  credit: number | null;
  currency: string;
  counterparty_id: string | null;
  source_txn_id: string | null;
  memo: string | null;
  created_by: string | null;
  created_at: string;
}

/**
 * Retrieve recent ledger entries
 * 
 * @param hours - Look back period in hours
 * @param orgId - Optional organization ID filter
 * @returns Array of ledger entries
 */
export async function recentLedgerEntries(
  hours: number = 24,
  orgId?: string
): Promise<LedgerEntry[]> {
  const since = new Date(Date.now() - hours * 3600 * 1000).toISOString();
  
  let query = supabaseAdmin
    .from('ledger_entries')
    .select('*')
    .gte('created_at', since)
    .order('created_at', { ascending: false });
  
  if (orgId) {
    query = query.eq('org_id', orgId);
  }
  
  const { data, error } = await query;
  
  if (error) {
    throw new Error(`Failed to fetch ledger entries: ${error.message}`);
  }
  
  return data || [];
}

/**
 * Get ledger entries by date range
 * 
 * @param startDate - Start date (YYYY-MM-DD)
 * @param endDate - End date (YYYY-MM-DD)
 * @param orgId - Organization ID
 * @returns Array of ledger entries
 */
export async function ledgerEntriesByDateRange(
  startDate: string,
  endDate: string,
  orgId: string
): Promise<LedgerEntry[]> {
  const { data, error } = await supabaseAdmin
    .from('ledger_entries')
    .select('*')
    .eq('org_id', orgId)
    .gte('date', startDate)
    .lte('date', endDate)
    .order('date', { ascending: true });
  
  if (error) {
    throw new Error(`Failed to fetch ledger entries: ${error.message}`);
  }
  
  return data || [];
}

/**
 * Get ledger entries by account
 * 
 * @param account - Account name/code
 * @param orgId - Organization ID
 * @param limit - Maximum number of entries to return
 * @returns Array of ledger entries
 */
export async function ledgerEntriesByAccount(
  account: string,
  orgId: string,
  limit: number = 100
): Promise<LedgerEntry[]> {
  const { data, error } = await supabaseAdmin
    .from('ledger_entries')
    .select('*')
    .eq('org_id', orgId)
    .eq('account', account)
    .order('date', { ascending: false })
    .limit(limit);
  
  if (error) {
    throw new Error(`Failed to fetch ledger entries: ${error.message}`);
  }
  
  return data || [];
}

/**
 * Calculate account balance
 * 
 * WARNING: This function currently uses JavaScript Number for calculations
 * which can lead to floating-point precision errors. For production use,
 * this should be replaced with decimal-safe arithmetic using decimal.js
 * or similar library to ensure deterministic financial calculations.
 * 
 * @param account - Account name/code
 * @param orgId - Organization ID
 * @returns Net balance (debits - credits)
 */
export async function calculateAccountBalance(
  account: string,
  orgId: string
): Promise<number> {
  const entries = await ledgerEntriesByAccount(account, orgId);
  
  // TODO: Replace with decimal-safe arithmetic (e.g., decimal.js)
  // to avoid floating-point precision errors in financial calculations
  return entries.reduce((balance, entry) => {
    const debit = Number(entry.debit || 0);
    const credit = Number(entry.credit || 0);
    return balance + debit - credit;
  }, 0);
}

/**
 * Find entries missing source transaction IDs
 * 
 * @param orgId - Organization ID
 * @param days - Look back period in days
 * @returns Array of entries without source_txn_id
 */
export async function findEntriesWithoutSource(
  orgId: string,
  days: number = 30
): Promise<LedgerEntry[]> {
  const since = new Date(Date.now() - days * 86400 * 1000).toISOString();
  
  const { data, error } = await supabaseAdmin
    .from('ledger_entries')
    .select('*')
    .eq('org_id', orgId)
    .is('source_txn_id', null)
    .gte('created_at', since)
    .order('created_at', { ascending: false });
  
  if (error) {
    throw new Error(`Failed to fetch entries: ${error.message}`);
  }
  
  return data || [];
}
