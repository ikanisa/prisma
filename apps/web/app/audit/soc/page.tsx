'use client';

import { useEffect, useMemo, useState } from 'react';

type ServiceOrg = {
  id: string;
  org_id: string;
  name: string;
  description: string | null;
  industry: string | null;
  control_owner: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  system_scope: string | null;
  oversight_notes: string | null;
  created_at: string;
  updated_at: string;
};

type Soc1Report = {
  id: string;
  service_org_id: string;
  period_start: string;
  period_end: string;
  report_type: string;
  auditor: string | null;
  issued_at: string | null;
  coverage_summary: string | null;
  testing_summary: string | null;
  control_deficiencies: string | null;
  document_storage_path: string | null;
  uploaded_by: string | null;
  created_at: string;
};

type CuecStatus = 'not_started' | 'in_progress' | 'effective' | 'deficient' | string;

type Soc1Cuec = {
  id: string;
  service_org_id: string;
  report_id: string | null;
  control_reference: string | null;
  control_objective: string;
  description: string | null;
  control_owner: string | null;
  frequency: string | null;
  status: CuecStatus;
  testing_notes: string | null;
  last_tested_at: string | null;
  tested_by: string | null;
  exception_summary: string | null;
  remediation_plan: string | null;
  residual_risk: string | null;
  created_at: string;
  updated_at: string;
};

type ResidualRiskNote = {
  id: string;
  service_org_id: string;
  cuec_id: string | null;
  note: string;
  risk_rating: string | null;
  follow_up_owner: string | null;
  logged_by: string | null;
  created_at: string;
};

type OverviewResponse = {
  orgId: string;
  accessRole: string;
  serviceOrgs: ServiceOrg[];
  serviceOrg: ServiceOrg | null;
  reports: Soc1Report[];
  cuecs: Soc1Cuec[];
  residualRiskNotes: ResidualRiskNote[];
};

const STATUS_META: Record<string, { label: string; tone: string; description: string }> = {
  not_started: {
    label: 'Not started',
    tone: 'bg-slate-100 text-slate-700',
    description: 'CUEC has been identified but not evaluated.',
  },
  in_progress: {
    label: 'In progress',
    tone: 'bg-amber-100 text-amber-800',
    description: 'Testing is underway or walkthroughs pending.',
  },
  effective: {
    label: 'Effective',
    tone: 'bg-emerald-100 text-emerald-800',
    description: 'Design and operating effectiveness confirmed for the period.',
  },
  deficient: {
    label: 'Deficient',
    tone: 'bg-red-100 text-red-800',
    description: 'Exceptions were noted or complementary controls missing.',
  },
};

