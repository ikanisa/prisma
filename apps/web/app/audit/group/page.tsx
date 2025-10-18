'use client';

import Link from 'next/link';
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type FormEvent,
} from 'react';

// Read once at build-time for client code
const GROUP_MODE =
  (process.env.NEXT_PUBLIC_GROUP_AUDIT_MODE ?? 'workspace').toLowerCase() as
    | 'dashboard'
    | 'workspace';

export default function GroupAuditPage() {
  return GROUP_MODE === 'dashboard' ? <GroupAuditDashboard /> : <GroupAuditWorkspace />;
}

/* =============================================================================
   MODE A: GroupAuditDashboard  (from codex/implement-audit-group-features-and-endpoints)
   ============================================================================= */

type ComponentRow = {
  id: string;
  component_name: string;
  component_code: string | null;
  status: string | null;
  risk_level: string | null;
  jurisdiction: string | null;
  lead_auditor: string | null;
};

type InstructionRow = {
  id: string;
  component_id: string;
  instruction_title: string;
  instruction_body: string | null;
  status: string | null;
  due_at: string | null;
  sent_at: string | null;
  acknowledged_at: string | null;
  acknowledged_by: string | null;
};

type WorkpaperRow = {
  id: string;
  component_id: string;
  engagement_id: string;
  instruction_id: string | null;
  document_id: string | null;
  title: string;
  status: string | null;
  ingested_at: string | null;
};

type ReviewRow = {
  id: string;
  component_id: string;
  engagement_id: string;
  workpaper_id: string | null;
  reviewer_id: string | null;
  status: string | null;
  review_notes: string | null;
  assigned_at: string | null;
  due_at: string | null;
  signed_off_at: string | null;
};

type Component = {
  id: string;
  name: string;
  code: string | null;
  status: string | null;
  riskLevel: string | null;
  jurisdiction: string | null;
  leadAuditorId: string | null;
};

type Instruction = {
  id: string;
  componentId: string;
  title: string;
  body: string | null;
  status: string | null;
  dueAt: string | null;
  sentAt: string | null;
  acknowledgedAt: string | null;
  acknowledgedBy: string | null;
};

type Workpaper = {
  id: string;
  componentId: string;
  engagementId: string;
  instructionId: string | null;
  documentId: string | null;
  title: string;
  status: string | null;
  ingestedAt: string | null;
};

type Review = {
  id: string;
  componentId: string;
  engagementId: string;
  workpaperId: string | null;
  reviewerId: string | null;
  status: string | null;
  reviewNotes: string | null;
  assignedAt: string | null;
  dueAt: string | null;
  signedOffAt: string | null;
};

const DEFAULT_ORG_ID = process.env.NEXT_PUBLIC_DEMO_ORG_ID ?? '';
const DEFAULT_ENGAGEMENT_ID = process.env.NEXT_PUBLIC_DEMO_ENGAGEMENT_ID ?? '';

const STATUS_CLASS_MAP: Record<string, string> = {
  planned: 'bg-slate-100 text-slate-900',
  in_progress: 'bg-blue-100 text-blue-900',
  responding: 'bg-amber-100 text-amber-900',
  submitted: 'bg-indigo-100 text-indigo-900',
  acknowledged: 'bg-emerald-100 text-emerald-900',
  complete: 'bg-emerald-100 text-emerald-900',
  signed_off: 'bg-emerald-100 text-emerald-900',
  blocked: 'bg-rose-100 text-rose-900',
  pending: 'bg-amber-100 text-amber-900',
};

function normaliseKey(value: string | null | undefined, fallback: string) {
  return (value ?? fallback).toLowerCase().replace(/\s+/g, '_');
}

