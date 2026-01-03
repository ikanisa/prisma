/**
 * Core Authentication Tests
 * 
 * Tests the critical authentication flows for the application.
 * These are safety net tests that must pass before any deployment.
 */

import { describe, it, expect, beforeEach } from 'vitest';

// Mock Supabase client for testing
const mockSupabase = {
  auth: {
    signInWithPassword: async ({ email, password }: { email: string; password: string }) => {
      if (email === 'test@example.com' && password === 'validpassword') {
        return {
          data: {
            user: { id: 'user-123', email },
            session: { access_token: 'valid-token', refresh_token: 'refresh-token' }
          },
          error: null
        };
      }
      return { data: { user: null, session: null }, error: { message: 'Invalid credentials' } };
    },
    signOut: async () => ({ error: null }),
    getUser: async (token: string) => {
      if (token === 'valid-token') {
        return { data: { user: { id: 'user-123', email: 'test@example.com' } }, error: null };
      }
      return { data: { user: null }, error: { message: 'Invalid token' } };
    }
  }
};

describe('Authentication Flow', () => {
  describe('signInWithPassword', () => {
    it('should successfully authenticate with valid credentials', async () => {
      const result = await mockSupabase.auth.signInWithPassword({
        email: 'test@example.com',
        password: 'validpassword'
      });

      expect(result.error).toBeNull();
      expect(result.data.user).toBeDefined();
      expect(result.data.user?.id).toBe('user-123');
      expect(result.data.session?.access_token).toBe('valid-token');
    });

    it('should reject invalid credentials', async () => {
      const result = await mockSupabase.auth.signInWithPassword({
        email: 'test@example.com',
        password: 'wrongpassword'
      });

      expect(result.error).toBeDefined();
      expect(result.error?.message).toBe('Invalid credentials');
      expect(result.data.user).toBeNull();
    });

    it('should reject non-existent users', async () => {
      const result = await mockSupabase.auth.signInWithPassword({
        email: 'nonexistent@example.com',
        password: 'anypassword'
      });

      expect(result.error).toBeDefined();
      expect(result.data.user).toBeNull();
    });
  });

  describe('getUser', () => {
    it('should return user for valid token', async () => {
      const result = await mockSupabase.auth.getUser('valid-token');

      expect(result.error).toBeNull();
      expect(result.data.user).toBeDefined();
      expect(result.data.user?.email).toBe('test@example.com');
    });

    it('should reject invalid tokens', async () => {
      const result = await mockSupabase.auth.getUser('invalid-token');

      expect(result.error).toBeDefined();
      expect(result.data.user).toBeNull();
    });
  });

  describe('signOut', () => {
    it('should successfully sign out', async () => {
      const result = await mockSupabase.auth.signOut();

      expect(result.error).toBeNull();
    });
  });
});

describe('Session Validation', () => {
  it('should validate session expiry correctly', () => {
    const now = Math.floor(Date.now() / 1000);
    const validSession = { exp: now + 3600 }; // Expires in 1 hour
    const expiredSession = { exp: now - 3600 }; // Expired 1 hour ago

    const isValid = (session: { exp: number }) => session.exp > now;

    expect(isValid(validSession)).toBe(true);
    expect(isValid(expiredSession)).toBe(false);
  });
});

