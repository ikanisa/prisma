'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';

type ServiceOrgType = 'TYPE_1' | 'TYPE_2';
type SocScope = 'SOC1' | 'SOC2' | 'SOC3';
type CuecStatus = 'NOT_ASSESSED' | 'ADEQUATE' | 'DEFICIENCY';

type SocReport = {
  id: string;
  service_org_id: string;
  report_type: ServiceOrgType | string;
  scope: SocScope | string;
  period_start: string | null;
  period_end: string | null;
  issued_at: string | null;
  auditor: string | null;
  notes: string | null;
};

type CuecControl = {
  id: string;
  service_org_id: string;
  description: string;
  status: CuecStatus | string;
  tested: boolean;
  exception_note: string | null;
  compensating_control: string | null;
};

type ServiceOrg = {
  id: string;
  org_id: string;
  engagement_id: string;
  name: string;
  description: string | null;
  service_type: string | null;
  residual_risk: string | null;
  reliance_assessed: boolean;
  reports: SocReport[];
  cuecs: CuecControl[];
};

type ServiceOrgForm = {
  name: string;
  description: string;
  serviceType: string;
  residualRisk: string;
  relianceAssessed: boolean;
};

type ReportForm = {
  reportType: ServiceOrgType;
  scope: SocScope;
  periodStart: string;
  periodEnd: string;
  issuedAt: string;
  auditor: string;
  notes: string;
};

type CuecForm = {
  description: string;
  status: CuecStatus;
  tested: boolean;
  exceptionNote: string;
  compensatingControl: string;
};