function formatLabel(value: string | null | undefined, fallback = 'Unknown') {
  if (!value) return fallback;
  return value
    .toLowerCase()
    .split(/[_\s-]+/g)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function formatDate(value: string | null | undefined) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat('en', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

function StatusBadge({ status }: { status: string | null | undefined }) {
  const key = normaliseKey(status, 'unknown');
  const className = STATUS_CLASS_MAP[key] ?? 'bg-slate-100 text-slate-900';
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${className}`}>
      {formatLabel(status)}
    </span>
  );
}

function mapComponent(row: ComponentRow): Component {
  return {
    id: row.id,
    name: row.component_name,
    code: row.component_code ?? null,
    status: row.status ?? null,
    riskLevel: row.risk_level ?? null,
    jurisdiction: row.jurisdiction ?? null,
    leadAuditorId: row.lead_auditor ?? null,
  };
}

function mapInstruction(row: InstructionRow): Instruction {
  return {
    id: row.id,
    componentId: row.component_id,
    title: row.instruction_title,
    body: row.instruction_body ?? null,
    status: row.status ?? null,
    dueAt: row.due_at ?? null,
    sentAt: row.sent_at ?? null,
    acknowledgedAt: row.acknowledged_at ?? null,
    acknowledgedBy: row.acknowledged_by ?? null,
  };
}

function mapWorkpaper(row: WorkpaperRow): Workpaper {
  return {
    id: row.id,
    componentId: row.component_id,
    engagementId: row.engagement_id,
    instructionId: row.instruction_id ?? null,
    documentId: row.document_id ?? null,
    title: row.title,
    status: row.status ?? null,
    ingestedAt: row.ingested_at ?? null,
  };
}

function mapReview(row: ReviewRow): Review {
  return {
    id: row.id,
    componentId: row.component_id,
    engagementId: row.engagement_id,
    workpaperId: row.workpaper_id ?? null,
    reviewerId: row.reviewer_id ?? null,
    status: row.status ?? null,
    reviewNotes: row.review_notes ?? null,
    assignedAt: row.assigned_at ?? null,
    dueAt: row.due_at ?? null,
    signedOffAt: row.signed_off_at ?? null,
  };
}

function buildUploadLink(componentId: string, workpaperId?: string | null) {
  const query: Record<string, string> = { componentId };
  if (workpaperId) {
    query.workpaperId = workpaperId;
  }

  return {
    pathname: '/client-portal',
    query,
  };
}

function GroupAuditDashboard() {
  const [orgId, setOrgId] = useState<string>(DEFAULT_ORG_ID);
  const [engagementId, setEngagementId] = useState<string>(DEFAULT_ENGAGEMENT_ID);
  const [components, setComponents] = useState<Component[]>([]);
  const [instructions, setInstructions] = useState<Instruction[]>([]);
  const [workpapers, setWorkpapers] = useState<Workpaper[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);

  const componentLookup = useMemo(
    () => new Map(components.map((component) => [component.id, component])),
    [components],
  );
  const workpaperLookup = useMemo(
    () => new Map(workpapers.map((workpaper) => [workpaper.id, workpaper])),
    [workpapers],
  );

  const riskLevels = useMemo(() => {
    const defaults = ['low', 'moderate', 'high', 'critical'];
    const seen = new Set(defaults);
    const dynamic: string[] = [];
    components.forEach((component) => {
      const key = normaliseKey(component.riskLevel, 'moderate');
      if (!seen.has(key)) {
        seen.add(key);
        dynamic.push(key);
      }
    });
    return [...defaults, ...dynamic];
  }, [components]);

  const statusColumns = useMemo(() => {
    const defaults = ['planned', 'in_progress', 'responding', 'submitted', 'complete', 'blocked'];
    const seen = new Set(defaults);
    const dynamic: string[] = [];
    components.forEach((component) => {
      const key = normaliseKey(component.status, 'planned');
      if (!seen.has(key)) {
        seen.add(key);
        dynamic.push(key);
      }
    });
    return [...defaults, ...dynamic];
  }, [components]);

  const heatmapMatrix = useMemo(() => {
    const matrix = new Map<string, Map<string, Component[]>>();
    riskLevels.forEach((risk) => {
      matrix.set(risk, new Map(statusColumns.map((status) => [status, [] as Component[]])));
    });
    components.forEach((component) => {
      const riskKey = normaliseKey(component.riskLevel, 'moderate');
      const statusKey = normaliseKey(component.status, 'planned');
      if (!matrix.has(riskKey)) {
        matrix.set(riskKey, new Map(statusColumns.map((status) => [status, [] as Component[]])));
      }
      const row = matrix.get(riskKey)!;
      if (!row.has(statusKey)) row.set(statusKey, []);
      row.get(statusKey)!.push(component);
    });
    return matrix;
  }, [components, riskLevels, statusColumns]);

  const fetchData = useCallback(async () => {
    if (!orgId) {
      setComponents([]);
      setInstructions([]);
      setWorkpapers([]);
      setReviews([]);
      setError('Provide an organization ID to load group audit data.');
      return;
    }

    setLoading(true);
    setError(null);

    const params = new URLSearchParams({ orgId });
    if (engagementId) params.append('engagementId', engagementId);

    try {
      const [componentsRes, instructionsRes, workpapersRes, reviewsRes] = await Promise.all([
        fetch(`/api/group/components?${params.toString()}`, { cache: 'no-store' }),
        fetch(`/api/group/instructions?${params.toString()}`, { cache: 'no-store' }),
        fetch(`/api/group/workpapers?${params.toString()}`, { cache: 'no-store' }),
        fetch(`/api/group/reviews?${params.toString()}`, { cache: 'no-store' }),
      ]);

      const parsePayload = async <T,>(response: Response) => {
        if (!response.ok) {
          const payload = await response.json().catch(() => ({}));
          throw new Error((payload as { error?: string }).error ?? 'Unable to load data');
        }
        return (await response.json()) as T;
      };

      const componentsPayload = await parsePayload<{ components: ComponentRow[] }>(componentsRes);
      const instructionsPayload = await parsePayload<{ instructions: InstructionRow[] }>(instructionsRes);
      const workpapersPayload = await parsePayload<{ workpapers: WorkpaperRow[] }>(workpapersRes);
      const reviewsPayload = await parsePayload<{ reviews: ReviewRow[] }>(reviewsRes);

      setComponents(componentsPayload.components.map(mapComponent));
      setInstructions(instructionsPayload.instructions.map(mapInstruction));
      setWorkpapers(workpapersPayload.workpapers.map(mapWorkpaper));
      setReviews(reviewsPayload.reviews.map(mapReview));
      setLastUpdated(new Date().toISOString());
    } catch (err) {
      setError((err as Error).message ?? 'Failed to load group audit data');
    } finally {
      setLoading(false);
    }
  }, [engagementId, orgId]);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  const outstandingInstructions = useMemo(
    () => instructions.filter((instruction) => !instruction.acknowledgedAt),
    [instructions],
  );
  const outstandingReviews = useMemo(
    () => reviews.filter((review) => normaliseKey(review.status, 'pending') !== 'signed_off'),
    [reviews],
  );

  return (
    <main className="flex flex-col gap-6 p-6" aria-labelledby="group-audit-heading">
      <div>
        <h1 id="group-audit-heading" className="text-2xl font-semibold">
          Group Audit Control Center
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Monitor component execution, instruction acknowledgements, and review sign-offs across your group engagement.
        </p>
      </div>

      <section className="rounded border border-border bg-white p-4 shadow-sm" aria-labelledby="group-context">
        <div className="flex flex-wrap items-end gap-4">
          <div className="flex min-w-[240px] flex-col gap-1">
            <label htmlFor="org-id" className="text-sm font-medium">Organization ID</label>
            <input
              id="org-id"
              value={orgId}
              onChange={(e) => setOrgId(e.target.value)}
              placeholder="UUID for the organization"
              className="w-full rounded border border-border bg-background px-3 py-2 text-sm"
            />
          </div>
          <div className="flex min-w-[240px] flex-col gap-1">
            <label htmlFor="engagement-id" className="text-sm font-medium">Engagement ID</label>
            <input
              id="engagement-id"
              value={engagementId}
              onChange={(e) => setEngagementId(e.target.value)}
              placeholder="Optional engagement UUID"
              className="w-full rounded border border-border bg-background px-3 py-2 text-sm"
            />
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => fetchData()}
              className="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={loading}
            >
              {loading ? 'Refreshing…' : 'Refresh dashboard'}
            </button>
            <Link
              href="/client-portal"
              className="rounded border border-blue-600 px-4 py-2 text-sm font-medium text-blue-600 hover:bg-blue-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              Go to document upload portal
            </Link>
          </div>
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
          {lastUpdated && <span>Last updated {formatDate(lastUpdated)}</span>}
          {outstandingInstructions.length > 0 && (
            <span>{outstandingInstructions.length} instruction(s) awaiting acknowledgement</span>
          )}
          {outstandingReviews.length > 0 && <span>{outstandingReviews.length} review(s) pending sign-off</span>}
        </div>
        {error && (
          <p role="alert" className="mt-3 rounded border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800">
            {error}
          </p>
        )}
      </section>

      <section className="rounded border border-border bg-white p-4 shadow-sm" aria-labelledby="component-heatmap">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 id="component-heatmap" className="text-lg font-semibold">Component heatmap</h2>
            <p className="text-sm text-muted-foreground">
              Visualise component coverage by risk and delivery status. Select a tile to review linked components and upload supporting workpapers.
            </p>
          </div>
        </div>
        <div className="mt-4 overflow-x-auto">
          <table className="min-w-full border border-border text-left text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="px-3 py-2 font-medium">Risk level</th>
                {statusColumns.map((status) => (
                  <th key={status} className="px-3 py-2 font-medium">{formatLabel(status)}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {Array.from(heatmapMatrix.entries()).map(([riskKey, statusMap]) => (
                <tr key={riskKey} className="border-t border-border">
                  <th scope="row" className="whitespace-nowrap px-3 py-2 font-medium">
                    {formatLabel(riskKey, 'Moderate')}
                  </th>
                  {statusColumns.map((statusKey) => {
                    const items = statusMap.get(statusKey) ?? [];
                    const count = items.length;
                    const intensity =
                      count === 0 ? 'bg-white' : count < 2 ? 'bg-emerald-50' : count < 4 ? 'bg-amber-50' : 'bg-rose-50';
                    return (
                      <td key={statusKey} className={`align-top px-3 py-2 ${intensity}`}>
                        <div className="text-sm font-semibold">{count}</div>
                        <div className="mt-1 flex flex-col gap-1">
                          {items.map((component) => (
                            <Link
                              key={component.id}
                              href={buildUploadLink(component.id)}
                              className="group flex items-center justify-between gap-2 rounded border border-transparent px-2 py-1 text-xs transition hover:border-blue-200 hover:bg-blue-50"
                            >
                              <span className="font-medium text-slate-700 group-hover:text-blue-700">{component.name}</span>
                              <StatusBadge status={component.status} />
                            </Link>
                          ))}
                        </div>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="rounded border border-border bg-white p-4 shadow-sm" aria-labelledby="instruction-tracker">
        <h2 id="instruction-tracker" className="text-lg font-semibold">Instruction tracker</h2>
        <p className="text-sm text-muted-foreground">
          Track group instructions sent to component auditors and highlight acknowledgements and due dates.
        </p>
        <div className="mt-4 overflow-x-auto">
          <table className="min-w-full border border-border text-left text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="px-3 py-2 font-medium">Instruction</th>
                <th className="px-3 py-2 font-medium">Component</th>
                <th className="px-3 py-2 font-medium">Due date</th>
                <th className="px-3 py-2 font-medium">Status</th>
                <th className="px-3 py-2 font-medium">Acknowledgement</th>
                <th className="px-3 py-2 font-medium">Upload link</th>
              </tr>
            </thead>
            <tbody>
              {instructions.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-3 py-4 text-center text-sm text-muted-foreground">
                    No instructions found for the selected context.
                  </td>
                </tr>
              ) : (
                instructions.map((instruction) => {
                  const component = componentLookup.get(instruction.componentId);
                  const overdue =
                    instruction.dueAt &&
                    !instruction.acknowledgedAt &&
                    new Date(instruction.dueAt).getTime() < Date.now();
                  return (
                    <tr key={instruction.id} className="border-t border-border">
                      <td className="max-w-[240px] px-3 py-2 align-top">
                        <div className="font-medium text-slate-800">{instruction.title}</div>
                        {instruction.body && <div className="mt-1 text-xs text-muted-foreground">{instruction.body}</div>}
                      </td>
                      <td className="px-3 py-2 align-top">{component ? component.name : 'Unknown component'}</td>
                      <td className={`px-3 py-2 align-top ${overdue ? 'text-rose-600 font-medium' : ''}`}>
                        {formatDate(instruction.dueAt)}
                      </td>
                      <td className="px-3 py-2 align-top"><StatusBadge status={instruction.status} /></td>
                      <td className="px-3 py-2 align-top text-sm">
                        {instruction.acknowledgedAt ? (
                          <span className="text-emerald-700">Acknowledged {formatDate(instruction.acknowledgedAt)}</span>
                        ) : (
                          <span className="text-amber-700">Awaiting acknowledgement</span>
                        )}
                      </td>
                      <td className="px-3 py-2 align-top">
                        <Link
                          href={buildUploadLink(instruction.componentId)}
                          className="text-sm font-medium text-blue-600 hover:underline"
                        >
                          Upload workpaper
                        </Link>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="rounded border border-border bg-white p-4 shadow-sm" aria-labelledby="review-queue">
        <h2 id="review-queue" className="text-lg font-semibold">Review queue</h2>
        <p className="text-sm text-muted-foreground">
          Monitor component review assignments and sign-offs. Each row links to the client portal to attach supporting documents.
        </p>
        <div className="mt-4 overflow-x-auto">
          <table className="min-w-full border border-border text-left text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="px-3 py-2 font-medium">Component</th>
                <th className="px-3 py-2 font-medium">Workpaper</th>
                <th className="px-3 py-2 font-medium">Reviewer</th>
                <th className="px-3 py-2 font-medium">Status</th>
                <th className="px-3 py-2 font-medium">Due / Signed off</th>
                <th className="px-3 py-2 font-medium">Upload link</th>
              </tr>
            </thead>
            <tbody>
              {reviews.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-3 py-4 text-center text-sm text-muted-foreground">
                    No reviews found for the selected context.
                  </td>
                </tr>
              ) : (
                reviews.map((review) => {
                  const component = componentLookup.get(review.componentId);
                  const workpaper = review.workpaperId ? workpaperLookup.get(review.workpaperId) : null;
                  const pending = normaliseKey(review.status, 'pending') !== 'signed_off';
                  return (
                    <tr key={review.id} className="border-t border-border">
                      <td className="px-3 py-2 align-top">{component ? component.name : 'Unknown component'}</td>
                      <td className="px-3 py-2 align-top">
                        {workpaper ? (
                          <div>
                            <div className="font-medium text-slate-800">{workpaper.title}</div>
                            {workpaper.status && <StatusBadge status={workpaper.status} />}
                          </div>
                        ) : (
                          <span className="text-muted-foreground">No linked workpaper</span>
                        )}
                      </td>
                      <td className="px-3 py-2 align-top">{review.reviewerId ?? 'Unassigned'}</td>
                      <td className="px-3 py-2 align-top"><StatusBadge status={review.status} /></td>
                      <td className="px-3 py-2 align-top text-sm">
                        {pending ? (
                          <span className="text-amber-700">Due {formatDate(review.dueAt)}</span>
                        ) : (
                          <span className="text-emerald-700">Signed off {formatDate(review.signedOffAt)}</span>
                        )}
                      </td>
                      <td className="px-3 py-2 align-top">
                        <Link
                          href={buildUploadLink(review.componentId, review.workpaperId)}
                          className="text-sm font-medium text-blue-600 hover:underline"
                        >
                          Upload / view docs
                        </Link>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}

/* =============================================================================
   MODE B: GroupAuditWorkspace (from main)
   ============================================================================= */

type GroupInstructionStatus = 'DRAFT' | 'SENT' | 'ACKNOWLEDGED' | 'COMPLETE';
type GroupReviewStatus = 'PENDING' | 'IN_PROGRESS' | 'COMPLETE';
type GroupSignificance = 'INSIGNIFICANT' | 'SIGNIFICANT' | 'KEY';

type GroupInstruction = {
  id: string;
  org_id: string;
  engagement_id: string;
  component_id: string;
  title: string;
  status: GroupInstructionStatus | string;
  sent_at: string | null;
  acknowledged_at: string | null;
  due_at: string | null;
  created_at: string;
  updated_at: string;
};

type GroupWorkpaper = {
  id: string;
  org_id: string;
  engagement_id: string;
  component_id: string;
  instruction_id: string | null;
  document_id: string | null;
  title: string;
  uploaded_by_user_id: string | null;
  uploaded_at: string;
  notes: string | null;
};

type GroupReview = {
  id: string;
  org_id: string;
  engagement_id: string;
  component_id: string;
  reviewer_user_id: string | null;
  status: GroupReviewStatus | string;
  started_at: string | null;
  completed_at: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

type GroupComponent = {
  id: string;
  org_id: string;
  engagement_id: string;
  name: string;
  country: string | null;
  significance: GroupSignificance | string;
  materiality: number | null;
  assigned_firm: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  instructions: GroupInstruction[];
  workpapers: GroupWorkpaper[];
  reviews: GroupReview[];
};

const demoComponents: GroupComponent[] = [
  {
    id: 'grp-demo-1',
    org_id: 'demo-org',
    engagement_id: 'demo-engagement',
    name: 'Subsidiary A',
    country: 'MT',
    significance: 'SIGNIFICANT',
    materiality: 450000,
    assigned_firm: 'Local CPA Malta',
    notes: 'Focus on revenue recognition and IT controls.',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    instructions: [
      {
        id: 'inst-demo-1',
        org_id: 'demo-org',
        engagement_id: 'demo-engagement',
        component_id: 'grp-demo-1',
        title: 'Perform walkthroughs over order-to-cash',
        status: 'SENT',
        sent_at: new Date().toISOString(),
        acknowledged_at: null,
        due_at: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    ],
    workpapers: [
      {
        id: 'wp-demo-1',
        org_id: 'demo-org',
        engagement_id: 'demo-engagement',
        component_id: 'grp-demo-1',
        instruction_id: 'inst-demo-1',
        document_id: null,
        title: 'Inventory observation memo',
        uploaded_by_user_id: 'demo-user',
        uploaded_at: new Date().toISOString(),
        notes: 'Shared via Teams – attach final when ready.',
      },
    ],
    reviews: [
      {
        id: 'rev-demo-1',
        org_id: 'demo-org',
        engagement_id: 'demo-engagement',
        component_id: 'grp-demo-1',
        reviewer_user_id: 'manager-demo',
        status: 'IN_PROGRESS',
        started_at: new Date().toISOString(),
        completed_at: null,
        notes: 'Awaiting testing completion.',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    ],
  },
];

const significanceOptions: GroupSignificance[] = ['INSIGNIFICANT', 'SIGNIFICANT', 'KEY'];
const instructionStatusOptions: GroupInstructionStatus[] = ['DRAFT', 'SENT', 'ACKNOWLEDGED', 'COMPLETE'];
const reviewStatusOptions: GroupReviewStatus[] = ['PENDING', 'IN_PROGRESS', 'COMPLETE'];

function GroupAuditWorkspace() {
  const [mode, setMode] = useState<'demo' | 'live'>('demo');
  const [orgId, setOrgId] = useState('demo-org');
  const [engagementId, setEngagementId] = useState('demo-engagement');
  const [userId, setUserId] = useState('demo-user');

  const [components, setComponents] = useState<GroupComponent[]>(demoComponents);
  const [selectedComponentId, setSelectedComponentId] = useState<string>(demoComponents[0]?.id ?? '');
  const [statusMessage, setStatusMessage] = useState<string | null>('Showing deterministic demo data.');
  const [statusTone, setStatusTone] = useState<'info' | 'success' | 'error'>('info');
  const [loading, setLoading] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);

  const [componentForm, setComponentForm] = useState({
    name: '',
    country: '',
    significance: 'INSIGNIFICANT' as GroupSignificance,
    materiality: '',
    assignedFirm: '',
    notes: '',
  });

  const [instructionForm, setInstructionForm] = useState({
    title: '',
    status: 'DRAFT' as GroupInstructionStatus,
    dueAt: '',
  });

  const [reviewForm, setReviewForm] = useState({
    reviewerUserId: '',
    status: 'IN_PROGRESS' as GroupReviewStatus,
    notes: '',
  });

  const [workpaperForm, setWorkpaperForm] = useState({
    bucket: 'group-workpapers',
    path: '',
    name: '',
    note: '',
    instructionId: '',
  });

  const selectedComponent = useMemo(
    () => components.find((component) => component.id === selectedComponentId) ?? null,
    [components, selectedComponentId],
  );

  useEffect(() => {
    if (mode === 'demo') {
      setComponents(demoComponents);
      setSelectedComponentId(demoComponents[0]?.id ?? '');
      setStatusMessage('Showing deterministic demo data. Switch to live mode to pull group components from Supabase.');
      setStatusTone('info');
      return;
    }

    if (!orgId || !engagementId) {
      setStatusMessage('Provide organisation and engagement identifiers to load live group audit data.');
      setStatusTone('info');
      return;
    }

    const controller = new AbortController();
    const fetchData = async () => {
      setLoading(true);
      setFetchError(null);
      try {
        const params = new URLSearchParams({ orgId, engagementId });
        const response = await fetch(`/api/group?${params}`, { signal: controller.signal, cache: 'no-store' });
        if (!response.ok) {
          const body = (await response.json().catch(() => ({}))) as { error?: string };
          throw new Error(body.error ?? 'Failed to load group components');
        }
        const body = (await response.json()) as { components: GroupComponent[] };
        const normalised = normalizeComponents(body.components ?? []);
        setComponents(normalised);
        setSelectedComponentId((prev) => (normalised.some((c) => c.id === prev) ? prev : normalised[0]?.id ?? ''));
        setStatusMessage(normalised.length ? 'Group components loaded from Supabase.' : 'No group components defined yet.');
        setStatusTone(normalised.length ? 'success' : 'info');
      } catch (err) {
        if (controller.signal.aborted) return;
        const message = err instanceof Error ? err.message : 'Unable to fetch group audit data';
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

  const refreshComponents = async () => {
    if (mode !== 'live') {
      setComponents(demoComponents);
      setSelectedComponentId(demoComponents[0]?.id ?? '');
      return;
    }
    if (!orgId || !engagementId) return;
    const params = new URLSearchParams({ orgId, engagementId });
    const response = await fetch(`/api/group?${params.toString()}`, { cache: 'no-store' });
    if (!response.ok) {
      const body = (await response.json().catch(() => ({}))) as { error?: string };
      throw new Error(body.error ?? 'Failed to load group components');
    }
    const body = (await response.json()) as { components: GroupComponent[] };
    const normalised = normalizeComponents(body.components ?? []);
    setComponents(normalised);
    setSelectedComponentId((prev) => (normalised.some((c) => c.id === prev) ? prev : normalised[0]?.id ?? ''));
  };

  const handleCreateComponent = async (event: FormEvent) => {
    event.preventDefault();
    if (mode !== 'live') {
      showStatus('Switch to live mode to create group components.', 'error');
      return;
    }
    if (!orgId || !engagementId || !userId) {
      showStatus('Provide organisation, engagement, and user identifiers.', 'error');
      return;
    }
    try {
      setLoading(true);
      resetStatus();
      const response = await fetch('/api/group/component', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orgId,
          engagementId,
          userId,
          name: componentForm.name,
          country: componentForm.country || undefined,
          significance: componentForm.significance,
          materiality: componentForm.materiality ? Number(componentForm.materiality) : undefined,
          assignedFirm: componentForm.assignedFirm || undefined,
          notes: componentForm.notes || undefined,
        }),
      });
      const body = (await response.json().catch(() => ({}))) as { component?: GroupComponent; error?: string };
      if (!response.ok) throw new Error(body.error ?? 'Failed to create component');
      await refreshComponents();
      showStatus('Group component created.', 'success');
      if (body.component?.id) setSelectedComponentId(body.component.id);
      setComponentForm({ name: '', country: '', significance: 'INSIGNIFICANT', materiality: '', assignedFirm: '', notes: '' });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unable to create component';
      showStatus(message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleSendInstruction = async (event: FormEvent) => {
    event.preventDefault();
    if (mode !== 'live') {
      showStatus('Switch to live mode to send instructions.', 'error');
      return;
    }
    if (!selectedComponentId) {
      showStatus('Select a component first.', 'error');
      return;
    }
    try {
      setLoading(true);
      resetStatus();
      const response = await fetch('/api/group/instruction', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orgId,
          engagementId,
          componentId: selectedComponentId,
          userId,
          title: instructionForm.title,
          status: instructionForm.status,
          dueAt: instructionForm.dueAt || undefined,
        }),
      });
      const body = (await response.json().catch(() => ({}))) as { error?: string };
      if (!response.ok) throw new Error(body.error ?? 'Failed to send instruction');
      setInstructionForm({ title: '', status: 'DRAFT', dueAt: '' });
      await refreshComponents();
      showStatus('Instruction recorded.', 'success');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unable to send instruction';
      showStatus(message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateReview = async (event: FormEvent) => {
    event.preventDefault();
    if (mode !== 'live') {
      showStatus('Switch to live mode to update reviews.', 'error');
      return;
    }
    if (!selectedComponentId) {
      showStatus('Select a component first.', 'error');
      return;
    }
    try {
      setLoading(true);
      resetStatus();
      const response = await fetch('/api/group/review', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orgId,
          engagementId,
          componentId: selectedComponentId,
          reviewerUserId: reviewForm.reviewerUserId,
          status: reviewForm.status,
          notes: reviewForm.notes || undefined,
          userId,
        }),
      });
      const body = (await response.json().catch(() => ({}))) as { error?: string };
      if (!response.ok) throw new Error(body.error ?? 'Failed to update review');
      await refreshComponents();
      showStatus('Review updated.', 'success');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unable to update review';
      showStatus(message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleUploadWorkpaper = async (event: FormEvent) => {
    event.preventDefault();
    if (mode !== 'live') {
      showStatus('Switch to live mode to log workpapers.', 'error');
      return;
    }
    if (!selectedComponentId) {
      showStatus('Select a component first.', 'error');
      return;
    }
    if (!workpaperForm.path || !workpaperForm.name) {
      showStatus('Provide object path and workpaper name.', 'error');
      return;
    }
    try {
      setLoading(true);
      resetStatus();
      const response = await fetch('/api/group/workpaper', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orgId,
          engagementId,
          componentId: selectedComponentId,
          instructionId: workpaperForm.instructionId || undefined,
          documentBucket: workpaperForm.bucket,
          documentPath: workpaperForm.path,
          documentName: workpaperForm.name,
          note: workpaperForm.note || undefined,
          userId,
        }),
      });
      const body = (await response.json().catch(() => ({}))) as { workpaper?: unknown; error?: string };
      if (!response.ok) throw new Error(body.error ?? 'Failed to register workpaper');
      setWorkpaperForm({ bucket: 'group-workpapers', path: '', name: '', note: '', instructionId: '' });
      await refreshComponents();
      showStatus('Workpaper logged.', 'success');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unable to log workpaper';
      showStatus(message, 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="space-y-6">
      <header className="space-y-2">
        <h2 className="text-2xl font-semibold text-slate-900">Group components</h2>
        <p className="text-sm text-slate-600">
          Track component scoping, instructions, workpapers, and review status across the group audit.
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

        <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
          <label className="flex flex-col text-xs text-slate-600">
            Organisation ID
            <input className="mt-1 rounded border px-2 py-1" value={orgId} onChange={(e) => setOrgId(e.target.value)} />
          </label>
          <label className="flex flex-col text-xs text-slate-600">
            Engagement ID
            <input className="mt-1 rounded border px-2 py-1" value={engagementId} onChange={(e) => setEngagementId(e.target.value)} />
          </label>
          <label className="flex flex-col text-xs text-slate-600">
            User ID
            <input className="mt-1 rounded border px-2 py-1" value={userId} onChange={(e) => setUserId(e.target.value)} />
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
            <h3 className="text-sm font-semibold text-slate-900">Add component</h3>
            <form className="mt-3 space-y-3" onSubmit={handleCreateComponent}>
              <label className="flex flex-col text-xs text-slate-600">
                Name
                <input className="mt-1 rounded border px-2 py-1" value={componentForm.name} onChange={(e) => setComponentForm((p) => ({ ...p, name: e.target.value }))} />
              </label>
              <label className="flex flex-col text-xs text-slate-600">
                Country
                <input className="mt-1 rounded border px-2 py-1" value={componentForm.country} onChange={(e) => setComponentForm((p) => ({ ...p, country: e.target.value }))} placeholder="ISO country" />
              </label>
              <label className="flex flex-col text-xs text-slate-600">
                Significance
                <select className="mt-1 rounded border px-2 py-1" value={componentForm.significance} onChange={(e) => setComponentForm((p) => ({ ...p, significance: e.target.value as GroupSignificance }))}>
                  {significanceOptions.map((option) => (<option key={option} value={option}>{option}</option>))}
                </select>
              </label>
              <label className="flex flex-col text-xs text-slate-600">
                Materiality
                <input type="number" step="0.01" className="mt-1 rounded border px-2 py-1" value={componentForm.materiality} onChange={(e) => setComponentForm((p) => ({ ...p, materiality: e.target.value }))} placeholder="Optional" />
              </label>
              <label className="flex flex-col text-xs text-slate-600">
                Assigned firm
                <input className="mt-1 rounded border px-2 py-1" value={componentForm.assignedFirm} onChange={(e) => setComponentForm((p) => ({ ...p, assignedFirm: e.target.value }))} placeholder="Component auditor" />
              </label>
              <label className="flex flex-col text-xs text-slate-600">
                Notes
                <textarea rows={2} className="mt-1 rounded border px-2 py-1" value={componentForm.notes} onChange={(e) => setComponentForm((p) => ({ ...p, notes: e.target.value }))} />
              </label>
              <button type="submit" className="w-full rounded-md bg-slate-900 px-3 py-2 text-sm font-medium text-white disabled:opacity-60" disabled={loading || !componentForm.name}>
                {loading ? 'Working…' : 'Add component'}
              </button>
            </form>
          </div>

          <div className="rounded-lg border bg-white p-4 shadow-sm">
            <h3 className="text-sm font-semibold text-slate-900">Send instruction</h3>
            {selectedComponent ? (
              <form className="mt-3 space-y-3" onSubmit={handleSendInstruction}>
                <label className="flex flex-col text-xs text-slate-600">
                  Instruction
                  <textarea rows={2} className="mt-1 rounded border px-2 py-1" value={instructionForm.title} onChange={(e) => setInstructionForm((p) => ({ ...p, title: e.target.value }))} />
                </label>
                <label className="flex flex-col text-xs text-slate-600">
                  Status
                  <select className="mt-1 rounded border px-2 py-1" value={instructionForm.status} onChange={(e) => setInstructionForm((p) => ({ ...p, status: e.target.value as GroupInstructionStatus }))}>
                    {instructionStatusOptions.map((opt) => (<option key={opt} value={opt}>{opt}</option>))}
                  </select>
                </label>
                <label className="flex flex-col text-xs text-slate-600">
                  Due date
                  <input type="datetime-local" className="mt-1 rounded border px-2 py-1" value={instructionForm.dueAt} onChange={(e) => setInstructionForm((p) => ({ ...p, dueAt: e.target.value }))} />
                </label>
                <button type="submit" className="w-full rounded-md bg-slate-900 px-3 py-2 text-sm font-medium text-white disabled:opacity-60" disabled={loading || !instructionForm.title}>
                  {loading ? 'Working…' : 'Send instruction'}
                </button>
              </form>
            ) : (
              <p className="mt-2 text-xs text-slate-500">Select a component to draft an instruction.</p>
            )}
          </div>

          <div className="rounded-lg border bg-white p-4 shadow-sm">
            <h3 className="text-sm font-semibold text-slate-900">Update review</h3>
            {selectedComponent ? (
              <form className="mt-3 space-y-3" onSubmit={handleUpdateReview}>
                <label className="flex flex-col text-xs text-slate-600">
                  Reviewer user ID
                  <input className="mt-1 rounded border px-2 py-1" value={reviewForm.reviewerUserId} onChange={(e) => setReviewForm((p) => ({ ...p, reviewerUserId: e.target.value }))} />
                </label>
                <label className="flex flex-col text-xs text-slate-600">
                  Review status
                  <select className="mt-1 rounded border px-2 py-1" value={reviewForm.status} onChange={(e) => setReviewForm((p) => ({ ...p, status: e.target.value as GroupReviewStatus }))}>
                    {reviewStatusOptions.map((opt) => (<option key={opt} value={opt}>{opt}</option>))}
                  </select>
                </label>
                <label className="flex flex-col text-xs text-slate-600">
                  Notes
                  <textarea rows={2} className="mt-1 rounded border px-2 py-1" value={reviewForm.notes} onChange={(e) => setReviewForm((p) => ({ ...p, notes: e.target.value }))} />
                </label>
                <button type="submit" className="w-full rounded-md bg-slate-900 px-3 py-2 text-sm font-medium text-white disabled:opacity-60" disabled={loading || !reviewForm.reviewerUserId}>
                  {loading ? 'Working…' : 'Save review'}
                </button>
              </form>
            ) : (
              <p className="mt-2 text-xs text-slate-500">Select a component to update review status.</p>
            )}
          </div>

          <div className="rounded-lg border bg-white p-4 shadow-sm">
            <h3 className="text-sm font-semibold text-slate-900">Log workpaper</h3>
            {selectedComponent ? (
              <form className="mt-3 space-y-3" onSubmit={handleUploadWorkpaper}>
                <label className="flex flex-col text-xs text-slate-600">
                  Storage bucket
                  <input className="mt-1 rounded border px-2 py-1" value={workpaperForm.bucket} onChange={(e) => setWorkpaperForm((p) => ({ ...p, bucket: e.target.value }))} />
                </label>
                <label className="flex flex-col text-xs text-slate-600">
                  Object path
                  <input className="mt-1 rounded border px-2 py-1" value={workpaperForm.path} onChange={(e) => setWorkpaperForm((p) => ({ ...p, path: e.target.value }))} placeholder="workpapers/filename.pdf" />
                </label>
                <label className="flex flex-col text-xs text-slate-600">
                  Workpaper title
                  <input className="mt-1 rounded border px-2 py-1" value={workpaperForm.name} onChange={(e) => setWorkpaperForm((p) => ({ ...p, name: e.target.value }))} />
                </label>
                <label className="flex flex-col text-xs text-slate-600">
                  Link instruction (optional)
                  <select className="mt-1 rounded border px-2 py-1" value={workpaperForm.instructionId} onChange={(e) => setWorkpaperForm((p) => ({ ...p, instructionId: e.target.value }))}>
                    <option value="">Not linked</option>
                    {selectedComponent.instructions.map((instruction) => (
                      <option key={instruction.id} value={instruction.id}>{instruction.title}</option>
                    ))}
                  </select>
                </label>
                <label className="flex flex-col text-xs text-slate-600">
                  Notes
                  <textarea rows={2} className="mt-1 rounded border px-2 py-1" value={workpaperForm.note} onChange={(e) => setWorkpaperForm((p) => ({ ...p, note: e.target.value }))} />
                </label>
                <button type="submit" className="w-full rounded-md bg-slate-900 px-3 py-2 text-sm font-medium text-white disabled:opacity-60" disabled={loading || !workpaperForm.path || !workpaperForm.name}>
                  {loading ? 'Working…' : 'Log workpaper'}
                </button>
              </form>
            ) : (
              <p className="mt-2 text-xs text-slate-500">Select a component to attach workpapers.</p>
            )}
          </div>
        </aside>

        <div className="lg:col-span-2 space-y-4">
          <div className="rounded-lg border bg-white p-4 shadow-sm">
            <h3 className="text-sm font-semibold text-slate-900">Component register</h3>
            <div className="mt-3 grid grid-cols-1 gap-3">
              {components.map((component) => (
                <button
                  key={component.id}
                  type="button"
                  onClick={() => setSelectedComponentId(component.id)}
                  className={`rounded border px-3 py-2 text-left transition hover:border-slate-400 ${
                    selectedComponentId === component.id ? 'border-slate-900 bg-slate-50' : 'border-slate-200 bg-white'
                  }`}
                >
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium text-slate-900">{component.name}</span>
                    <span className="text-xs uppercase text-slate-500">{component.significance}</span>
                  </div>
                  <div className="mt-1 text-xs text-slate-500">
                    {component.country ?? 'Country n/a'} • Materiality {formatCurrencyUSD(component.materiality ?? 0)} • Workpapers {component.workpapers.length}
                  </div>
                </button>
              ))}
              {components.length === 0 && <p className="text-sm text-slate-500">No group components yet.</p>}
            </div>
          </div>

          {selectedComponent && (
            <div className="space-y-4">
              <div className="rounded-lg border bg-white p-4 shadow-sm space-y-2">
                <header className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h4 className="text-lg font-semibold text-slate-900">{selectedComponent.name}</h4>
                    <p className="text-xs text-slate-500">
                      {selectedComponent.country ?? 'Country n/a'} • Assigned firm {selectedComponent.assigned_firm ?? 'n/a'} • Materiality
                      <span className="ml-1 font-semibold text-slate-700">{formatCurrencyUSD(selectedComponent.materiality ?? 0)}</span>
                    </p>
                  </div>
                </header>
                {selectedComponent.notes && <p className="text-xs text-slate-600">{selectedComponent.notes}</p>}
              </div>

              <div className="rounded-lg border bg-white p-4 shadow-sm">
                <h5 className="text-sm font-semibold text-slate-900">Instructions</h5>
                <table className="mt-2 w-full text-xs">
                  <thead className="text-slate-500">
                    <tr className="border-b">
                      <th className="py-1 text-left">Title</th>
                      <th className="py-1 text-left">Status</th>
                      <th className="py-1 text-left">Due</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedComponent.instructions.map((instruction) => (
                      <tr key={instruction.id} className="border-b last:border-0">
                        <td className="py-1">{instruction.title}</td>
                        <td className="py-1 text-slate-500">{instruction.status}</td>
                        <td className="py-1 text-slate-500">{instruction.due_at ? new Date(instruction.due_at).toLocaleDateString() : '—'}</td>
                      </tr>
                    ))}
                    {selectedComponent.instructions.length === 0 && (
                      <tr>
                        <td colSpan={3} className="py-2 text-center text-slate-500">No instructions sent yet.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              <div className="rounded-lg border bg-white p-4 shadow-sm">
                <h5 className="text-sm font-semibold text-slate-900">Workpapers</h5>
                <table className="mt-2 w-full text-xs">
                  <thead className="text-slate-500">
                    <tr className="border-b">
                      <th className="py-1 text-left">Title</th>
                      <th className="py-1 text-left">Uploaded by</th>
                      <th className="py-1 text-left">Notes</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedComponent.workpapers.map((workpaper) => (
                      <tr key={workpaper.id} className="border-b last:border-0">
                        <td className="py-1">{workpaper.title}</td>
                        <td className="py-1 text-slate-500">{workpaper.uploaded_by_user_id ?? 'n/a'}</td>
                        <td className="py-1 text-slate-500">{workpaper.notes ?? '—'}</td>
                      </tr>
                    ))}
                    {selectedComponent.workpapers.length === 0 && (
                      <tr>
                        <td colSpan={3} className="py-2 text-center text-slate-500">No workpapers logged.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              <div className="rounded-lg border bg-white p-4 shadow-sm">
                <h5 className="text-sm font-semibold text-slate-900">Review status</h5>
                <table className="mt-2 w-full text-xs">
                  <thead className="text-slate-500">
                    <tr className="border-b">
                      <th className="py-1 text-left">Reviewer</th>
                      <th className="py-1 text-left">Status</th>
                      <th className="py-1 text-left">Updated</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedComponent.reviews.map((review) => (
                      <tr key={review.id} className="border-b last:border-0">
                        <td className="py-1">{review.reviewer_user_id ?? 'n/a'}</td>
                        <td className="py-1 text-slate-500">{review.status}</td>
                        <td className="py-1 text-slate-500">{review.updated_at ? new Date(review.updated_at).toLocaleString() : '—'}</td>
                      </tr>
                    ))}
                    {selectedComponent.reviews.length === 0 && (
                      <tr>
                        <td colSpan={3} className="py-2 text-center text-slate-500">No review activity recorded.</td>
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

type ComponentApiRecord = Partial<GroupComponent> & {
  id: string;
  materiality?: number | string | null;
  instructions?: Array<Partial<GroupInstruction>>;
  workpapers?: Array<Partial<GroupWorkpaper>>;
  reviews?: Array<Partial<GroupReview>>;
};

function normalizeComponents(records: ComponentApiRecord[]): GroupComponent[] {
  return (records ?? []).map((record) => {
    const {
      id,
      org_id = '',
      engagement_id = '',
      name = '',
      country = null,
      significance = 'INSIGNIFICANT',
      materiality,
      assigned_firm = null,
      notes = null,
      created_at = new Date().toISOString(),
      updated_at = new Date().toISOString(),
      instructions = [],
      workpapers = [],
      reviews = [],
    } = record;

    const rawMateriality =
      typeof materiality === 'number'
        ? materiality
        : typeof materiality === 'string'
        ? Number(materiality)
        : null;

    return {
      id,
      org_id,
      engagement_id,
      name,
      country,
      significance,
      materiality: Number.isFinite(rawMateriality) ? Number(rawMateriality) : null,
      assigned_firm,
      notes,
      created_at,
      updated_at,
      instructions: instructions.map((instruction) => ({
        ...instruction,
        due_at: instruction?.due_at ?? null,
      })) as GroupInstruction[],
      workpapers: workpapers.map((workpaper) => ({
        ...workpaper,
        uploaded_at: workpaper?.uploaded_at ?? new Date().toISOString(),
      })) as GroupWorkpaper[],
      reviews: reviews.map((review) => ({ ...review })) as GroupReview[],
    };
  });
}

function formatCurrencyUSD(value: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value ?? 0);
}
