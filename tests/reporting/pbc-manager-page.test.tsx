import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const hoisted = vi.hoisted(() => ({
  toastMock: vi.fn(),
  useOrganizationsMock: vi.fn(),
  useAcceptanceStatusMock: vi.fn(),
  usePbcManagerMock: vi.fn(),
  queryResults: new Map<string, { data?: unknown; isLoading?: boolean }>(),
}));

const getKey = (input: unknown) => JSON.stringify(input ?? []);

vi.mock('@tanstack/react-query', () => ({
  useQuery: (options: { queryKey: unknown }) => {
    const key = getKey(options.queryKey);
    const override = hoisted.queryResults.get(key) ?? {};
    return {
      data: override.data,
      isLoading: override.isLoading ?? false,
    };
  },
}));

vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({ toast: hoisted.toastMock }),
}));

vi.mock('@/hooks/use-organizations', () => ({
  useOrganizations: () => hoisted.useOrganizationsMock(),
}));

vi.mock('@/hooks/use-acceptance-status', () => ({
  useAcceptanceStatus: (...args: unknown[]) => hoisted.useAcceptanceStatusMock(...args),
}));

vi.mock('@/hooks/use-pbc', () => ({
  usePbcManager: (...args: unknown[]) => hoisted.usePbcManagerMock(...args),
}));

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return {
    ...actual,
    useParams: () => ({ orgSlug: 'prisma-glow', engagementId: 'eng-123' }),
  };
});

import PbcManagerPage from '@/pages/reporting/pbc';

type ManagerReturn = ReturnType<typeof hoisted.usePbcManagerMock>;

beforeAll(() => {
  Object.defineProperty(window.HTMLElement.prototype, 'scrollIntoView', {
    value: vi.fn(),
    configurable: true,
  });
});

function createManager(overrides: Partial<ManagerReturn> = {}): ManagerReturn {
  return {
    requests: overrides.requests ?? [],
    isLoading: overrides.isLoading ?? false,
    instantiate:
      overrides.instantiate ??
      ({ mutateAsync: vi.fn().mockResolvedValue(undefined), isPending: false } as ManagerReturn['instantiate']),
    updateStatus:
      overrides.updateStatus ??
      ({ mutateAsync: vi.fn().mockResolvedValue(undefined), isPending: false } as ManagerReturn['updateStatus']),
    remind:
      overrides.remind ?? ({ mutateAsync: vi.fn().mockResolvedValue(undefined), isPending: false } as ManagerReturn['remind']),
  } as ManagerReturn;
}

function renderPage() {
  return render(
    <MemoryRouter
      future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
      initialEntries={['/prisma-glow/engagements/eng-123/reporting/pbc']}
    >
      <PbcManagerPage />
    </MemoryRouter>,
  );
}

beforeEach(() => {
  hoisted.toastMock.mockReset();
  hoisted.useOrganizationsMock.mockReset();
  hoisted.useAcceptanceStatusMock.mockReset();
  hoisted.usePbcManagerMock.mockReset();
  hoisted.queryResults.clear();

  hoisted.useOrganizationsMock.mockReturnValue({ currentOrg: { id: 'org-1', slug: 'prisma-glow' } });
});

afterEach(() => {
  vi.clearAllMocks();
});

describe('PbcManagerPage acceptance gating', () => {
  it('blocks access until acceptance is approved', () => {
    hoisted.useAcceptanceStatusMock.mockReturnValue({
      isLoading: false,
      data: { status: { status: 'PENDING', decision: 'REVIEW' } },
    });

    hoisted.usePbcManagerMock.mockReturnValue(createManager());

    renderPage();

    expect(screen.getByText('Engagement acceptance pending')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Go to acceptance workflow/i })).toHaveAttribute(
      'href',
      '/prisma-glow/engagements/eng-123/acceptance',
    );
  });
});

describe('PbcManagerPage workflow', () => {
  beforeEach(() => {
    hoisted.useAcceptanceStatusMock.mockReturnValue({
      isLoading: false,
      data: { status: { status: 'APPROVED', decision: 'ACCEPT' } },
    });

    hoisted.queryResults.set(
      getKey(['pbc-procedures', 'prisma-glow', 'eng-123']),
      {
        data: [
          { id: 'proc-1', title: 'Bank reconciliation review', objective: 'Verify bank balances' },
          { id: 'proc-2', title: 'Revenue contract walkthrough', objective: 'Assess revenue recognition' },
        ],
      },
    );

    hoisted.queryResults.set(
      getKey(['pbc-documents', 'org-1', 'eng-123']),
      {
        data: [
          { id: 'doc-1', name: 'Bank statements.pdf', created_at: '2025-01-02T00:00:00Z' },
        ],
      },
    );
  });

  it('instantiates templates using procedure matching and surfaces success toasts', async () => {
    const instantiateMock = vi.fn().mockResolvedValue(undefined);

    hoisted.usePbcManagerMock.mockReturnValue(
      createManager({
        requests: [],
        instantiate: { mutateAsync: instantiateMock, isPending: false },
      }),
    );

    renderPage();

    const trigger = screen.getByRole('combobox');
    fireEvent.click(trigger);
    const option = await screen.findByRole('option', { name: 'Revenue cycle' });
    fireEvent.click(option);

    const createButton = await screen.findByRole('button', { name: 'Create requests' });
    fireEvent.click(createButton);

    await waitFor(() => expect(instantiateMock).toHaveBeenCalledTimes(1));

    const payload = instantiateMock.mock.calls[0][0] as any;
    expect(payload.orgSlug).toBe('prisma-glow');
    expect(payload.engagementId).toBe('eng-123');
    expect(payload.cycle).toBe('Revenue');

    const items = payload.items as Array<Record<string, unknown>>;
    expect(items).toHaveLength(3);
    expect(items[0]).toMatchObject({ item: expect.stringContaining('Sales contracts'), procedureId: 'proc-2' });

    await waitFor(() =>
      expect(hoisted.toastMock).toHaveBeenCalledWith(
        expect.objectContaining({ title: 'Revenue PBC list created', description: expect.stringContaining('3 items') }),
      ),
    );
  });
});