function formatDate(value: string | null) {
  if (!value) {
    return '—';
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat('en', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(date);
}

function displayOrDash(value: string | null | undefined) {
  return value && value.trim() ? value : '—';
}

export default function SocOversightPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [serviceOrgs, setServiceOrgs] = useState<ServiceOrg[]>([]);
  const [selectedServiceOrgId, setSelectedServiceOrgId] = useState<string | null>(null);
  const [serviceOrg, setServiceOrg] = useState<ServiceOrg | null>(null);
  const [reports, setReports] = useState<Soc1Report[]>([]);
  const [cuecs, setCuecs] = useState<Soc1Cuec[]>([]);
  const [residualRiskNotes, setResidualRiskNotes] = useState<ResidualRiskNote[]>([]);
  const [accessRole, setAccessRole] = useState<string>('');

  useEffect(() => {
    let ignore = false;

    const loadOverview = async () => {
      setLoading(true);
      setError(null);

      try {
        const params = new URLSearchParams();
        if (selectedServiceOrgId) {
          params.set('serviceOrgId', selectedServiceOrgId);
        }
        const response = await fetch(`/api/soc/overview${params.toString() ? `?${params.toString()}` : ''}`);
        const payload = (await response.json().catch(() => null)) as OverviewResponse | { error?: string } | null;

        if (!response.ok) {
          const message = payload && typeof payload === 'object' && 'error' in payload
            ? (payload.error as string | undefined)
            : undefined;
          throw new Error(message ?? 'Failed to load SOC data');
        }

        if (!payload) {
          throw new Error('Received empty response from SOC overview API');
        }

        const data = payload as OverviewResponse;

        if (ignore) {
          return;
        }

        setServiceOrgs(data.serviceOrgs);
        setServiceOrg(data.serviceOrg);
        setReports(data.reports);
        setCuecs(data.cuecs);
        setResidualRiskNotes(data.residualRiskNotes);
        setAccessRole(data.accessRole);

        if (!selectedServiceOrgId && data.serviceOrg) {
          setSelectedServiceOrgId(data.serviceOrg.id);
        }
      } catch (apiError) {
        if (!ignore) {
          setError(apiError instanceof Error ? apiError.message : 'Unable to fetch SOC information');
          setServiceOrg(null);
          setReports([]);
          setCuecs([]);
          setResidualRiskNotes([]);
        }
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    };

    void loadOverview();

    return () => {
      ignore = true;
    };
  }, [selectedServiceOrgId]);

  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = {
      total: cuecs.length,
      not_started: 0,
      in_progress: 0,
      effective: 0,
      deficient: 0,
    };

    cuecs.forEach((item) => {
      const statusKey = STATUS_META[item.status]?.label ? item.status : 'not_started';
      counts[statusKey] = (counts[statusKey] ?? 0) + 1;
    });

    return counts;
  }, [cuecs]);

  const testingCoverage = useMemo(() => {
    if (!statusCounts.total) {
      return 0;
    }
    return Math.round(((statusCounts.effective ?? 0) / statusCounts.total) * 100);
  }, [statusCounts]);

  const exceptionCuecs = useMemo(() => {
    return cuecs.filter((item) => item.status === 'deficient' || Boolean(item.exception_summary));
  }, [cuecs]);

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6 p-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold">SOC 1 Oversight</h1>
        <p className="text-sm text-muted-foreground">
          Track service organization profiles, complementary user entity controls, testing coverage, and residual risk notes to
          support ISA 402 requirements.
        </p>
      </header>

      {error ? (
        <div className="rounded-md border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">{error}</div>
      ) : null}

      {serviceOrgs.length > 1 ? (
        <div className="flex flex-col gap-2 rounded-md border border-border bg-muted/30 p-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm font-medium">Service organization</p>
            <p className="text-xs text-muted-foreground">Switch to review SOC 1 evidence for a different provider.</p>
          </div>
          <div className="flex items-center gap-2">
            <label htmlFor="service-org-select" className="text-sm font-medium">
              Provider
            </label>
            <select
              id="service-org-select"
              className="min-w-[200px] rounded border border-border bg-background p-2 text-sm"
              value={selectedServiceOrgId ?? ''}
              onChange={(event) => setSelectedServiceOrgId(event.target.value || null)}
            >
              <option value="">Select a provider</option>
              {serviceOrgs.map((org) => (
                <option key={org.id} value={org.id}>
                  {org.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      ) : null}

      {loading ? (
        <div className="rounded-md border border-border bg-muted/20 p-6 text-sm text-muted-foreground">
          Loading SOC 1 evidence…
        </div>
      ) : null}

      {!loading && !serviceOrg ? (
        <div className="rounded-md border border-dashed border-border p-6 text-sm text-muted-foreground">
          No service organizations have been registered yet. Use the API to register a provider once the SOC 1 report is
          received so that complementary user entity controls can be tracked here.
        </div>
      ) : null}

      {!loading && serviceOrg ? (
        <div className="grid gap-6 lg:grid-cols-[2fr,1fr]">
          <section className="space-y-4 rounded-md border border-border bg-background p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold">{serviceOrg.name}</h2>
                <p className="text-xs uppercase text-muted-foreground">Service organization profile</p>
              </div>
              <span className="rounded bg-primary/10 px-2 py-1 text-xs font-medium text-primary">{accessRole}</span>
            </div>

            <dl className="grid gap-4 sm:grid-cols-2">
              <div>
                <dt className="text-xs uppercase text-muted-foreground">Industry</dt>
                <dd className="text-sm font-medium">{displayOrDash(serviceOrg.industry)}</dd>
              </div>
              <div>
                <dt className="text-xs uppercase text-muted-foreground">Control owner</dt>
                <dd className="text-sm font-medium">{displayOrDash(serviceOrg.control_owner)}</dd>
              </div>
              <div>
                <dt className="text-xs uppercase text-muted-foreground">Point of contact</dt>
                <dd className="text-sm font-medium">{displayOrDash(serviceOrg.contact_email)}</dd>
              </div>
              <div>
                <dt className="text-xs uppercase text-muted-foreground">Phone</dt>
                <dd className="text-sm font-medium">{displayOrDash(serviceOrg.contact_phone)}</dd>
              </div>
              <div>
                <dt className="text-xs uppercase text-muted-foreground">System scope</dt>
                <dd className="text-sm text-muted-foreground">{displayOrDash(serviceOrg.system_scope)}</dd>
              </div>
              <div>
                <dt className="text-xs uppercase text-muted-foreground">Oversight notes</dt>
                <dd className="text-sm text-muted-foreground">{displayOrDash(serviceOrg.oversight_notes)}</dd>
              </div>
            </dl>

            <div>
              <dt className="text-xs uppercase text-muted-foreground">Description</dt>
              <dd className="mt-1 text-sm text-muted-foreground">
                {displayOrDash(serviceOrg.description)}
              </dd>
            </div>
          </section>

          <section className="space-y-3 rounded-md border border-border bg-background p-5 shadow-sm">
            <h3 className="text-sm font-semibold">Testing snapshot</h3>
            <div className="grid gap-3">
              <div className="rounded border border-border p-3">
                <p className="text-xs text-muted-foreground">CUECs tracked</p>
                <p className="text-2xl font-semibold">{statusCounts.total}</p>
              </div>
              <div className="rounded border border-border p-3">
                <p className="text-xs text-muted-foreground">Effective controls</p>
                <p className="text-2xl font-semibold">{statusCounts.effective ?? 0}</p>
                <p className="text-xs text-muted-foreground">{testingCoverage}% testing coverage</p>
              </div>
              <div className="rounded border border-border p-3">
                <p className="text-xs text-muted-foreground">Open exceptions</p>
                <p className="text-2xl font-semibold">{exceptionCuecs.length}</p>
              </div>
            </div>
          </section>
        </div>
      ) : null}

      {!loading && serviceOrg ? (
        <section className="space-y-4 rounded-md border border-border bg-background p-5 shadow-sm">
          <div className="flex flex-col gap-1 md:flex-row md:items-baseline md:justify-between">
            <div>
              <h3 className="text-lg font-semibold">SOC 1 reporting timeline</h3>
              <p className="text-sm text-muted-foreground">Latest reports and coverage summaries captured in Supabase.</p>
            </div>
          </div>

          {reports.length === 0 ? (
            <p className="text-sm text-muted-foreground">No SOC 1 reports have been uploaded yet for this provider.</p>
          ) : (
            <ul className="space-y-3">
              {reports.map((report) => (
                <li key={report.id} className="rounded border border-border p-4">
                  <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                    <div>
                      <p className="text-sm font-medium">{report.report_type}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatDate(report.period_start)} – {formatDate(report.period_end)}
                      </p>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Auditor: {displayOrDash(report.auditor)}
                    </div>
                  </div>
                  {report.testing_summary ? (
                    <p className="mt-2 text-sm text-muted-foreground">{report.testing_summary}</p>
                  ) : null}
                  {report.control_deficiencies ? (
                    <p className="mt-2 text-sm text-amber-700">{report.control_deficiencies}</p>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </section>
      ) : null}

      {!loading && serviceOrg ? (
        <section className="space-y-4 rounded-md border border-border bg-background p-5 shadow-sm">
          <div className="flex flex-col gap-1 md:flex-row md:items-baseline md:justify-between">
            <div>
              <h3 className="text-lg font-semibold">Complementary user entity controls</h3>
              <p className="text-sm text-muted-foreground">Monitor implementation, frequency, and test status of CUECs.</p>
            </div>
          </div>

          {cuecs.length === 0 ? (
            <p className="text-sm text-muted-foreground">No CUECs have been documented for this provider.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-border text-sm">
                <thead className="bg-muted/40 text-left text-xs uppercase text-muted-foreground">
                  <tr>
                    <th scope="col" className="px-3 py-2 font-medium">
                      Control objective
                    </th>
                    <th scope="col" className="px-3 py-2 font-medium">
                      Frequency
                    </th>
                    <th scope="col" className="px-3 py-2 font-medium">
                      Status
                    </th>
                    <th scope="col" className="px-3 py-2 font-medium">
                      Last tested
                    </th>
                    <th scope="col" className="px-3 py-2 font-medium">
                      Exceptions & notes
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {cuecs.map((cuec) => {
                    const meta = STATUS_META[cuec.status] ?? STATUS_META.not_started;
                    return (
                      <tr key={cuec.id} className="align-top">
                        <td className="px-3 py-3">
                          <div className="font-medium text-foreground">{cuec.control_objective}</div>
                          <div className="text-xs text-muted-foreground">{displayOrDash(cuec.control_reference)}</div>
                        </td>
                        <td className="px-3 py-3 text-muted-foreground">{displayOrDash(cuec.frequency)}</td>
                        <td className="px-3 py-3">
                          <span className={`inline-flex rounded px-2 py-1 text-xs font-medium ${meta.tone}`}>
                            {meta.label}
                          </span>
                        </td>
                        <td className="px-3 py-3 text-muted-foreground">{formatDate(cuec.last_tested_at)}</td>
                        <td className="px-3 py-3 text-sm text-muted-foreground">
                          {cuec.exception_summary ? <p className="font-medium text-red-700">{cuec.exception_summary}</p> : null}
                          {cuec.testing_notes ? <p>{cuec.testing_notes}</p> : null}
                          {cuec.remediation_plan ? (
                            <p className="text-xs text-muted-foreground">Plan: {cuec.remediation_plan}</p>
                          ) : null}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>
      ) : null}

      {!loading && serviceOrg ? (
        <div className="grid gap-6 lg:grid-cols-2">
          <section className="space-y-3 rounded-md border border-border bg-background p-5 shadow-sm">
            <h3 className="text-lg font-semibold">Exception handling</h3>
            {exceptionCuecs.length === 0 ? (
              <p className="text-sm text-muted-foreground">No active exceptions have been logged.</p>
            ) : (
              <ul className="space-y-3">
                {exceptionCuecs.map((cuec) => (
                  <li key={cuec.id} className="rounded border border-border p-3">
                    <p className="text-sm font-medium text-red-700">{cuec.control_objective}</p>
                    <p className="text-xs text-muted-foreground">{displayOrDash(cuec.exception_summary)}</p>
                    {cuec.remediation_plan ? (
                      <p className="mt-1 text-xs text-muted-foreground">Remediation: {cuec.remediation_plan}</p>
                    ) : null}
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="space-y-3 rounded-md border border-border bg-background p-5 shadow-sm">
            <h3 className="text-lg font-semibold">Residual risk notes</h3>
            {residualRiskNotes.length === 0 ? (
              <p className="text-sm text-muted-foreground">No residual risk observations captured yet.</p>
            ) : (
              <ul className="space-y-3">
                {residualRiskNotes.slice(0, 5).map((note) => (
                  <li key={note.id} className="rounded border border-border p-3">
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>{formatDate(note.created_at)}</span>
                      <span>{displayOrDash(note.risk_rating)}</span>
                    </div>
                    <p className="mt-2 text-sm text-foreground">{note.note}</p>
                    {note.follow_up_owner ? (
                      <p className="mt-1 text-xs text-muted-foreground">Owner: {note.follow_up_owner}</p>
                    ) : null}
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      ) : null}
    </div>
  );
}
