/**
 * Finance Review System - Supabase Client Factory
 * 
 * Provides both RLS-enabled (anon) and admin (service role) clients
 * for interacting with the finance review tables.
 * 
 * @module finance-review/supabase
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { financeReviewEnv } from './env';

/**
 * Database schema type for finance review tables
 */
export interface FinanceReviewDatabase {
  public: {
    Tables: {
      ledger_entries: {
        Row: {
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
        };
        Insert: {
          id?: string;
          org_id: string;
          sacco_id?: string | null;
          date: string;
          account: string;
          debit?: number | null;
          credit?: number | null;
          currency?: string;
          counterparty_id?: string | null;
          source_txn_id?: string | null;
          memo?: string | null;
          created_by?: string | null;
          created_at?: string;
        };
        Update: Partial<{
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
        }>;
      };
      support_docs: {
        Row: {
          id: string;
          org_id: string;
          source_txn_id: string | null;
          url: string;
          hash: string | null;
          mime: string | null;
          ocr_text: string | null;
          uploaded_by: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          org_id: string;
          source_txn_id?: string | null;
          url: string;
          hash?: string | null;
          mime?: string | null;
          ocr_text?: string | null;
          uploaded_by?: string | null;
          created_at?: string;
        };
        Update: Partial<{
          id: string;
          org_id: string;
          source_txn_id: string | null;
          url: string;
          hash: string | null;
          mime: string | null;
          ocr_text: string | null;
          uploaded_by: string | null;
          created_at: string;
        }>;
      };
      tax_maps: {
        Row: {
          id: string;
          org_id: string;
          account: string;
          jurisdiction: string;
          rule_ref: string | null;
          treatment: string | null;
          vat_rate: number | null;
          withholding_rate: number | null;
          notes: string | null;
          valid_from: string | null;
          valid_to: string | null;
        };
        Insert: {
          id?: string;
          org_id: string;
          account: string;
          jurisdiction: string;
          rule_ref?: string | null;
          treatment?: string | null;
          vat_rate?: number | null;
          withholding_rate?: number | null;
          notes?: string | null;
          valid_from?: string | null;
          valid_to?: string | null;
        };
        Update: Partial<{
          id: string;
          org_id: string;
          account: string;
          jurisdiction: string;
          rule_ref: string | null;
          treatment: string | null;
          vat_rate: number | null;
          withholding_rate: number | null;
          notes: string | null;
          valid_from: string | null;
          valid_to: string | null;
        }>;
      };
      controls_logs: {
        Row: {
          id: string;
          org_id: string;
          control_key: string;
          period: string;
          status: 'GREEN' | 'AMBER' | 'RED';
          details: Record<string, unknown> | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          org_id: string;
          control_key: string;
          period: string;
          status: 'GREEN' | 'AMBER' | 'RED';
          details?: Record<string, unknown> | null;
          created_at?: string;
        };
        Update: Partial<{
          id: string;
          org_id: string;
          control_key: string;
          period: string;
          status: 'GREEN' | 'AMBER' | 'RED';
          details: Record<string, unknown> | null;
          created_at: string;
        }>;
      };
      embeddings: {
        Row: {
          id: string;
          org_id: string;
          object_type: 'ledger' | 'doc';
          object_id: string;
          vector: number[] | null;
          chunk_text: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          org_id: string;
          object_type: 'ledger' | 'doc';
          object_id: string;
          vector?: number[] | null;
          chunk_text?: string | null;
          created_at?: string;
        };
        Update: Partial<{
          id: string;
          org_id: string;
          object_type: 'ledger' | 'doc';
          object_id: string;
          vector: number[] | null;
          chunk_text: string | null;
          created_at: string;
        }>;
      };
    };
    Functions: {
      match_embeddings: {
        Args: {
          p_org_id: string;
          query_vector: number[];
          match_threshold: number;
          match_count: number;
        };
        Returns: {
          object_id: string;
          object_type: string;
          chunk_text: string;
          similarity: number;
        }[];
      };
    };
  };
}

/**
 * RLS-enabled Supabase client (anon key)
 * Use for client-side operations with JWT-based org isolation
 */
export const supabaseAnon: SupabaseClient<FinanceReviewDatabase> = createClient(
  financeReviewEnv.SUPABASE_URL,
  financeReviewEnv.SUPABASE_ANON_KEY
);

/**
 * Admin Supabase client (service role key)
 * Bypasses RLS - use server-side only for:
 * - Bulk imports
 * - Embedding generation
 * - Cross-org admin operations
 */
export const supabaseAdmin: SupabaseClient<FinanceReviewDatabase> = createClient(
  financeReviewEnv.SUPABASE_URL,
  financeReviewEnv.SUPABASE_SERVICE_ROLE_KEY
);
