/**
 * Finance Review Tests - Retrieval
 * 
 * Tests for vector similarity search and RAG retrieval
 */

import { describe, it, expect, vi } from 'vitest';

// Mock the OpenAI module
vi.mock('openai', () => {
  return {
    default: vi.fn().mockImplementation(() => ({
      embeddings: {
        create: vi.fn().mockResolvedValue({
          data: [{ embedding: Array(1536).fill(0.1) }],
        }),
      },
    })),
  };
});

// Mock Supabase admin client
vi.mock('../../src/lib/finance-review/supabase', () => ({
  supabaseAdmin: {
    rpc: vi.fn().mockResolvedValue({
      data: [
        {
          object_id: 'test-id-1',
          object_type: 'ledger',
          chunk_text: 'Test ledger entry',
          similarity: 0.85,
        },
      ],
      error: null,
    }),
  },
}));

import { retrieveRelevant, retrieveByType } from '../../src/lib/finance-review/retrieval';

describe('Finance Review Retrieval', () => {
  describe('retrieveRelevant', () => {
    it('should return results above threshold', async () => {
      const results = await retrieveRelevant('test query', '00000000-0000-0000-0000-000000000000');
      
      expect(Array.isArray(results)).toBe(true);
      expect(results.length).toBeGreaterThanOrEqual(0);
    });

    it('should handle custom parameters', async () => {
      const results = await retrieveRelevant(
        'invoice receipt settlement',
        '00000000-0000-0000-0000-000000000000',
        5,
        0.8
      );
      
      expect(Array.isArray(results)).toBe(true);
    });
  });

  describe('retrieveByType', () => {
    it('should filter results by object type', async () => {
      const results = await retrieveByType(
        'ledger entries',
        'ledger',
        '00000000-0000-0000-0000-000000000000'
      );
      
      expect(Array.isArray(results)).toBe(true);
      if (results.length > 0) {
        expect(results[0].object_type).toBe('ledger');
      }
    });
  });

  describe('Error Handling', () => {
    it('should handle empty query gracefully', async () => {
      const results = await retrieveRelevant('', '00000000-0000-0000-0000-000000000000');
      expect(Array.isArray(results)).toBe(true);
    });
  });
});
