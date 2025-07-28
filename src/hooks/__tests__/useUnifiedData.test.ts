import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { waitFor } from '@testing-library/dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useUnifiedListings, useUnifiedOrders, useConversations } from '@/hooks/useUnifiedData';
import { supabase } from '@/integrations/supabase/client';
import React from 'react';

// Mock Supabase
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn(),
  },
}));

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
  
  return function TestWrapper({ children }: { children: React.ReactNode }) {
    return React.createElement(QueryClientProvider, { client: queryClient }, children);
  };
};

describe('useUnifiedData hooks', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('useUnifiedListings', () => {
    it('should fetch unified listings successfully', async () => {
      const mockData = [
        {
          id: '1',
          title: 'Test Product',
          type: 'product',
          status: 'active',
          price: 1000,
          owner_id: 'user1',
          created_at: '2024-01-01',
          updated_at: '2024-01-01',
        },
      ];

      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        or: vi.fn().mockReturnThis(),
        gte: vi.fn().mockReturnThis(),
        lte: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: mockData, error: null }),
      };

      vi.mocked(supabase.from).mockReturnValue(mockQuery as any);

      const { result } = renderHook(() => useUnifiedListings(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toEqual(mockData);
      expect(supabase.from).toHaveBeenCalledWith('unified_listings');
    });

    it('should apply filters correctly', async () => {
      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        or: vi.fn().mockReturnThis(),
        gte: vi.fn().mockReturnThis(),
        lte: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: [], error: null }),
      };

      vi.mocked(supabase.from).mockReturnValue(mockQuery as any);

      const filters = {
        status: 'active',
        type: 'product',
        search: 'test',
        dateFrom: '2024-01-01',
        dateTo: '2024-12-31',
      };

      renderHook(() => useUnifiedListings(filters), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(mockQuery.eq).toHaveBeenCalledWith('type', 'product');
        expect(mockQuery.eq).toHaveBeenCalledWith('status', 'active');
        expect(mockQuery.or).toHaveBeenCalledWith('title.ilike.%test%,description.ilike.%test%');
        expect(mockQuery.gte).toHaveBeenCalledWith('created_at', '2024-01-01');
        expect(mockQuery.lte).toHaveBeenCalledWith('created_at', '2024-12-31');
      });
    });
  });

  describe('useUnifiedOrders', () => {
    it('should fetch unified orders successfully', async () => {
      const mockData = [
        {
          id: '1',
          user_id: 'user1',
          quantity: 2,
          price: 2000,
          status: 'pending',
          created_at: '2024-01-01',
          updated_at: '2024-01-01',
        },
      ];

      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        gte: vi.fn().mockReturnThis(),
        lte: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: mockData, error: null }),
      };

      vi.mocked(supabase.from).mockReturnValue(mockQuery as any);

      const { result } = renderHook(() => useUnifiedOrders(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toEqual(mockData);
      expect(supabase.from).toHaveBeenCalledWith('unified_orders');
    });
  });

  describe('useConversations', () => {
    it('should fetch conversations successfully', async () => {
      const mockData = [
        {
          id: '1',
          user_id: 'user1',
          channel: 'whatsapp',
          created_at: '2024-01-01',
          updated_at: '2024-01-01',
        },
      ];

      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: mockData, error: null }),
      };

      vi.mocked(supabase.from).mockReturnValue(mockQuery as any);

      const { result } = renderHook(() => useConversations(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toEqual(mockData);
      expect(supabase.from).toHaveBeenCalledWith('conversations');
    });
  });
});