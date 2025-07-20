import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useUnifiedListings } from '@/hooks/useUnifiedListings';

// Mock Supabase
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          data: [],
          error: null
        })),
        data: [],
        error: null
      }))
    }))
  }
}));

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });
  
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
};

describe('useUnifiedListings', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should fetch listings successfully', async () => {
    const mockData = [
      {
        id: '1',
        listing_type: 'product',
        title: 'Test Product',
        price: 1000,
        status: 'active'
      }
    ];

    vi.mocked(supabase.from).mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({
          data: mockData,
          error: null
        }),
        data: mockData,
        error: null
      })
    } as any);

    const { result } = renderHook(() => useUnifiedListings(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data).toEqual(mockData);
  });

  it('should handle errors', async () => {
    const mockError = { message: 'Database error' };

    vi.mocked(supabase.from).mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({
          data: null,
          error: mockError
        }),
        data: null,
        error: mockError
      })
    } as any);

    const { result } = renderHook(() => useUnifiedListings(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });

    expect(result.current.error).toEqual(mockError);
  });

  it('should filter by listing type', async () => {
    const mockData = [
      {
        id: '1',
        listing_type: 'product',
        title: 'Test Product',
        price: 1000,
        status: 'active'
      }
    ];

    const mockSelect = vi.fn().mockReturnValue({
      eq: vi.fn().mockResolvedValue({
        data: mockData,
        error: null
      })
    });

    vi.mocked(supabase.from).mockReturnValue({
      select: mockSelect
    } as any);

    const { result } = renderHook(() => useUnifiedListings('product'), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(mockSelect).toHaveBeenCalledWith('*,businesses(name)');
  });
});