import type React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, vi } from 'vitest';
import AnalyticsOverviewPage from '../../src/pages/analytics/overview';
import { I18nProvider } from '@/i18n/I18nProvider';
import { useOrganizations } from '@/hooks/use-organizations';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

vi.mock('@/hooks/use-organizations');
vi.mock('@/hooks/use-toast', () => ({ useToast: () => ({ toast: vi.fn() }) }));

function createWrapper(children: React.ReactNode) {
  const client = new QueryClient();
  return (
    <QueryClientProvider client={client}>
      <I18nProvider>{children}</I18nProvider>
    </QueryClientProvider>
  );
}

describe('AnalyticsOverviewPage', () => {
  it('renders charts when data resolves', async () => {
    (useOrganizations as unknown as vi.Mock).mockReturnValue({ currentOrg: { id: 'org-1', slug: 'aurora' } });

    vi.spyOn(global, 'fetch').mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          traceId: 'trace-abc',
          coverage: [
            {
              module: 'Audit',
              metric: 'Evidence',
              coverage_ratio: 0.92,
              measured_value: 92,
              population: 100,
              computed_at: '2025-01-01',
              period_start: '2024-12-01',
              period_end: '2024-12-31',
            },
          ],
          slas: [],
          jobs: { summary: { DONE: 3 }, totalRuns: 3, averageDurationSeconds: 12 },
          nps: {
            score: 75,
            promoters: 6,
            passives: 2,
            detractors: 1,
            responses: [
              { score: 10, feedback: 'Great', submitted_at: '2025-01-01' },
            ],
          },
        }),
        { status: 200 },
      ) as Response,
    );

    render(createWrapper(<AnalyticsOverviewPage />));

    await waitFor(() => {
      expect(screen.getByText(/Advanced Analytics/)).toBeInTheDocument();
      expect(screen.getByText(/NPS \(last 30 responses\)/)).toBeInTheDocument();
      expect(screen.getByText(/Trace ID:/)).toBeInTheDocument();
    });
  });
});
