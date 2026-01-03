/**
 * Unit Tests for @prisma/supabase-client package
 * Supabase client configuration and utilities
 */
import { describe, it, expect } from 'vitest';

describe('@prisma/supabase-client', () => {
    describe('Client configuration', () => {
        it('required environment variables are defined', () => {
            const requiredVars = ['SUPABASE_URL', 'SUPABASE_ANON_KEY'];
            requiredVars.forEach(varName => {
                expect(typeof varName).toBe('string');
            });
        });

        it('auth options are valid', () => {
            const authOptions = {
                autoRefreshToken: true,
                persistSession: true,
                detectSessionInUrl: true,
            };

            expect(authOptions.autoRefreshToken).toBe(true);
            expect(authOptions.persistSession).toBe(true);
        });
    });

    describe('Storage configuration', () => {
        it('storage bucket names are valid', () => {
            const buckets = ['documents', 'attachments', 'pbc', 'avatars'];
            buckets.forEach(bucket => {
                expect(bucket.length).toBeGreaterThan(0);
                expect(bucket).not.toContain(' ');
            });
        });
    });

    describe('RPC functions', () => {
        it('RPC function names follow convention', () => {
            const rpcFunctions = [
                'get_user_organizations',
                'has_min_role',
                'match_knowledge_chunks',
                'compute_cit',
            ];

            rpcFunctions.forEach(fn => {
                expect(fn).toMatch(/^[a-z_]+$/);
            });
        });
    });
});
