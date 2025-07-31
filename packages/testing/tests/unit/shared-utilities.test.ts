// Unit Tests for Shared Utilities
import { describe, it, expect, vi } from 'vitest';
import { SupabaseLogger, createLogger } from '@easymo/edge-functions/src/shared/logger';
import { validateRequiredEnvVars, phoneNumberSchema } from '@easymo/edge-functions/src/shared/validation';
import { EdgeFunctionError } from '@easymo/edge-functions/src/shared/errors';

describe('Shared Utilities', () => {
  describe('Logger', () => {
    it('should create logger with context', () => {
      const logger = createLogger('test-context');
      expect(logger).toBeInstanceOf(SupabaseLogger);
    });

    it('should format messages correctly', () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      const logger = createLogger('test');
      
      logger.info('test message', { key: 'value' });
      
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringMatching(/\[INFO\] \[test\] test message.*"key":"value"/)
      );
      
      consoleSpy.mockRestore();
    });
  });

  describe('Validation', () => {
    it('should validate required environment variables', () => {
      const originalEnv = process.env.TEST_VAR;
      delete process.env.TEST_VAR;

      expect(() => {
        validateRequiredEnvVars(['TEST_VAR']);
      }).toThrow('Missing required environment variables: TEST_VAR');

      process.env.TEST_VAR = originalEnv;
    });

    it('should validate phone numbers', () => {
      expect(phoneNumberSchema.safeParse('+1234567890').success).toBe(true);
      expect(phoneNumberSchema.safeParse('invalid').success).toBe(false);
      expect(phoneNumberSchema.safeParse('+250788123456').success).toBe(true);
    });
  });

  describe('Errors', () => {
    it('should create proper error responses', () => {
      const error = EdgeFunctionError.badRequest('Invalid input');
      
      expect(error.statusCode).toBe(400);
      expect(error.code).toBe('BAD_REQUEST');
      expect(error.message).toBe('Invalid input');
    });

    it('should create validation errors with metadata', () => {
      const errors = { phone: ['Invalid format'] };
      const error = EdgeFunctionError.validationError('Validation failed', errors);
      
      expect(error.statusCode).toBe(422);
      expect(error.metadata?.errors).toEqual(errors);
    });
  });
});