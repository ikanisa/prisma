export interface ConsolidatedLine {
  accountId: string;
  code: string;
  name: string;
  amount: number;
  type: string | null;
}

export interface ConsolidationResponse {
  baseCurrency: string;
  entityIds: string[];
  consolidatedTrialBalance: ConsolidatedLine[];
  byEntity: Record<string, Array<{ accountId: string; amount: number; account: { code: string; name: string; type: string | null } | null }>>;
  eliminations: Array<{ description: string; amount: number; accountCode?: string }>;
  summary: { assets: number; liabilities: number; equity: number; check: number };
}

export async function fetchConsolidatedTrialBalance(params: {
  orgId: string;
  parentEntityId: string;
  subsidiaries?: string[];
  currency?: string;
}) {
  const query = new URLSearchParams({
    orgId: params.orgId,
    parentEntityId: params.parentEntityId,
  });
  if (params.subsidiaries?.length) {
    query.set('subsidiaries', params.subsidiaries.join(','));
  }
  if (params.currency) {
    query.set('currency', params.currency);
  }

  const response = await fetch(`/api/financials/consolidation?${query.toString()}`);
  if (!response.ok) {
    throw new Error('Failed to load consolidated balances');
  }

  return (await response.json()) as ConsolidationResponse;
}
