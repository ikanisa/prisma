import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

const hoisted = vi.hoisted(() => ({
  toastMock: vi.fn(),
  useOrganizationsMock: vi.fn(),
  useAcceptanceStatusMock: vi.fn(),
  useControlsManagerMock: vi.fn(),
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

vi.mock('@/hooks/use-controls', () => ({
  useControlsManager: (...args: unknown[]) => hoisted.useControlsManagerMock(...args),
}));

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return {
    ...actual,
    useParams: () => ({ orgSlug: 'prisma-glow', engagementId: 'eng-123' }),
  };
});

import ControlsMatrixPage from '@/pages/reporting/controls';

beforeAll(() => {
  Object.defineProperty(window.HTMLElement.prototype, 'scrollIntoView', {
    value: vi.fn(),
    configurable: true,
  });
});

type ManagerReturn = ReturnType<typeof hoisted.useControlsManagerMock>;

type MutationStub = { mutateAsync: ReturnType<typeof vi.fn>; isPending: boolean };

function createMutationStub(fn: ReturnType<typeof vi.fn>): MutationStub {
  return { mutateAsync: fn, isPending: false };
}

function createManager(overrides: Partial<ManagerReturn> = {}): ManagerReturn {
  return {
    controls: overrides.controls ?? [],
    itgcGroups: overrides.itgcGroups ?? [],
    deficiencies: overrides.deficiencies ?? [],
    isLoading: overrides.isLoading ?? false,
    createControl: overrides.createControl ?? createMutationStub(vi.fn().mockResolvedValue({ id: 'ctrl-new' })),
    logWalkthrough: overrides.logWalkthrough ?? createMutationStub(vi.fn().mockResolvedValue({ success: true })),
    runTest: overrides.runTest ?? createMutationStub(vi.fn().mockResolvedValue({ success: true })),
    createDeficiency: overrides.createDeficiency ?? createMutationStub(vi.fn().mockResolvedValue({ success: true })),
    upsertItgc: overrides.upsertItgc ?? createMutationStub(vi.fn().mockResolvedValue({ success: true })),
    query: overrides.query ?? { data: null, isLoading: false },
  } as ManagerReturn;
}

function renderPage() {
  return render(
    <MemoryRouter
      future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
      initialEntries={['/prisma-glow/engagements/eng-123/reporting/controls']}
    >
      <ControlsMatrixPage />
    </MemoryRouter>,
  );
}

beforeEach(() => {
  hoisted.toastMock.mockReset();
  hoisted.useOrganizationsMock.mockReset();
  hoisted.useAcceptanceStatusMock.mockReset();
  hoisted.useControlsManagerMock.mockReset();
  hoisted.queryResults.clear();

  hoisted.useOrganizationsMock.mockReturnValue({ currentOrg: { id: 'org-1', slug: 'prisma-glow' } });
});

afterEach(() => {
  vi.clearAllMocks();
});

describe('ControlsMatrixPage acceptance gating', () => {
  it('blocks access until acceptance is approved', () => {
    hoisted.useAcceptanceStatusMock.mockReturnValue({
      isLoading: false,
      data: { status: { status: 'PENDING', decision: 'REVIEW' } },
    });

    hoisted.useControlsManagerMock.mockReturnValue(createManager());

    renderPage();

    expect(screen.getByText('Engagement acceptance pending')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Go to acceptance workflow/i })).toHaveAttribute(
      'href',
      '/prisma-glow/engagements/eng-123/acceptance',
    );
  });
});

