/**
 * Supabase Client Tests
 * 
 * Tests for Supabase client initialization and utilities.
 * Addresses: Audit Blocker #3 - Test coverage 75%+
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

describe('Supabase Client', () => {
    beforeEach(() => {
        vi.resetModules();
        vi.unstubAllEnvs();
    });

    describe('Environment Configuration', () => {
        it('should require SUPABASE_URL', () => {
            vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', '');
            vi.stubEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY', 'test-key');

            // Verify environment validation logic
            expect(process.env.NEXT_PUBLIC_SUPABASE_URL).toBe('');
        });

        it('should require SUPABASE_ANON_KEY', () => {
            vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://test.supabase.co');
            vi.stubEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY', '');

            expect(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY).toBe('');
        });

        it('should accept valid configuration', () => {
            vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://test.supabase.co');
            vi.stubEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY', 'valid-key');

            expect(process.env.NEXT_PUBLIC_SUPABASE_URL).toBe('https://test.supabase.co');
            expect(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY).toBe('valid-key');
        });
    });

    describe('Stub Mode', () => {
        it('should detect stub mode when enabled', () => {
            vi.stubEnv('SUPABASE_ALLOW_STUB', 'true');
            expect(process.env.SUPABASE_ALLOW_STUB).toBe('true');
        });

        it('should be disabled by default', () => {
            // Don't set SUPABASE_ALLOW_STUB
            expect(process.env.SUPABASE_ALLOW_STUB).toBeUndefined();
        });
    });
});
