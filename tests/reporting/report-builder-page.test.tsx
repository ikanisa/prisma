import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const hoisted = vi.hoisted(() => ({
  toastMock: vi.fn(),
  useOrganizationsMock: vi.fn(),
  useReportBuilderMock: vi.fn(),
  useAcceptanceStatusMock: vi.fn(),
  useKamModuleMock: vi.fn(),
  fetchFinancialNotesMock: vi.fn(),
  requestEsefExportMock: vi.fn(),
  useParamsMock: vi.fn(),
}));

vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({ toast: hoisted.toastMock }),
}));

vi.mock('@/hooks/use-organizations', () => ({
  useOrganizations: () => hoisted.useOrganizationsMock(),
}));

vi.mock('@/hooks/use-report-builder', () => ({
  useReportBuilder: (...args: unknown[]) => hoisted.useReportBuilderMock(...args),
}));

vi.mock('@/hooks/use-acceptance-status', () => ({
  useAcceptanceStatus: (...args: unknown[]) => hoisted.useAcceptanceStatusMock(...args),
}));

vi.mock('@/hooks/use-kam-module', () => ({
  useKamModule: (...args: unknown[]) => hoisted.useKamModuleMock(...args),
}));

vi.mock('@/lib/financial-report-service', () => ({
  fetchFinancialNotes: (...args: unknown[]) => hoisted.fetchFinancialNotesMock(...args),
  requestEsefExport: (...args: unknown[]) => hoisted.requestEsefExportMock(...args),
}));

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return {
    ...actual,
    useParams: () => hoisted.useParamsMock(),
  };
});

import ReportBuilderPage from '@/pages/reporting/report';

type ReportBuilderHook = ReturnType<typeof hoisted.useReportBuilderMock>;

type ReportDraft = NonNullable<ReportBuilderHook['report']>;

function createReportBuilder(overrides: Partial<ReportBuilderHook> = {}): ReportBuilderHook {
  const baseReport: ReportDraft | null = overrides.report ?? null;
  const decisionTreeResult = overrides.decisionTree ?? {
    mutateAsync: vi.fn(),
    isPending: false,
    data: null,
  };
  return {
    report: baseReport,
    approvals: overrides.approvals ?? [],
    isLoading: overrides.isLoading ?? false,
    create: overrides.create ?? { mutate: vi.fn(), isPending: false },
    update:
      overrides.update ??
      ({ mutateAsync: vi.fn().mockResolvedValue(undefined), isPending: false } as ReportBuilderHook['update']),
    submit:
      overrides.submit ??
      ({ mutateAsync: vi.fn().mockResolvedValue(undefined), isPending: false } as ReportBuilderHook['submit']),
    release:
      overrides.release ??
      ({ mutateAsync: vi.fn().mockResolvedValue(undefined), isPending: false } as ReportBuilderHook['release']),
    exportPdf:
      overrides.exportPdf ??
      ({ mutateAsync: vi.fn().mockResolvedValue({ path: '/tmp/report.pdf' }), isPending: false } as ReportBuilderHook['exportPdf']),
    decisionTree: decisionTreeResult as ReportBuilderHook['decisionTree'],
    decisionTreeError: overrides.decisionTreeError ?? null,
  } as ReportBuilderHook;
}

function renderWithRouter() {
  return render(
    <MemoryRouter
      future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
      initialEntries={['/prisma-glow/engagements/eng-123/reporting/report']}
    >
      <ReportBuilderPage />
    </MemoryRouter>,
  );
}

beforeEach(() => {
  hoisted.toastMock.mockReset();
  hoisted.useOrganizationsMock.mockReset();
  hoisted.useReportBuilderMock.mockReset();
  hoisted.useAcceptanceStatusMock.mockReset();
  hoisted.useKamModuleMock.mockReset();
  hoisted.fetchFinancialNotesMock.mockReset();
  hoisted.requestEsefExportMock.mockReset();
  hoisted.useParamsMock.mockReset();

  hoisted.useParamsMock.mockReturnValue({ engagementId: 'eng-123', orgSlug: 'prisma-glow' });
  hoisted.useOrganizationsMock.mockReturnValue({ currentOrg: { id: 'org-1', slug: 'prisma-glow' } });
  hoisted.useKamModuleMock.mockReturnValue({ data: { drafts: [] }, isLoading: false });
});

afterEach(() => {
  vi.clearAllTimers();
});

describe('ReportBuilderPage acceptance gating', () => {
  it('shows locked state when acceptance is not approved', () => {
    hoisted.useAcceptanceStatusMock.mockReturnValue({
      isLoading: false,
      data: { status: { status: 'PENDING', decision: 'REVIEW' } },
    });

    hoisted.useReportBuilderMock.mockReturnValue(createReportBuilder());

    renderWithRouter();

    expect(screen.getByText('Report builder locked')).toBeInTheDocument();
    expect(screen.getByText(/Engagement acceptance must be approved/i)).toBeInTheDocument();
  });
});

