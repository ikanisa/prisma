import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const hoisted = vi.hoisted(() => ({
  toastMock: vi.fn(),
  useOrganizationsMock: vi.fn(),
  useParamsMock: vi.fn(),
  fetchConsolidatedTrialBalanceMock: vi.fn(),
}));

const { toastMock, useOrganizationsMock, useParamsMock, fetchConsolidatedTrialBalanceMock } = hoisted;

vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({ toast: toastMock }),
}));

vi.mock('@/hooks/use-organizations', () => ({
  useOrganizations: () => useOrganizationsMock(),
}));

vi.mock('@/lib/consolidation-service', () => ({
  fetchConsolidatedTrialBalance: (...args: unknown[]) => fetchConsolidatedTrialBalanceMock(...args),
}));

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return {
    ...actual,
    useParams: () => useParamsMock(),
  };
});

import ConsolidationPage from '@/pages/reporting/consolidation';

describe('ConsolidationPage', () => {
  beforeEach(() => {
    fetchConsolidatedTrialBalanceMock.mockReset();
    toastMock.mockReset();
    useOrganizationsMock.mockReset();
    useParamsMock.mockReset();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('notifies the user when engagement context is missing', async () => {
    useOrganizationsMock.mockReturnValue({ currentOrg: null });
    useParamsMock.mockReturnValue({ engagementId: undefined });

    render(<ConsolidationPage />);

    const button = screen.getByRole('button', { name: /consolidate trial balance/i });
    fireEvent.click(button);

    expect(toastMock).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'Missing engagement context',
      }),
    );
    expect(fetchConsolidatedTrialBalanceMock).not.toHaveBeenCalled();
  });

  it('runs the consolidation workflow and renders the result', async () => {
    useOrganizationsMock.mockReturnValue({ currentOrg: { id: 'org-1', slug: 'prisma-glow-advisors' } });
    useParamsMock.mockReturnValue({ engagementId: 'eng-42' });

    const response = {
      baseCurrency: 'USD',
      entityIds: ['eng-42', 'entity-1', 'entity-2'],
      consolidatedTrialBalance: [
        { accountId: 'cash', code: '1000', name: 'Cash and cash equivalents', amount: 1200.5, type: 'ASSET' },
        { accountId: 'loan', code: '2100', name: 'Intercompany loan', amount: -250, type: 'LIABILITY' },
      ],
      byEntity: {},
      eliminations: [{ description: 'Eliminate intercompany loan', amount: 250 }],
      summary: { assets: 1500.5, liabilities: 500.5, equity: 1000, check: 0 },
    };

    fetchConsolidatedTrialBalanceMock.mockResolvedValue(response);

    render(<ConsolidationPage />);

    const subsidiariesInput = screen.getByPlaceholderText('entity-id-1, entity-id-2');
    fireEvent.change(subsidiariesInput, { target: { value: ' entity-1 , entity-2 ' } });

    const currencyInput = screen.getByDisplayValue('EUR');
    fireEvent.change(currencyInput, { target: { value: '' } });
    fireEvent.change(currencyInput, { target: { value: 'usd' } });

    fireEvent.click(screen.getByRole('button', { name: /consolidate trial balance/i }));

    expect(fetchConsolidatedTrialBalanceMock).toHaveBeenCalledWith({
      orgId: 'org-1',
      parentEntityId: 'eng-42',
      subsidiaries: ['entity-1', 'entity-2'],
      currency: 'USD',
    });

    await screen.findByText('Consolidated trial balance');
    expect(screen.getByText('Eliminate intercompany loan')).toBeInTheDocument();
    expect(screen.getByText('Intercompany loan')).toBeInTheDocument();

    expect(toastMock).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'Consolidation complete',
      }),
    );
  });
});
