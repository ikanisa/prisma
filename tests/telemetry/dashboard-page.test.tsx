import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const toastMock = vi.fn();
const useOrganizationsMock = vi.fn();
const fetchMock = vi.fn();

vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({ toast: toastMock }),
}));

vi.mock('@/hooks/use-organizations', () => ({
  useOrganizations: () => useOrganizationsMock(),
}));

vi.mock('@/lib/telemetry-service', () => ({
  syncTelemetry: vi.fn(),
}));

import TelemetryDashboardPage from '@/pages/telemetry/dashboard';
import { syncTelemetry } from '@/lib/telemetry-service';

const syncTelemetryMock = vi.mocked(syncTelemetry);

const sampleSummary = {
  coverage: [
    {
      module: 'TAX_OVERLAY',
      metric: 'overlay_calculations',
      measured_value: 3,
      population: 5,
      period_start: '2025-01-01',
      period_end: '2025-01-31',
      computed_at: '2025-01-31T00:00:00Z',
    },
    {
      module: 'ACCOUNTING_CLOSE',
      metric: 'close_checklist',
      measured_value: 10,
      population: 10,
      coverage_ratio: 1,
      period_start: '2025-01-01',
      period_end: '2025-01-31',
      computed_at: '2025-01-31T00:00:00Z',
    },
  ],
  serviceLevels: [
    {
      module: 'ACCOUNTING_CLOSE',
      workflow_event: 'CLOSE_PERIOD',
      status: 'ON_TRACK',
      open_breaches: 0,
      target_hours: 24,
      computed_at: '2025-01-31T00:00:00Z',
    },
    {
      module: 'TAX_OVERLAY',
      workflow_event: 'MAP_CASE_RESPONSE',
      status: 'AT_RISK',
      open_breaches: 2,
      target_hours: 48,
      computed_at: '2025-01-30T00:00:00Z',
    },
  ],
  refusals: [
    {
      module: 'TAX_OVERLAY',
      event: 'REQUEST_OVERRIDE',
      reason: 'Manual check required',
      severity: 'HIGH',
      count: 2,
      occurred_at: '2025-01-28T08:30:00Z',
    },
  ],
};

type RenderResult = ReturnType<typeof render> & { queryClient: QueryClient };

function renderWithClient(): RenderResult {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });

  const utils = render(
    <QueryClientProvider client={queryClient}>
      <TelemetryDashboardPage />
    </QueryClientProvider>,
  );

  return { ...utils, queryClient };
}

beforeEach(() => {
  toastMock.mockReset();
  useOrganizationsMock.mockReset();
  syncTelemetryMock.mockReset();
  fetchMock.mockReset();
  useOrganizationsMock.mockReturnValue({ currentOrg: { id: 'org-1', slug: 'aurora' } });
  vi.stubGlobal('fetch', fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('TelemetryDashboardPage', () => {
  it('shows loading state then renders telemetry metrics', async () => {
    let resolveFetch: (value: any) => void = () => {};
    fetchMock.mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveFetch = resolve;
        }),
    );

    const { queryClient } = renderWithClient();

    expect(screen.getByText(/Loading telemetry summary/i)).toBeInTheDocument();

    resolveFetch({
      ok: true,
      json: async () => sampleSummary,
    });

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    await screen.findByText('Coverage ratios');

    expect(screen.getAllByText('ACCOUNTING_CLOSE').length).toBeGreaterThan(0);
    expect(screen.getByText('60.0%')).toBeInTheDocument();
    expect(screen.getByText('Manual check required')).toBeInTheDocument();

    queryClient.getQueryCache().clear();
    queryClient.getMutationCache().clear();
  });

  it('syncs telemetry and refetches data on success', async () => {
    fetchMock
      .mockResolvedValueOnce({ ok: true, json: async () => sampleSummary })
      .mockResolvedValueOnce({ ok: true, json: async () => sampleSummary });

    const { queryClient } = renderWithClient();
    await screen.findByText('Coverage ratios');

    const button = screen.getByRole('button', { name: /sync telemetry/i });

    let resolveSync: (() => void) | null = null;
    syncTelemetryMock.mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveSync = () => resolve(undefined);
        }),
    );

    fireEvent.click(button);

    await waitFor(() =>
      expect(syncTelemetryMock).toHaveBeenCalledWith({ orgSlug: 'aurora', periodStart: undefined, periodEnd: undefined }),
    );
    expect(button).toBeDisabled();

    resolveSync?.();

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
    await waitFor(() =>
      expect(toastMock).toHaveBeenCalledWith(
        expect.objectContaining({ title: 'Telemetry refreshed', description: 'Coverage and SLA data updated.' }),
      ),
    );
    await waitFor(() => expect(button).not.toBeDisabled());

    queryClient.getQueryCache().clear();
    queryClient.getMutationCache().clear();
  });

  it('surfaces sync failures to the toast system', async () => {
    fetchMock.mockResolvedValue({ ok: true, json: async () => sampleSummary });

    const { queryClient } = renderWithClient();
    await screen.findByText('Coverage ratios');

    syncTelemetryMock.mockRejectedValue(new Error('unable to sync'));

    const button = screen.getByRole('button', { name: /sync telemetry/i });
    fireEvent.click(button);

    await waitFor(() =>
      expect(toastMock).toHaveBeenCalledWith(
        expect.objectContaining({ title: 'Sync failed', description: 'unable to sync', variant: 'destructive' }),
      ),
    );
    expect(fetchMock).toHaveBeenCalledTimes(1);

    queryClient.getQueryCache().clear();
    queryClient.getMutationCache().clear();
  });

  it('renders an error card when the summary request fails', async () => {
    fetchMock.mockResolvedValue({ ok: false, json: async () => ({}) });

    const { queryClient } = renderWithClient();

    await waitFor(() =>
      expect(
        screen.getByText('Failed to load telemetry data. Try syncing again or contact support if the issue persists.'),
      ).toBeInTheDocument(),
    );

    queryClient.getQueryCache().clear();
    queryClient.getMutationCache().clear();
  });
});
