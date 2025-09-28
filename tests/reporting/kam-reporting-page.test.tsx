import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

const hoisted = vi.hoisted(() => ({
  toastMock: vi.fn(),
  useOrganizationsMock: vi.fn(),
  useAcceptanceStatusMock: vi.fn(),
  useKamModuleMock: vi.fn(),
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

vi.mock('@/hooks/use-kam-module', () => ({
  useKamModule: (...args: unknown[]) => hoisted.useKamModuleMock(...args),
  findDraftByCandidate: (drafts: any[], candidateId: string) => drafts.find((draft) => draft.candidate_id === candidateId) ?? null,
  candidateStatusLabel: (candidate: { status: string }) => candidate.status,
}));

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return {
    ...actual,
    useParams: () => ({ orgSlug: 'aurora', engagementId: 'eng-123' }),
  };
});

import { KamReportingPage } from '@/pages/reporting/kam';

beforeAll(() => {
  Object.defineProperty(window.HTMLElement.prototype, 'scrollIntoView', {
    value: vi.fn(),
    configurable: true,
  });
});

afterEach(() => {
  vi.clearAllMocks();
});

type KamModuleReturn = ReturnType<typeof hoisted.useKamModuleMock>;

type MutationStub = { mutateAsync: ReturnType<typeof vi.fn>; isPending: boolean };

const createMutation = (fn: ReturnType<typeof vi.fn>): MutationStub => ({ mutateAsync: fn, isPending: false });

function createKamModule(overrides: Partial<KamModuleReturn> = {}): KamModuleReturn {
  const base = {
    data: {
      candidates: [],
      drafts: [],
      approvals: [],
      role: 'MANAGER' as const,
    },
    isLoading: false,
    updateDraft: createMutation(vi.fn().mockResolvedValue({ success: true })),
    submitDraft: createMutation(vi.fn().mockResolvedValue({ success: true })),
    selectCandidate: createMutation(vi.fn().mockResolvedValue({ success: true })),
    excludeCandidate: createMutation(vi.fn().mockResolvedValue({ success: true })),
    createDraft: createMutation(vi.fn().mockResolvedValue({ draft: { id: 'draft-new' } })),
    addCandidate: createMutation(vi.fn().mockResolvedValue({ success: true })),
    decideApproval: createMutation(vi.fn().mockResolvedValue({ success: true })),
  } as unknown as KamModuleReturn;
  return {
    ...base,
    ...overrides,
    data: { ...base.data, ...(overrides.data ?? {}) },
  };
}

function renderPage() {
  return render(
    <MemoryRouter initialEntries={['/aurora/engagements/eng-123/reporting/kam']}>
      <KamReportingPage />
    </MemoryRouter>,
  );
}

beforeEach(() => {
  hoisted.toastMock.mockReset();
  hoisted.useOrganizationsMock.mockReset();
  hoisted.useAcceptanceStatusMock.mockReset();
  hoisted.useKamModuleMock.mockReset();
  hoisted.queryResults.clear();

  hoisted.useOrganizationsMock.mockReturnValue({ currentOrg: { id: 'org-1', slug: 'aurora' } });
});

describe('KamReportingPage acceptance gating', () => {
  it('locks the module until acceptance is approved', () => {
    hoisted.useAcceptanceStatusMock.mockReturnValue({
      isLoading: false,
      data: { status: { status: 'PENDING', decision: 'REVIEW' } },
    });

    hoisted.useKamModuleMock.mockReturnValue(createKamModule());

    renderPage();

    expect(screen.getByText('KAM module locked')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Go to acceptance workflow/i })).toHaveAttribute(
      'href',
      '/aurora/engagements/eng-123/acceptance',
    );
  });
});

