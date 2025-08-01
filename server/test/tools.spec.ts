import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';

// Mock Supabase client
const mockFrom = vi.fn().mockReturnThis();
const mockSelect = vi.fn().mockReturnThis();
const mockEq = vi.fn().mockReturnThis();
const mockOrder = vi.fn().mockReturnThis();
const mockLimit = vi.fn().mockReturnThis();
const mockInsert = vi.fn().mockReturnThis();
const mockSingle = vi.fn();

vi.mock('@supabase/supabase-js', () => ({
  createClient: () => ({
    from: mockFrom,
  }),
}));

// Mock OpenAI embeddings and chat
const fakeEmbedding = { data: [{ embedding: [0.1, 0.2, 0.3] }] };
vi.mock('openai', () => ({
  OpenAI: vi.fn().mockImplementation(() => ({
    embeddings: { create: vi.fn().mockResolvedValue(fakeEmbedding) },
  })),
}));

// Inject mock methods
mockFrom.mockImplementation(() => ({ select: mockSelect }));
mockSelect.mockImplementation(() => ({ eq: mockEq, order: mockOrder, limit: mockLimit, insert: mockInsert, single: mockSingle }));

import { toolHandlers } from '../lib/tools';

describe('toolHandlers', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('fetch_history returns combined messages', async () => {
    mockSingle.mockResolvedValue({ data: [] });
    const result = await toolHandlers.fetch_history({ thread_id: 't1', limit: 2 });
    expect(result).toHaveProperty('messages');
    expect(Array.isArray(result.messages)).toBe(true);
  });

  it('store_memory creates embedding and inserts', async () => {
    mockInsert.mockResolvedValue({});
    const res = await toolHandlers.store_memory({ thread_id: 't1', memory: 'note' });
    expect(res).toEqual({ success: true });
  });

  it('send_whatsapp errors if user not found', async () => {
    // Setup single to return no user
    mockSingle.mockResolvedValue({ data: null });
    await expect(
      toolHandlers.send_whatsapp({ thread_id: 't1', message: 'hi' })
    ).rejects.toThrow(/User not found/);
  });
});