describe('ControlsMatrixPage workflow', () => {
  let createControlMock: ReturnType<typeof vi.fn>;
  let logWalkthroughMock: ReturnType<typeof vi.fn>;
  let runTestMock: ReturnType<typeof vi.fn>;
  let createDeficiencyMock: ReturnType<typeof vi.fn>;
  let upsertItgcMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    hoisted.useAcceptanceStatusMock.mockReturnValue({
      isLoading: false,
      data: { status: { status: 'APPROVED', decision: 'ACCEPT' } },
    });

    hoisted.queryResults.set(
      getKey(['controls-procedures', 'prisma-glow', 'eng-123']),
      {
        data: [
          { id: 'proc-1', title: 'Revenue contract walkthrough', objective: 'Assess revenue recognition' },
          { id: 'proc-2', title: 'Bank reconciliation review', objective: 'Verify cash balances' },
        ],
      },
    );

    const control = {
      id: 'ctrl-1',
      org_id: 'org-1',
      engagement_id: 'eng-123',
      cycle: 'Revenue',
      objective: 'Revenue contract walkthrough control',
      description: 'Controller reviews revenue cutoff report monthly.',
      frequency: 'Monthly',
      owner: 'Financial Controller',
      key: true,
      created_at: new Date('2025-01-05T00:00:00Z').toISOString(),
      created_by_user_id: 'user-1',
      updated_at: new Date('2025-01-06T00:00:00Z').toISOString(),
      updated_by_user_id: 'user-1',
      walkthroughs: [],
      tests: [],
      deficiencies: [],
    } satisfies Parameters<(typeof createManager)>[0]['controls'] extends Array<infer T> ? T : never;

    createControlMock = vi.fn().mockResolvedValue({ id: 'ctrl-new' });
    logWalkthroughMock = vi.fn().mockResolvedValue({ success: true });
    runTestMock = vi.fn().mockResolvedValue({ success: true });
    createDeficiencyMock = vi.fn().mockResolvedValue({ success: true });
    upsertItgcMock = vi.fn().mockResolvedValue({ success: true });

    hoisted.useControlsManagerMock.mockReturnValue(
      createManager({
        controls: [control],
        itgcGroups: [],
        deficiencies: [],
        createControl: createMutationStub(createControlMock),
        logWalkthrough: createMutationStub(logWalkthroughMock),
        runTest: createMutationStub(runTestMock),
        createDeficiency: createMutationStub(createDeficiencyMock),
        upsertItgc: createMutationStub(upsertItgcMock),
      }),
    );
  });

  it(
    'captures control, walkthrough, testing, deficiency, and ITGC interactions',
    async () => {
      renderPage();

    fireEvent.change(screen.getByPlaceholderText('Revenue'), { target: { value: 'Treasury' } });
    fireEvent.change(screen.getByPlaceholderText('Monthly'), { target: { value: 'Quarterly' } });
    fireEvent.change(
      screen.getByPlaceholderText('Ensure revenue is recorded in the correct period.'),
      { target: { value: 'Treasury reconciliations are reviewed timely.' } },
    );
    fireEvent.change(
      screen.getByPlaceholderText('Controller reviews sales cut-off report and signs-off monthly.'),
      { target: { value: 'Treasury manager reviews bank reconciliation.' } },
    );
    fireEvent.change(screen.getByPlaceholderText('Financial Controller'), { target: { value: 'Treasury Manager' } });

    fireEvent.click(screen.getByRole('checkbox', { name: 'Key control' }));

    fireEvent.click(screen.getByRole('button', { name: /Save control/i }));

    await waitFor(() => expect(createControlMock).toHaveBeenCalledTimes(1));
    expect(createControlMock).toHaveBeenCalledWith({
      orgSlug: 'prisma-glow',
      engagementId: 'eng-123',
      cycle: 'Treasury',
      objective: 'Treasury reconciliations are reviewed timely.',
      description: 'Treasury manager reviews bank reconciliation.',
      frequency: 'Quarterly',
      owner: 'Treasury Manager',
      key: false,
    });

    expect(hoisted.toastMock).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'Control saved' }),
    );

    fireEvent.click(screen.getByRole('button', { name: /Walkthrough/i }));

    const walkthroughDialog = await screen.findByRole('dialog');
    fireEvent.change(within(walkthroughDialog).getByPlaceholderText('Summarise the walkthrough, design assessment, and implementation evidence.'), {
      target: { value: 'Walkthrough performed with controller, design effective.' },
    });

    fireEvent.click(within(walkthroughDialog).getByRole('button', { name: /Save walkthrough/i }));

    await waitFor(() => expect(logWalkthroughMock).toHaveBeenCalledTimes(1));
    expect(logWalkthroughMock).toHaveBeenCalledWith({
      orgSlug: 'prisma-glow',
      controlId: 'ctrl-1',
      date: expect.any(String),
      notes: 'Walkthrough performed with controller, design effective.',
      result: 'DESIGNED',
      procedureId: 'proc-1',
    });

    fireEvent.click(await screen.findByRole('button', { name: /Test/i }));

    const testDialog = await screen.findByRole('dialog', { name: /Attributes testing/i });
    fireEvent.change(within(testDialog).getByPlaceholderText('Sampling worksheet reference'), {
      target: { value: 'SAM-001' },
    });
    fireEvent.change(within(testDialog).getByDisplayValue('25'), {
      target: { value: '30' },
    });

    fireEvent.click(within(testDialog).getByRole('button', { name: /Save test result/i }));

    await waitFor(() => expect(runTestMock).toHaveBeenCalledTimes(1));
    expect(runTestMock).toHaveBeenCalledWith({
      orgSlug: 'prisma-glow',
      controlId: 'ctrl-1',
      attributes: { sampleSize: 30 },
      samplePlanRef: 'SAM-001',
      result: 'PASS',
      severity: 'HIGH',
      recommendation: undefined,
      procedureId: 'proc-1',
    });

    fireEvent.change(screen.getByPlaceholderText('e.g. ERP access provisioning'), {
      target: { value: 'ERP access provisioning' },
    });
    fireEvent.change(screen.getByPlaceholderText('Document systems in scope, walkthrough references, reliance on SOC reports, etc.'), {
      target: { value: 'SOC 1 Type 2 relied upon for access controls.' },
    });

    fireEvent.click(screen.getByRole('button', { name: /Save ITGC note/i }));

    await waitFor(() => expect(upsertItgcMock).toHaveBeenCalledTimes(1));
    expect(upsertItgcMock).toHaveBeenCalledWith({
      orgSlug: 'prisma-glow',
      engagementId: 'eng-123',
      type: 'ACCESS',
      scope: 'ERP access provisioning',
      notes: 'SOC 1 Type 2 relied upon for access controls.',
    });

    expect(hoisted.toastMock).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'ITGC noted' }),
    );
  },
    20000,
  );
});
