/**
 * Core Data Validation Tests
 * 
 * Tests the critical data validation patterns used throughout the application.
 * These are safety net tests that must pass before any deployment.
 */

import { describe, it, expect } from 'vitest';

// Simple validation utilities (mimicking Zod patterns)
const validators = {
  isEmail: (value: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(value);
  },

  isUUID: (value: string): boolean => {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    return uuidRegex.test(value);
  },

  isNonEmptyString: (value: unknown): value is string => {
    return typeof value === 'string' && value.trim().length > 0;
  },

  isPositiveNumber: (value: unknown): value is number => {
    return typeof value === 'number' && value > 0 && Number.isFinite(value);
  },

  isValidDate: (value: string): boolean => {
    const date = new Date(value);
    return !isNaN(date.getTime());
  },

  isWithinRange: (value: number, min: number, max: number): boolean => {
    return value >= min && value <= max;
  }
};

describe('Email Validation', () => {
  it('should accept valid email addresses', () => {
    const validEmails = [
      'user@example.com',
      'test.user@domain.org',
      'admin+tag@company.co.uk',
      'user123@test.io'
    ];

    validEmails.forEach(email => {
      expect(validators.isEmail(email)).toBe(true);
    });
  });

  it('should reject invalid email addresses', () => {
    const invalidEmails = [
      'not-an-email',
      'missing@domain',
      '@nodomain.com',
      'spaces in@email.com',
      'double@@at.com',
      ''
    ];

    invalidEmails.forEach(email => {
      expect(validators.isEmail(email)).toBe(false);
    });
  });
});

describe('UUID Validation', () => {
  it('should accept valid UUIDs', () => {
    const validUUIDs = [
      '550e8400-e29b-41d4-a716-446655440000',
      'f47ac10b-58cc-4372-a567-0e02b2c3d479',
      'A987FBC9-4BED-3078-CF07-9141BA07C9F3' // uppercase
    ];

    validUUIDs.forEach(uuid => {
      expect(validators.isUUID(uuid)).toBe(true);
    });
  });

  it('should reject invalid UUIDs', () => {
    const invalidUUIDs = [
      'not-a-uuid',
      '550e8400-e29b-41d4-a716', // too short
      '550e8400-e29b-41d4-a716-446655440000-extra', // too long
      '550e8400e29b41d4a716446655440000', // no dashes
      ''
    ];

    invalidUUIDs.forEach(uuid => {
      expect(validators.isUUID(uuid)).toBe(false);
    });
  });
});

describe('String Validation', () => {
  it('should validate non-empty strings', () => {
    expect(validators.isNonEmptyString('hello')).toBe(true);
    expect(validators.isNonEmptyString('  spaces  ')).toBe(true);
    expect(validators.isNonEmptyString('')).toBe(false);
    expect(validators.isNonEmptyString('   ')).toBe(false);
    expect(validators.isNonEmptyString(null)).toBe(false);
    expect(validators.isNonEmptyString(undefined)).toBe(false);
    expect(validators.isNonEmptyString(123)).toBe(false);
  });
});

describe('Number Validation', () => {
  it('should validate positive numbers', () => {
    expect(validators.isPositiveNumber(1)).toBe(true);
    expect(validators.isPositiveNumber(0.5)).toBe(true);
    expect(validators.isPositiveNumber(1000000)).toBe(true);
    expect(validators.isPositiveNumber(0)).toBe(false);
    expect(validators.isPositiveNumber(-1)).toBe(false);
    expect(validators.isPositiveNumber(Infinity)).toBe(false);
    expect(validators.isPositiveNumber(NaN)).toBe(false);
  });

  it('should validate number ranges', () => {
    expect(validators.isWithinRange(5, 1, 10)).toBe(true);
    expect(validators.isWithinRange(1, 1, 10)).toBe(true);
    expect(validators.isWithinRange(10, 1, 10)).toBe(true);
    expect(validators.isWithinRange(0, 1, 10)).toBe(false);
    expect(validators.isWithinRange(11, 1, 10)).toBe(false);
  });
});

describe('Date Validation', () => {
  it('should accept valid date strings', () => {
    const validDates = [
      '2024-01-15',
      '2024-01-15T10:30:00Z',
      '2024-01-15T10:30:00.000Z',
      '2024-12-31',
      'January 15, 2024'
    ];

    validDates.forEach(date => {
      expect(validators.isValidDate(date)).toBe(true);
    });
  });

  it('should reject invalid date strings', () => {
    const invalidDates = [
      'not-a-date',
      '2024-13-01', // invalid month
      '',
      'undefined'
    ];

    invalidDates.forEach(date => {
      expect(validators.isValidDate(date)).toBe(false);
    });
  });
});

describe('Agent Input Validation', () => {
  interface AgentInput {
    query: string;
    agentId: string;
    context?: Record<string, unknown>;
  }

  function validateAgentInput(input: unknown): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!input || typeof input !== 'object') {
      return { valid: false, errors: ['Input must be an object'] };
    }

    const data = input as Record<string, unknown>;

    if (!validators.isNonEmptyString(data.query)) {
      errors.push('Query must be a non-empty string');
    }

    if (!validators.isUUID(data.agentId as string)) {
      errors.push('agentId must be a valid UUID');
    }

    if (data.context !== undefined && (typeof data.context !== 'object' || data.context === null)) {
      errors.push('Context must be an object if provided');
    }

    return { valid: errors.length === 0, errors };
  }

  it('should accept valid agent input', () => {
    const input: AgentInput = {
      query: 'What is the revenue for Q4?',
      agentId: '550e8400-e29b-41d4-a716-446655440000',
      context: { fiscalYear: 2024 }
    };

    const result = validateAgentInput(input);
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('should reject invalid agent input', () => {
    const inputs = [
      { query: '', agentId: '550e8400-e29b-41d4-a716-446655440000' },
      { query: 'Valid query', agentId: 'not-a-uuid' },
      { query: 'Valid query', agentId: '550e8400-e29b-41d4-a716-446655440000', context: 'not-object' },
    ];

    inputs.forEach(input => {
      const result = validateAgentInput(input);
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });
  });
});

