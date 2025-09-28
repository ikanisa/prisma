export interface FinancialNoteSection {
  standard: string;
  title: string;
  [key: string]: unknown;
}

export async function fetchFinancialNotes(params: {
  orgId: string;
  entityId: string;
  periodId: string;
  basis?: string;
}) {
  const query = new URLSearchParams({
    orgId: params.orgId,
    entityId: params.entityId,
    periodId: params.periodId,
  });
  if (params.basis) query.set('basis', params.basis);

  const response = await fetch(`/api/financials/notes?${query.toString()}`);
  if (!response.ok) {
    throw new Error('Failed to load financial notes');
  }

  return (await response.json()) as {
    basis: string;
    periodId: string;
    notes: FinancialNoteSection[];
  };
}

export async function requestEsefExport(params: {
  orgId: string;
  entityId: string;
  periodId: string;
  periodLabel?: string;
  basis?: string;
  currency?: string;
}) {
  const query = new URLSearchParams({
    orgId: params.orgId,
    entityId: params.entityId,
    periodId: params.periodId,
  });
  if (params.periodLabel) query.set('periodLabel', params.periodLabel);
  if (params.basis) query.set('basis', params.basis);
  if (params.currency) query.set('currency', params.currency);

  const response = await fetch(`/api/financials/esef?${query.toString()}`);
  if (!response.ok) {
    throw new Error('Failed to generate ESEF export');
  }

  return response;
}