export default function ServiceOrgWorkspace() {
  const [mode, setMode] = useState<'demo' | 'live'>('demo');
  const [orgId, setOrgId] = useState('demo-org');
  const [engagementId, setEngagementId] = useState('demo-engagement');
  const [userId, setUserId] = useState('demo-user');

  const [serviceOrgs, setServiceOrgs] = useState<ServiceOrg[]>(demoServiceOrgs);
  const [selectedId, setSelectedId] = useState<string>(demoServiceOrgs[0]?.id ?? '');
  const [statusMessage, setStatusMessage] = useState<string | null>('Showing deterministic demo data.');
  const [statusTone, setStatusTone] = useState<'info' | 'success' | 'error'>('info');
  const [loading, setLoading] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);

  const [serviceOrgForm, setServiceOrgForm] = useState<ServiceOrgForm>({
    name: '',
    description: '',
    serviceType: '',
    residualRisk: '',
    relianceAssessed: false,
  });
  const [reportForm, setReportForm] = useState<ReportForm>({
    reportType: 'TYPE_2',
    scope: 'SOC1',
    periodStart: '',
    periodEnd: '',
    issuedAt: '',
    auditor: '',
    notes: '',
  });
  const [cuecForm, setCuecForm] = useState<CuecForm>({
    description: '',
    status: 'NOT_ASSESSED',
    tested: false,
    exceptionNote: '',
    compensatingControl: '',
  });

  const selectedServiceOrg = useMemo(
    () => serviceOrgs.find((org) => org.id === selectedId) ?? null,
    [serviceOrgs, selectedId],
  );

  useEffect(() => {
    if (mode === 'demo') {
      setServiceOrgs(demoServiceOrgs);
      setSelectedId(demoServiceOrgs[0]?.id ?? '');
      setStatusMessage('Showing deterministic demo data. Switch to live mode to pull service organisations from Supabase.');
      setStatusTone('info');
      return;
    }

    if (!orgId || !engagementId) {
      setStatusMessage('Provide organisation and engagement identifiers to load live data.');
      setStatusTone('info');
      return;
    }

    const controller = new AbortController();
    const fetchData = async () => {
      setLoading(true);
      setFetchError(null);
      try {
        const params = new URLSearchParams({ orgId, engagementId });
        const response = await fetch(`/api/soc/service-orgs?${params}`, { signal: controller.signal, cache: 'no-store' });
        if (!response.ok) {
          const body = (await response.json().catch(() => ({}))) as { error?: string };
          throw new Error(body.error ?? 'Failed to load service organisations');
        }
        const body = (await response.json()) as { serviceOrgs: ServiceOrg[] };
        const normalised = normalizeServiceOrgs(body.serviceOrgs ?? []);
        setServiceOrgs(normalised);
        setSelectedId((prev) => (normalised.some((org) => org.id === prev) ? prev : normalised[0]?.id ?? ''));
        setStatusMessage(normalised.length ? 'Service organisations loaded.' : 'No service organisations captured yet.');
        setStatusTone(normalised.length ? 'success' : 'info');
      } catch (error) {
        if (controller.signal.aborted) return;
        const message = error instanceof Error ? error.message : 'Unable to fetch service organisations';
        setFetchError(message);
        setStatusMessage('Fell back to last known data.');
        setStatusTone('error');
      } finally {
        setLoading(false);
      }
    };

    void fetchData();
    return () => controller.abort();
  }, [mode, orgId, engagementId]);

  const showStatus = (message: string, tone: 'info' | 'success' | 'error' = 'info') => {
    setStatusMessage(message);
    setStatusTone(tone);
  };
  const resetStatus = () => setStatusMessage(null);

  const handleCreateServiceOrg = async (event: FormEvent) => {
    event.preventDefault();
    if (mode !== 'live') {
      showStatus('Switch to live mode to create service organisations.', 'error');
      return;
    }
    if (!orgId || !engagementId || !userId) {
      showStatus('Provide organisation, engagement, and user identifiers.', 'error');
      return;
    }
    if (!serviceOrgForm.name) {
      showStatus('Provide a service organisation name.', 'error');
      return;
    }
    try {
      setLoading(true);
      resetStatus();
      const response = await fetch('/api/soc/service-orgs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orgId,
          engagementId,
          userId,
          name: serviceOrgForm.name,
          description: serviceOrgForm.description || undefined,
          serviceType: serviceOrgForm.serviceType || undefined,
          relianceAssessed: serviceOrgForm.relianceAssessed,
          residualRisk: serviceOrgForm.residualRisk || undefined,
        }),
      });
      const body = (await response.json().catch(() => ({}))) as { error?: string };
      if (!response.ok) {
        throw new Error(body.error ?? 'Failed to create service organisation');
      }
      await refreshServiceOrgs();
      showStatus('Service organisation recorded.', 'success');
      setServiceOrgForm({ name: '', description: '', serviceType: '', residualRisk: '', relianceAssessed: false });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to create service organisation';
      showStatus(message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleAddReport = async (event: FormEvent) => {
    event.preventDefault();
    if (mode !== 'live') {
      showStatus('Switch to live mode to add SOC reports.', 'error');
      return;
    }
    if (!selectedServiceOrg) {
      showStatus('Select a service organisation first.', 'error');
      return;
    }
    try {
      setLoading(true);
      resetStatus();
      const response = await fetch('/api/soc/report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orgId,
          engagementId,
          serviceOrgId: selectedServiceOrg.id,
          userId,
          reportType: reportForm.reportType,
          scope: reportForm.scope,
          periodStart: reportForm.periodStart || undefined,
          periodEnd: reportForm.periodEnd || undefined,
          issuedAt: reportForm.issuedAt || undefined,
          auditor: reportForm.auditor || undefined,
          notes: reportForm.notes || undefined,
        }),
      });
      const body = (await response.json().catch(() => ({}))) as { error?: string };
      if (!response.ok) {
        throw new Error(body.error ?? 'Failed to record SOC report');
      }
      await refreshServiceOrgs();
      showStatus('SOC report recorded.', 'success');
      setReportForm({ reportType: 'TYPE_2', scope: 'SOC1', periodStart: '', periodEnd: '', issuedAt: '', auditor: '', notes: '' });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to record SOC report';
      showStatus(message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleAddCuec = async (event: FormEvent) => {
    event.preventDefault();
    if (mode !== 'live') {
      showStatus('Switch to live mode to add CUECs.', 'error');
      return;
    }
    if (!selectedServiceOrg) {
      showStatus('Select a service organisation first.', 'error');
      return;
    }
    if (!cuecForm.description) {
      showStatus('Provide a description for the CUEC.', 'error');
      return;
    }
    try {
      setLoading(true);
      resetStatus();
      const response = await fetch('/api/soc/cuec', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orgId,
          engagementId,
          serviceOrgId: selectedServiceOrg.id,
          description: cuecForm.description,
          status: cuecForm.status,
          tested: cuecForm.tested,
          exceptionNote: cuecForm.exceptionNote || undefined,
          compensatingControl: cuecForm.compensatingControl || undefined,
          userId,
        }),
      });
      const body = (await response.json().catch(() => ({}))) as { error?: string };
      if (!response.ok) {
        throw new Error(body.error ?? 'Failed to record CUEC');
      }
      setCuecForm({ description: '', status: 'NOT_ASSESSED', tested: false, exceptionNote: '', compensatingControl: '' });
      await refreshServiceOrgs();
      showStatus('CUEC recorded.', 'success');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to record CUEC';
      showStatus(message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const refreshServiceOrgs = async () => {
    if (mode !== 'live') {
      setServiceOrgs(demoServiceOrgs);
      setSelectedId(demoServiceOrgs[0]?.id ?? '');
      return;
    }
    const params = new URLSearchParams({ orgId, engagementId });
    const response = await fetch(`/api/soc/service-orgs?${params}`, { cache: 'no-store' });
    if (!response.ok) {
      const body = (await response.json().catch(() => ({}))) as { error?: string };
      throw new Error(body.error ?? 'Failed to load service organisations');
    }
    const body = (await response.json()) as { serviceOrgs: ServiceOrg[] };
    const normalised = normalizeServiceOrgs(body.serviceOrgs ?? []);
    setServiceOrgs(normalised);
    setSelectedId((prev) => (normalised.some((org) => org.id === prev) ? prev : normalised[0]?.id ?? ''));
  };

  return (
    <section className="space-y-6">
      <header className="space-y-2">
        <h2 className="text-2xl font-semibold text-slate-900">Service organisations</h2>
        <p className="text-sm text-slate-600">
          Monitor SOC reports, complementary user entity controls, and residual risk assessments for outsourced processes.
        </p>
      </header>

      <div className="grid gap-4 rounded-lg border bg-white p-4 shadow-sm">
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            className={`rounded-md px-3 py-2 text-sm font-medium ${mode === 'demo' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-700'}`}
            onClick={() => setMode('demo')}
          >
            Demo data
          </button>
          <button
            type="button"
            className={`rounded-md px-3 py-2 text-sm font-medium ${mode === 'live' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-700'}`}
            onClick={() => setMode('live')}
          >
            Live Supabase
          </button>
          {fetchError && <span className="text-xs text-destructive">{fetchError}</span>}
        </div>

        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          <label className="flex flex-col text-xs text-slate-600">
            Organisation ID
            <input className="mt-1 rounded border px-2 py-1" value={orgId} onChange={(event) => setOrgId(event.target.value)} />
          </label>
          <label className="flex flex-col text-xs text-slate-600">
            Engagement ID
            <input className="mt-1 rounded border px-2 py-1" value={engagementId} onChange={(event) => setEngagementId(event.target.value)} />
          </label>
          <label className="flex flex-col text-xs text-slate-600">
            User ID
            <input className="mt-1 rounded border px-2 py-1" value={userId} onChange={(event) => setUserId(event.target.value)} />
          </label>
        </div>
      </div>

      {statusMessage && (
        <div
          className={`rounded-md border px-3 py-2 text-sm ${
            statusTone === 'success'
              ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
              : statusTone === 'error'
              ? 'border-red-200 bg-red-50 text-red-700'
              : 'border-slate-200 bg-slate-50 text-slate-600'
          }`}
        >
          {statusMessage}
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <aside className="space-y-4 lg:col-span-1">
          <div className="rounded-lg border bg-white p-4 shadow-sm">
            <h3 className="text-sm font-semibold text-slate-900">Add service organisation</h3>
            <form className="mt-3 space-y-3" onSubmit={handleCreateServiceOrg}>
              <label className="flex flex-col text-xs text-slate-600">
                Name
                <input
                  className="mt-1 rounded border px-2 py-1"
                  value={serviceOrgForm.name}
                  onChange={(event) => setServiceOrgForm((prev) => ({ ...prev, name: event.target.value }))}
                />
              </label>
              <label className="flex flex-col text-xs text-slate-600">
                Description
                <textarea
                  rows={2}
                  className="mt-1 rounded border px-2 py-1"
                  value={serviceOrgForm.description}
                  onChange={(event) => setServiceOrgForm((prev) => ({ ...prev, description: event.target.value }))}
                />
              </label>
              <label className="flex flex-col text-xs text-slate-600">
                Service type
                <input
                  className="mt-1 rounded border px-2 py-1"
                  value={serviceOrgForm.serviceType}
                  onChange={(event) => setServiceOrgForm((prev) => ({ ...prev, serviceType: event.target.value }))}
                  placeholder="Payroll, IT hosting, ..."
                />
              </label>
              <label className="flex flex-col text-xs text-slate-600">
                Residual risk
                <input
                  className="mt-1 rounded border px-2 py-1"
                  value={serviceOrgForm.residualRisk}
                  onChange={(event) => setServiceOrgForm((prev) => ({ ...prev, residualRisk: event.target.value }))}
                />
              </label>
              <label className="flex items-center gap-2 text-xs text-slate-600">
                <input
                  type="checkbox"
                  checked={serviceOrgForm.relianceAssessed}
                  onChange={(event) => setServiceOrgForm((prev) => ({ ...prev, relianceAssessed: event.target.checked }))}
                />
                Reliance assessed
              </label>
              <button
                type="submit"
                className="w-full rounded-md bg-slate-900 px-3 py-2 text-sm font-medium text-white disabled:opacity-60"
                disabled={loading}
              >
                {loading ? 'Working…' : 'Add service org'}
              </button>
            </form>
          </div>

          <div className="rounded-lg border bg-white p-4 shadow-sm">
            <h3 className="text-sm font-semibold text-slate-900">Record SOC report</h3>
            {selectedServiceOrg ? (
              <form className="mt-3 space-y-3" onSubmit={handleAddReport}>
                <label className="flex flex-col text-xs text-slate-600">
                  Report type
                  <select
                    className="mt-1 rounded border px-2 py-1"
                    value={reportForm.reportType}
                    onChange={(event) => setReportForm((prev) => ({ ...prev, reportType: event.target.value as ServiceOrgType }))}
                  >
                    <option value="TYPE_1">Type 1</option>
                    <option value="TYPE_2">Type 2</option>
                  </select>
                </label>
                <label className="flex flex-col text-xs text-slate-600">
                  Scope
                  <select
                    className="mt-1 rounded border px-2 py-1"
                    value={reportForm.scope}
                    onChange={(event) => setReportForm((prev) => ({ ...prev, scope: event.target.value as SocScope }))}
                  >
                    <option value="SOC1">SOC 1</option>
                    <option value="SOC2">SOC 2</option>
                    <option value="SOC3">SOC 3</option>
                  </select>
                </label>
                <label className="flex flex-col text-xs text-slate-600">
                  Period start
                  <input
                    type="date"
                    className="mt-1 rounded border px-2 py-1"
                    value={reportForm.periodStart}
                    onChange={(event) => setReportForm((prev) => ({ ...prev, periodStart: event.target.value }))}
                  />
                </label>
                <label className="flex flex-col text-xs text-slate-600">
                  Period end
                  <input
                    type="date"
                    className="mt-1 rounded border px-2 py-1"
                    value={reportForm.periodEnd}
                    onChange={(event) => setReportForm((prev) => ({ ...prev, periodEnd: event.target.value }))}
                  />
                </label>
                <label className="flex flex-col text-xs text-slate-600">
                  Issued at
                  <input
                    type="date"
                    className="mt-1 rounded border px-2 py-1"
                    value={reportForm.issuedAt}
                    onChange={(event) => setReportForm((prev) => ({ ...prev, issuedAt: event.target.value }))}
                  />
                </label>
                <label className="flex flex-col text-xs text-slate-600">
                  Auditor
                  <input
                    className="mt-1 rounded border px-2 py-1"
                    value={reportForm.auditor}
                    onChange={(event) => setReportForm((prev) => ({ ...prev, auditor: event.target.value }))}
                  />
                </label>
                <label className="flex flex-col text-xs text-slate-600">
                  Notes
                  <textarea
                    rows={2}
                    className="mt-1 rounded border px-2 py-1"
                    value={reportForm.notes}
                    onChange={(event) => setReportForm((prev) => ({ ...prev, notes: event.target.value }))}
                  />
                </label>
                <button
                  type="submit"
                  className="w-full rounded-md bg-slate-900 px-3 py-2 text-sm font-medium text-white disabled:opacity-60"
                  disabled={loading}
                >
                  {loading ? 'Working…' : 'Save report'}
                </button>
              </form>
            ) : (
              <p className="mt-2 text-xs text-slate-500">Select a service organisation to record a SOC report.</p>
            )}
          </div>

          <div className="rounded-lg border bg-white p-4 shadow-sm">
            <h3 className="text-sm font-semibold text-slate-900">Add CUEC</h3>
            {selectedServiceOrg ? (
              <form className="mt-3 space-y-3" onSubmit={handleAddCuec}>
                <label className="flex flex-col text-xs text-slate-600">
                  Description
                  <textarea
                    rows={2}
                    className="mt-1 rounded border px-2 py-1"
                    value={cuecForm.description}
                    onChange={(event) => setCuecForm((prev) => ({ ...prev, description: event.target.value }))}
                  />
                </label>
                <label className="flex flex-col text-xs text-slate-600">
                  Status
                  <select
                    className="mt-1 rounded border px-2 py-1"
                    value={cuecForm.status}
                    onChange={(event) => setCuecForm((prev) => ({ ...prev, status: event.target.value as CuecStatus }))}
                  >
                    <option value="NOT_ASSESSED">Not assessed</option>
                    <option value="ADEQUATE">Adequate</option>
                    <option value="DEFICIENCY">Deficiency</option>
                  </select>
                </label>
                <label className="flex items-center gap-2 text-xs text-slate-600">
                  <input
                    type="checkbox"
                    checked={cuecForm.tested}
                    onChange={(event) => setCuecForm((prev) => ({ ...prev, tested: event.target.checked }))}
                  />
                  Tested
                </label>
                <label className="flex flex-col text-xs text-slate-600">
                  Exception note
                  <textarea
                    rows={2}
                    className="mt-1 rounded border px-2 py-1"
                    value={cuecForm.exceptionNote}
                    onChange={(event) => setCuecForm((prev) => ({ ...prev, exceptionNote: event.target.value }))}
                  />
                </label>
                <label className="flex flex-col text-xs text-slate-600">
                  Compensating control
                  <textarea
                    rows={2}
                    className="mt-1 rounded border px-2 py-1"
                    value={cuecForm.compensatingControl}
                    onChange={(event) => setCuecForm((prev) => ({ ...prev, compensatingControl: event.target.value }))}
                  />
                </label>
                <button
                  type="submit"
                  className="w-full rounded-md bg-slate-900 px-3 py-2 text-sm font-medium text-white disabled:opacity-60"
                  disabled={loading}
                >
                  {loading ? 'Working…' : 'Record CUEC'}
                </button>
              </form>
            ) : (
              <p className="mt-2 text-xs text-slate-500">Select a service organisation to add complementary user controls.</p>
            )}
          </div>
        </aside>

        <div className="lg:col-span-2 space-y-4">
          <div className="rounded-lg border bg-white p-4 shadow-sm">
            <h3 className="text-sm font-semibold text-slate-900">Service organisations</h3>
            <div className="mt-3 grid grid-cols-1 gap-3">
              {serviceOrgs.map((org) => (
                <button
                  key={org.id}
                  type="button"
                  onClick={() => setSelectedId(org.id)}
                  className={`rounded border px-3 py-2 text-left transition hover:border-slate-400 ${
                    selectedId === org.id ? 'border-slate-900 bg-slate-50' : 'border-slate-200 bg-white'
                  }`}
                >
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium text-slate-900">{org.name}</span>
                    <span className="text-xs text-slate-500">{org.service_type ?? 'Service type n/a'}</span>
                  </div>
                  <div className="mt-1 text-xs text-slate-500">Residual risk: {org.residual_risk ?? 'n/a'} • CUECs {org.cuecs.length}</div>
                </button>
              ))}
              {serviceOrgs.length === 0 && <p className="text-sm text-slate-500">No service organisations recorded.</p>}
            </div>
          </div>

          {selectedServiceOrg && (
            <div className="space-y-4">
              <div className="rounded-lg border bg-white p-4 shadow-sm space-y-2">
                <h4 className="text-lg font-semibold text-slate-900">{selectedServiceOrg.name}</h4>
                {selectedServiceOrg.description && <p className="text-xs text-slate-600">{selectedServiceOrg.description}</p>}
                <p className="text-xs text-slate-500">
                  Service type {selectedServiceOrg.service_type ?? 'n/a'} • Residual risk {selectedServiceOrg.residual_risk ?? 'n/a'} • Reliance assessed{' '}
                  {selectedServiceOrg.reliance_assessed ? 'Yes' : 'No'}
                </p>
              </div>

              <div className="rounded-lg border bg-white p-4 shadow-sm">
                <h5 className="text-sm font-semibold text-slate-900">SOC reports</h5>
                <table className="mt-2 w-full text-xs">
                  <thead className="text-slate-500">
                    <tr className="border-b">
                      <th className="py-1 text-left">Type</th>
                      <th className="py-1 text-left">Scope</th>
                      <th className="py-1 text-left">Period</th>
                      <th className="py-1 text-left">Auditor</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedServiceOrg.reports.map((report) => (
                      <tr key={report.id} className="border-b last:border-0">
                        <td className="py-1">{report.report_type}</td>
                        <td className="py-1 text-slate-500">{report.scope}</td>
                        <td className="py-1 text-slate-500">
                          {report.period_start ?? 'n/a'} – {report.period_end ?? 'n/a'}
                        </td>
                        <td className="py-1 text-slate-500">{report.auditor ?? 'n/a'}</td>
                      </tr>
                    ))}
                    {selectedServiceOrg.reports.length === 0 && (
                      <tr>
                        <td colSpan={4} className="py-2 text-center text-slate-500">
                          No SOC reports recorded.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              <div className="rounded-lg border bg-white p-4 shadow-sm">
                <h5 className="text-sm font-semibold text-slate-900">Complementary user entity controls</h5>
                <table className="mt-2 w-full text-xs">
                  <thead className="text-slate-500">
                    <tr className="border-b">
                      <th className="py-1 text-left">Description</th>
                      <th className="py-1 text-left">Status</th>
                      <th className="py-1 text-left">Tested</th>
                      <th className="py-1 text-left">Exception</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedServiceOrg.cuecs.map((cuec) => (
                      <tr key={cuec.id} className="border-b last:border-0">
                        <td className="py-1">{cuec.description}</td>
                        <td className="py-1 text-slate-500">{cuec.status}</td>
                        <td className="py-1 text-slate-500">{cuec.tested ? 'Yes' : 'No'}</td>
                        <td className="py-1 text-slate-500">{cuec.exception_note ?? '—'}</td>
                      </tr>
                    ))}
                    {selectedServiceOrg.cuecs.length === 0 && (
                      <tr>
                        <td colSpan={4} className="py-2 text-center text-slate-500">
                          No CUECs recorded.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

const demoServiceOrgs: ServiceOrg[] = [
  {
    id: 'soc-demo-1',
    org_id: 'demo-org',
    engagement_id: 'demo-engagement',
    name: 'Payroll processor',
    description: 'External payroll processor handling salaries and related tax filings.',
    service_type: 'Payroll processing',
    residual_risk: 'Medium',
    reliance_assessed: true,
    reports: [
      {
        id: 'report-demo-1',
        service_org_id: 'soc-demo-1',
        report_type: 'TYPE_2',
        scope: 'SOC1',
        period_start: '2024-01-01',
        period_end: '2024-12-31',
        issued_at: '2025-02-01',
        auditor: 'Global Audit LLP',
        notes: 'Qualified opinion due to access control deviation.',
      },
    ],
    cuecs: [
      {
        id: 'cuec-demo-1',
        service_org_id: 'soc-demo-1',
        description: 'Client reviews payroll summary before processing.',
        status: 'ADEQUATE',
        tested: true,
        exception_note: null,
        compensating_control: null,
      },
      {
        id: 'cuec-demo-2',
        service_org_id: 'soc-demo-1',
        description: 'Client maintains segregation of duties for payroll data uploads.',
        status: 'DEFICIENCY',
        tested: false,
        exception_note: 'Client lacks evidence of review for two months.',
        compensating_control: 'Additional substantive payroll analytics planned.',
      },
    ],
  },
];

type ServiceOrgApiRecord = Partial<ServiceOrg> & {
  id: string;
  cuecs?: Array<Partial<CuecControl>>;
};

function normalizeServiceOrgs(records: ServiceOrgApiRecord[]): ServiceOrg[] {
  return (records ?? []).map((record) => {
    const {
      id,
      org_id = '',
      engagement_id = '',
      name = '',
      description = null,
      service_type = null,
      residual_risk = null,
      reliance_assessed = false,
      reports = [],
      cuecs = [],
    } = record;

    return {
      id,
      org_id,
      engagement_id,
      name,
      description,
      service_type,
      residual_risk,
      reliance_assessed,
      reports,
      cuecs: cuecs.map((cuec) => ({
        id: cuec.id ?? crypto.randomUUID(),
        service_org_id: cuec.service_org_id ?? id,
        description: cuec.description ?? '',
        status: cuec.status ?? 'NOT_ASSESSED',
        tested: Boolean(cuec.tested),
        exception_note: cuec.exception_note ?? null,
        compensating_control: cuec.compensating_control ?? null,
      })),
    };
  });
}