describe('KamReportingPage workflow', () => {
  let moduleImpl: KamModuleReturn;
  let updateDraftMock: ReturnType<typeof vi.fn>;
  let submitDraftMock: ReturnType<typeof vi.fn>;
  let selectCandidateMock: ReturnType<typeof vi.fn>;
  let excludeCandidateMock: ReturnType<typeof vi.fn>;
  let createDraftMock: ReturnType<typeof vi.fn>;
  let addCandidateMock: ReturnType<typeof vi.fn>;
  let decideApprovalMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    hoisted.useAcceptanceStatusMock.mockReturnValue({
      isLoading: false,
      data: { status: { status: 'APPROVED', decision: 'ACCEPT' } },
    });

    hoisted.queryResults.set(
      getKey(['kam-procedures', 'aurora', 'eng-123']),
      {
        data: [
          { id: 'proc-1', title: 'Revenue walkthrough', objective: 'Walkthrough revenue process', coverageAssertions: ['ISA 540'] },
        ],
      },
    );

    hoisted.queryResults.set(
      getKey(['kam-documents', 'aurora', 'eng-123']),
      {
        data: [
          { id: 'doc-1', name: 'Revenue memo.pdf', created_at: '2025-01-15T00:00:00Z' },
        ],
      },
    );

    hoisted.queryResults.set(
      getKey(['kam-risks', 'aurora', 'eng-123']),
      {
        data: [
          { id: 'risk-1', title: 'Complex revenue arrangements' },
        ],
      },
    );

    updateDraftMock = vi.fn().mockResolvedValue({ success: true });
    submitDraftMock = vi.fn().mockResolvedValue({ success: true });
    selectCandidateMock = vi.fn().mockResolvedValue({ success: true });
    excludeCandidateMock = vi.fn().mockResolvedValue({ success: true });
    createDraftMock = vi.fn().mockResolvedValue({ draft: { id: 'draft-2', candidate_id: 'cand-2' } });
    addCandidateMock = vi.fn().mockResolvedValue({ success: true });
    decideApprovalMock = vi.fn().mockResolvedValue({ success: true });

    moduleImpl = createKamModule({
      data: {
        role: 'MANAGER',
        candidates: [
          {
            id: 'cand-1',
            title: 'Revenue bundling',
            rationale: 'Complex bundled contracts',
            status: 'SELECTED',
            source: 'RISK',
            created_at: '2025-01-10T00:00:00Z',
          },
          {
            id: 'cand-2',
            title: 'Tax valuation',
            rationale: 'Valuation uncertainty',
            status: 'SELECTED',
            source: 'OTHER',
            created_at: '2025-01-11T00:00:00Z',
          },
          {
            id: 'cand-3',
            title: 'Going concern liquidity',
            rationale: 'Working capital shortfall',
            status: 'CANDIDATE',
            source: 'GOING_CONCERN',
            created_at: '2025-01-12T00:00:00Z',
          },
        ],
        drafts: [
          {
            id: 'draft-1',
            candidate_id: 'cand-1',
            heading: 'Revenue bundled contracts',
            why_kam: 'High estimation uncertainty',
            how_addressed: '',
            results_summary: '',
            procedures_refs: [],
            evidence_refs: [],
            status: 'DRAFT',
          },
        ],
        approvals: [
          {
            id: 'approval-1',
            draft_id: 'draft-1',
            stage: 'MANAGER',
            status: 'PENDING',
            created_at: '2025-01-15T12:00:00Z',
            resolution_note: null,
          },
        ],
      },
      updateDraft: createMutation(updateDraftMock),
      submitDraft: createMutation(submitDraftMock),
      selectCandidate: createMutation(selectCandidateMock),
      excludeCandidate: createMutation(excludeCandidateMock),
      createDraft: createMutation(createDraftMock),
      addCandidate: createMutation(addCandidateMock),
      decideApproval: createMutation(decideApprovalMock),
    });

    hoisted.useKamModuleMock.mockReturnValue(moduleImpl);
  });

  it(
    'covers candidate, drafting, approval, and export interactions',
    async () => {
      renderPage();

      fireEvent.change(screen.getByPlaceholderText('e.g. Revenue recognition for bundled contracts'), {
        target: { value: 'Cybersecurity controls' },
      });
      fireEvent.change(screen.getByPlaceholderText('Summarise why the matter may be a KAM'), {
        target: { value: 'Significant cyber incident identified.' },
      });

      const [sourceSelect] = screen.getAllByRole('combobox');
      fireEvent.click(sourceSelect);
      fireEvent.click(await screen.findByRole('option', { name: 'Significant Risk' }));

      const riskSelect = screen.getAllByRole('combobox')[1];
      fireEvent.click(riskSelect);
      const riskOption = await screen.findByRole('option', { name: /Complex revenue arrangements/i });
      fireEvent.click(riskOption);

      fireEvent.click(screen.getByRole('button', { name: /Add candidate/i }));
      await waitFor(() => expect(addCandidateMock).toHaveBeenCalledWith({
        orgSlug: 'aurora',
        engagementId: 'eng-123',
        title: 'Cybersecurity controls',
        rationale: 'Significant cyber incident identified.',
        source: 'RISK',
        riskId: 'risk-1',
        estimateId: undefined,
        goingConcernId: undefined,
      }));

      fireEvent.click(screen.getByRole('button', { name: /Revenue bundling/ }));

      fireEvent.change(screen.getByLabelText('Heading'), {
        target: { value: 'Updated KAM heading' },
      });
      fireEvent.change(screen.getByLabelText('Why it was a KAM'), {
        target: { value: 'Because revenue involves significant judgement.' },
      });
      fireEvent.change(screen.getByLabelText('How we addressed the matter'), {
        target: { value: 'Performed detailed walkthroughs.' },
      });
      fireEvent.change(screen.getByLabelText('Results'), {
        target: { value: 'No material misstatements identified.' },
      });

      const procedureCard = screen.getByText('Revenue walkthrough').closest('div[class*="border"]');
      const procedureLink = within(procedureCard!).getByRole('button', { name: 'Link' });
      fireEvent.click(procedureLink);
      const procedureTextbox = within(procedureCard!).getByRole('textbox');
      fireEvent.change(procedureTextbox, {
        target: { value: 'ISA 540, ISA 330' },
      });

      const documentCard = screen.getByText(/Document — Revenue memo\.pdf/).closest('div[class*="border"]');
      const documentLink = within(documentCard!).getByRole('button', { name: 'Link' });
      fireEvent.click(documentLink);
      const documentNoteInput = within(documentCard!).getByRole('textbox');
      fireEvent.change(documentNoteInput, {
        target: { value: 'Evidence reviewed by partner.' },
      });

      fireEvent.click(screen.getByRole('button', { name: /Save draft/i }));

      await waitFor(() => expect(updateDraftMock).toHaveBeenCalled());
      expect(updateDraftMock).toHaveBeenCalledWith({
        draftId: 'draft-1',
        heading: 'Updated KAM heading',
        whyKam: 'Because revenue involves significant judgement.',
        howAddressed: 'Performed detailed walkthroughs.',
        resultsSummary: 'No material misstatements identified.',
        proceduresRefs: [
          { procedureId: 'proc-1', isaRefs: ['ISA 540', 'ISA 330'] },
        ],
        evidenceRefs: [
          { documentId: 'doc-1', evidenceId: undefined, note: 'Evidence reviewed by partner.' },
        ],
      });

      fireEvent.click(screen.getByRole('button', { name: /Submit for approval/i }));
      await waitFor(() => expect(submitDraftMock).toHaveBeenCalledWith('draft-1'));

      fireEvent.click(screen.getByRole('button', { name: 'Approve' }));
      await waitFor(() => expect(decideApprovalMock).toHaveBeenCalledWith({ approvalId: 'approval-1', decision: 'APPROVED' }));

      const candidateThreeCard = screen.getByRole('button', { name: /Going concern liquidity/i });
      fireEvent.click(within(candidateThreeCard).getByRole('button', { name: 'Shortlist' }));
      await waitFor(() => expect(selectCandidateMock).toHaveBeenCalledWith({ candidateId: 'cand-3', reason: undefined }));

      fireEvent.click(within(candidateThreeCard).getByRole('button', { name: 'Exclude' }));
      await waitFor(() => expect(excludeCandidateMock).toHaveBeenCalledWith({ candidateId: 'cand-3', reason: undefined }));

      const candidateTwoCard = screen.getByRole('button', { name: /Tax valuation/ });
      fireEvent.click(candidateTwoCard);
      fireEvent.click(within(candidateTwoCard).getByRole('button', { name: /Open draft/i }));
      await waitFor(() => expect(createDraftMock).toHaveBeenCalledWith({ candidateId: 'cand-2' }));
    },
    12000,
  );
});
