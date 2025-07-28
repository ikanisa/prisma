import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render } from '@testing-library/react';
import { screen } from '@testing-library/dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import UnifiedDashboard from '@/pages/admin/UnifiedDashboard';
import { useUnifiedListings, useUnifiedOrders, useConversations } from '@/hooks/useUnifiedData';

// Mock the hooks
vi.mock('@/hooks/useUnifiedData', () => ({
  useUnifiedListings: vi.fn(),
  useUnifiedOrders: vi.fn(),
  useConversations: vi.fn(),
}));

// Mock navigation
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
  
  return ({ children }: { children: React.ReactNode }) => (
    <BrowserRouter>
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    </BrowserRouter>
  );
};

describe('UnifiedDashboard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders dashboard with loading state', () => {
    vi.mocked(useUnifiedListings).mockReturnValue({
      data: [],
      isLoading: true,
    } as any);
    
    vi.mocked(useUnifiedOrders).mockReturnValue({
      data: [],
      isLoading: true,
    } as any);
    
    vi.mocked(useConversations).mockReturnValue({
      data: [],
      isLoading: true,
    } as any);

    render(<UnifiedDashboard />, { wrapper: createWrapper() });

    expect(screen.getByText('Dashboard')).toBeInTheDocument();
    expect(screen.getByText('Unified view of your easyMO admin operations')).toBeInTheDocument();
  });

  it('displays metrics correctly', () => {
    const mockListings = [
      { id: '1', status: 'active', title: 'Test 1', type: 'product' },
      { id: '2', status: 'inactive', title: 'Test 2', type: 'product' },
    ];

    const mockOrders = [
      { id: '1', status: 'pending', price: 1000 },
      { id: '2', status: 'completed', price: 2000 },
    ];

    const mockConversations = [
      { id: '1', channel: 'whatsapp' },
      { id: '2', channel: 'whatsapp' },
    ];

    vi.mocked(useUnifiedListings).mockReturnValue({
      data: mockListings,
      isLoading: false,
    } as any);
    
    vi.mocked(useUnifiedOrders).mockReturnValue({
      data: mockOrders,
      isLoading: false,
    } as any);
    
    vi.mocked(useConversations).mockReturnValue({
      data: mockConversations,
      isLoading: false,
    } as any);

    render(<UnifiedDashboard />, { wrapper: createWrapper() });

    // Check metrics cards
    expect(screen.getByText('2')).toBeInTheDocument(); // Total listings
    expect(screen.getByText('1 active')).toBeInTheDocument(); // Active listings
    expect(screen.getByText('1 pending')).toBeInTheDocument(); // Pending orders
  });

  it('displays recent listings table', () => {
    const mockListings = [
      {
        id: '1',
        title: 'Test Product',
        type: 'product',
        status: 'active',
        price: 1000,
        created_at: '2024-01-01',
      },
    ];

    vi.mocked(useUnifiedListings).mockReturnValue({
      data: mockListings,
      isLoading: false,
    } as any);
    
    vi.mocked(useUnifiedOrders).mockReturnValue({
      data: [],
      isLoading: false,
    } as any);
    
    vi.mocked(useConversations).mockReturnValue({
      data: [],
      isLoading: false,
    } as any);

    render(<UnifiedDashboard />, { wrapper: createWrapper() });

    expect(screen.getByText('Recent Listings')).toBeInTheDocument();
    expect(screen.getByText('Test Product')).toBeInTheDocument();
    expect(screen.getByText('RWF 1,000')).toBeInTheDocument();
  });

  it('displays recent orders table', () => {
    const mockOrders = [
      {
        id: '1',
        status: 'pending',
        price: 2000,
        created_at: '2024-01-01',
      },
    ];

    vi.mocked(useUnifiedListings).mockReturnValue({
      data: [],
      isLoading: false,
    } as any);
    
    vi.mocked(useUnifiedOrders).mockReturnValue({
      data: mockOrders,
      isLoading: false,
    } as any);
    
    vi.mocked(useConversations).mockReturnValue({
      data: [],
      isLoading: false,
    } as any);

    render(<UnifiedDashboard />, { wrapper: createWrapper() });

    expect(screen.getByText('Recent Orders')).toBeInTheDocument();
    expect(screen.getByText('RWF 2,000')).toBeInTheDocument();
  });

  it('handles empty state correctly', () => {
    vi.mocked(useUnifiedListings).mockReturnValue({
      data: [],
      isLoading: false,
    } as any);
    
    vi.mocked(useUnifiedOrders).mockReturnValue({
      data: [],
      isLoading: false,
    } as any);
    
    vi.mocked(useConversations).mockReturnValue({
      data: [],
      isLoading: false,
    } as any);

    render(<UnifiedDashboard />, { wrapper: createWrapper() });

    expect(screen.getByText('0')).toBeInTheDocument(); // Zero metrics
    expect(screen.getByText('No listings found')).toBeInTheDocument();
    expect(screen.getByText('No orders found')).toBeInTheDocument();
  });
});