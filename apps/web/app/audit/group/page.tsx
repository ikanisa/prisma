'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import type { Database } from '../../../../../src/integrations/supabase/types';

type ComponentRow = Database['public']['Tables']['group_components']['Row'];
type InstructionRow = Database['public']['Tables']['group_instructions']['Row'];
type WorkpaperRow = Database['public']['Tables']['component_workpapers']['Row'];
type ReviewRow = Database['public']['Tables']['component_reviews']['Row'];

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
  if (!value) {
    return fallback;
  }
  return value
    .toLowerCase()
    .split(/[_\s-]+/g)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function formatDate(value: string | null | undefined) {
  if (!value) {
    return '—';
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
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
  const params = new URLSearchParams({ componentId });
  if (workpaperId) {
    params.append('workpaperId', workpaperId);
  }
  return `/client-portal?${params.toString()}`;
}

export default function GroupAuditDashboard() {
  const [orgId, setOrgId] = useState<string>(DEFAULT_ORG_ID);
  const [engagementId, setEngagementId] = useState<string>(DEFAULT_ENGAGEMENT_ID);
  const [components, setComponents] = useState<Component[]>([]);
  const [instructions, setInstructions] = useState<Instruction[]>([]);
  const [workpapers, setWorkpapers] = useState<Workpaper[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);

  const componentLookup = useMemo(() => {
    return new Map(components.map((component) => [component.id, component]));
  }, [components]);

  const workpaperLookup = useMemo(() => {
    return new Map(workpapers.map((workpaper) => [workpaper.id, workpaper]));
  }, [workpapers]);

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
      if (!row.has(statusKey)) {
        row.set(statusKey, []);
      }
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
    if (engagementId) {
      params.append('engagementId', engagementId);
    }

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
    } catch (error) {
      setError((error as Error).message ?? 'Failed to load group audit data');
    } finally {
      setLoading(false);
    }
  }, [engagementId, orgId]);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  const outstandingInstructions = useMemo(() => {
    return instructions.filter((instruction) => !instruction.acknowledgedAt);
  }, [instructions]);

  const outstandingReviews = useMemo(() => {
    return reviews.filter((review) => normaliseKey(review.status, 'pending') !== 'signed_off');
  }, [reviews]);

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
            <label htmlFor="org-id" className="text-sm font-medium">
              Organization ID
            </label>
            <input
              id="org-id"
              value={orgId}
              onChange={(event) => setOrgId(event.target.value)}
              placeholder="UUID for the organization"
              className="w-full rounded border border-border bg-background px-3 py-2 text-sm"
            />
          </div>
          <div className="flex min-w-[240px] flex-col gap-1">
            <label htmlFor="engagement-id" className="text-sm font-medium">
              Engagement ID
            </label>
            <input
              id="engagement-id"
              value={engagementId}
              onChange={(event) => setEngagementId(event.target.value)}
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
            <h2 id="component-heatmap" className="text-lg font-semibold">
              Component heatmap
            </h2>
            <p className="text-sm text-muted-foreground">
              Visualise component coverage by risk and delivery status. Select a tile to review linked components and upload
              supporting workpapers.
            </p>
          </div>
        </div>
        <div className="mt-4 overflow-x-auto">
          <table className="min-w-full border border-border text-left text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="px-3 py-2 font-medium">Risk level</th>
                {statusColumns.map((status) => (
                  <th key={status} className="px-3 py-2 font-medium">
                    {formatLabel(status)}
                  </th>
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
                    const intensity = count === 0 ? 'bg-white' : count < 2 ? 'bg-emerald-50' : count < 4 ? 'bg-amber-50' : 'bg-rose-50';
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
        <h2 id="instruction-tracker" className="text-lg font-semibold">
          Instruction tracker
        </h2>
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
                      <td className="px-3 py-2 align-top">
                        {component ? component.name : 'Unknown component'}
                      </td>
                      <td className={`px-3 py-2 align-top ${overdue ? 'text-rose-600 font-medium' : ''}`}>
                        {formatDate(instruction.dueAt)}
                      </td>
                      <td className="px-3 py-2 align-top">
                        <StatusBadge status={instruction.status} />
                      </td>
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
        <h2 id="review-queue" className="text-lg font-semibold">
          Review queue
        </h2>
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
                      <td className="px-3 py-2 align-top">
                        {component ? component.name : 'Unknown component'}
                      </td>
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
                      <td className="px-3 py-2 align-top">
                        {review.reviewerId ?? 'Unassigned'}
                      </td>
                      <td className="px-3 py-2 align-top">
                        <StatusBadge status={review.status} />
                      </td>
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