describe('ReportBuilderPage workflow', () => {
  let reportBuilder: ReportBuilderHook;

  beforeEach(() => {
    const reportDraft = {
      id: 'report-1',
      opinion: 'UNMODIFIED' as const,
      basis_for_opinion: 'Existing basis',
      include_eom: false,
      eom_text: '',
      include_om: false,
      om_text: '',
      incorporate_kams: true,
      kam_ids: ['kam-approved'],
      gc_disclosure_required: false,
      status: 'DRAFT',
      updated_at: new Date('2025-01-15T10:00:00Z').toISOString(),
      period_id: 'period-123',
      draft_html: '<p>Draft preview</p>',
      title: 'FY25',
    } satisfies ReportDraft;

    const updateMock = {
      mutateAsync: vi.fn().mockResolvedValue(undefined),
      isPending: false,
    } as ReportBuilderHook['update'];

    const submitMock = {
      mutateAsync: vi.fn().mockResolvedValue(undefined),
      isPending: false,
    } as ReportBuilderHook['submit'];

    const releaseMock = {
      mutateAsync: vi.fn().mockResolvedValue(undefined),
      isPending: false,
    } as ReportBuilderHook['release'];

    const exportMock = {
      mutateAsync: vi.fn().mockResolvedValue({ path: '/tmp/report.pdf' }),
      isPending: false,
    } as ReportBuilderHook['exportPdf'];

    const decisionTreeResult = {
      mutateAsync: vi.fn().mockImplementation(async () => {
        const result = {
          recommendedOpinion: 'QUALIFIED' as const,
          requiredSections: ['BASIS', 'EOM'],
          reasons: ['Significant uncertainty'],
          goingConcernMaterialUncertainty: true,
        };
        (reportBuilder.decisionTree as any).data = result;
        return result;
      }),
      isPending: false,
      data: null,
    } as ReportBuilderHook['decisionTree'];

    reportBuilder = createReportBuilder({
      report: reportDraft,
      approvals: [
        {
          id: 'approval-1',
          stage: 'MANAGER',
          status: 'PENDING',
          created_at: '2025-01-10T12:00:00Z',
          resolution_note: null,
        },
      ],
      update: updateMock,
      submit: submitMock,
      release: releaseMock,
      exportPdf: exportMock,
      decisionTree: decisionTreeResult,
    });

    hoisted.useAcceptanceStatusMock.mockReturnValue({
      isLoading: false,
      data: { status: { status: 'APPROVED', decision: 'ACCEPT' } },
    });

    hoisted.useKamModuleMock.mockReturnValue({
      data: {
        drafts: [
          { id: 'kam-approved', heading: 'Revenue recognition', why_kam: 'Complex contracts', status: 'APPROVED' },
          { id: 'kam-draft', heading: 'Tax provisions', why_kam: 'Ongoing disputes', status: 'DRAFT' },
        ],
      },
      isLoading: false,
    });

    hoisted.fetchFinancialNotesMock.mockResolvedValue({
      notes: [
        {
          standard: 'IFRS 15',
          title: 'Revenue from Contracts with Customers',
          content: 'Detailed disclosure',
        },
      ],
    });

    hoisted.requestEsefExportMock.mockResolvedValue(
      new Response(new Blob(['dummy']), { headers: { 'Content-Type': 'application/zip' } }),
    );

    hoisted.useReportBuilderMock.mockImplementation(() => reportBuilder);
  });

  it('saves updates, evaluates decision tree, and refreshes notes', async () => {
    renderWithRouter();

    expect(screen.getByText('Audit Report Builder')).toBeInTheDocument();

    const basisField = screen.getByDisplayValue('Existing basis');
    fireEvent.change(basisField, { target: { value: 'Updated basis for opinion' } });

    const eomSection = screen.getByText('Include Emphasis of Matter').closest('div');
    const eomSwitch = eomSection?.querySelector('[role="switch"]') as HTMLElement;
    fireEvent.click(eomSwitch);

    const eomTextarea = await screen.findByPlaceholderText(
      'Summarise the disclosed matter and reference financial statement note.',
    );
    fireEvent.change(eomTextarea, { target: { value: 'EOM paragraph' } });

    const gcSection = screen.getByText(/Material uncertainty related to going concern/i).closest('div');
    const gcSwitch = gcSection?.querySelector('[role="switch"]') as HTMLElement;
    fireEvent.click(gcSwitch);

    fireEvent.click(screen.getByRole('button', { name: 'Evaluate opinion' }));

    await waitFor(() => expect(reportBuilder.decisionTree.mutateAsync).toHaveBeenCalledTimes(1));
    expect(hoisted.toastMock).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'Decision tree evaluated', description: expect.stringContaining('QUALIFIED') }),
    );
    expect(reportBuilder.decisionTree.data).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: 'Save draft' }));

    await waitFor(() => expect(reportBuilder.update.mutateAsync).toHaveBeenCalledTimes(1));
    expect(reportBuilder.update.mutateAsync).toHaveBeenCalledWith({
      reportId: 'report-1',
      opinion: 'QUALIFIED',
      basisForOpinion: 'Updated basis for opinion',
      includeEOM: true,
      eomText: 'EOM paragraph',
      includeOM: false,
      omText: '',
      incorporateKAMs: true,
      kamIds: ['kam-approved'],
      gcDisclosureRequired: true,
    });
    expect(hoisted.toastMock).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'Report saved', description: 'Report draft updated successfully.' }),
    );

    fireEvent.click(screen.getByRole('button', { name: 'Refresh notes' }));

    await waitFor(() => expect(hoisted.fetchFinancialNotesMock).toHaveBeenCalledWith({
      orgId: 'org-1',
      entityId: 'eng-123',
      periodId: 'period-123',
      basis: 'IFRS_EU',
    }));

    await screen.findByText('IFRS 15');
    expect(screen.getByText('Revenue from Contracts with Customers')).toBeInTheDocument();
  });

  it('sanitizes the report preview HTML before rendering', () => {
    const maliciousHtml =
      "<img src='x' onerror=\"alert('xss')\"><p>Visible text</p><script>alert('boom')</script>";

    reportBuilder.report = {
      ...(reportBuilder.report as ReportDraft),
      draft_html: maliciousHtml,
    };

    const { container } = renderWithRouter();

    expect(screen.getByText('Visible text')).toBeInTheDocument();
    expect(container.querySelector('script')).toBeNull();

    const image = container.querySelector('img');
    expect(image).not.toBeNull();
    expect(image?.getAttribute('onerror')).toBeNull();
  });
});
