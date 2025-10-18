import { NextRequest, NextResponse } from 'next/server';
import { logOiAction, tryGetServiceSupabase } from '@/lib/supabase';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

type OtherInfoDocRow = {
  id: string;
  title: string;
  status: string;
  metadata: Record<string, unknown> | null;
  uploaded_at: string | null;
};

type OiFlagRow = {
  id: string;
  status: string;
  category: string;
  severity: string;
  description: string;
  resolution_notes: string | null;
};

type ComparativesCheckRow = {
  id: string;
  status: string;
  assertion: string;
  notes: string | null;
};

function badRequest(message: string) {
  return NextResponse.json({ error: message }, { status: 400 });
}

interface ReportRequestBody {
  orgId?: string;
  engagementId?: string;
  actorId?: string;
}

export async function POST(request: NextRequest) {
  let payload: ReportRequestBody;
  try {
    payload = (await request.json()) as ReportRequestBody;
  } catch {
    return badRequest('Invalid JSON body.');
  }

  const { orgId, engagementId, actorId } = payload;

  if (!orgId) {
    return badRequest('orgId is required.');
  }
  if (!engagementId) {
    return badRequest('engagementId is required.');
  }
  if (!actorId) {
    return badRequest('actorId is required.');
  }

  const supabase = tryGetServiceSupabase();
  if (!supabase) {
    return NextResponse.json({ reportText: '', documents: [], flags: [], checks: [], generatedAt: new Date().toISOString() });
  }
  const [docsResult, flagsResult, checksResult] = await Promise.all([
    supabase
      .from('other_information_docs')
      .select('id,title,status,metadata,uploaded_at')
      .eq('org_id', orgId)
      .eq('engagement_id', engagementId)
      .order('uploaded_at', { ascending: true }),
    supabase
      .from('oi_flags')
      .select('id,status,category,severity,description,resolution_notes')
      .eq('org_id', orgId)
      .eq('engagement_id', engagementId)
      .order('created_at', { ascending: true }),
    supabase
      .from('comparatives_checks')
      .select('id,status,assertion,notes')
      .eq('org_id', orgId)
      .eq('engagement_id', engagementId)
      .order('created_at', { ascending: true }),
  ]);

  if (docsResult.error) {
    return NextResponse.json({ error: docsResult.error.message }, { status: 500 });
  }
  if (flagsResult.error) {
    return NextResponse.json({ error: flagsResult.error.message }, { status: 500 });
  }
  if (checksResult.error) {
    return NextResponse.json({ error: checksResult.error.message }, { status: 500 });
  }

  const documents = (docsResult.data ?? []) as OtherInfoDocRow[];
  const flags = (flagsResult.data ?? []) as OiFlagRow[];
  const checks = (checksResult.data ?? []) as ComparativesCheckRow[];

  const openFlags = flags.filter((flag) => flag.status !== 'resolved');
  const completedChecks = checks.filter((check) => check.status === 'completed');
  const outstandingChecks = checks.filter((check) => check.status !== 'completed');

  const documentLines = documents.map((doc) => {
    const meta = (doc.metadata ?? {}) as Record<string, unknown>;
    const pageCount = typeof meta.pageCount === 'number' ? `${meta.pageCount} pages` : 'page count n/a';
    return `• ${doc.title} (${doc.status}) – ${pageCount}`;
  });

  const flagLines = flags.map((flag) => {
    const prefix = flag.status === 'resolved' ? 'Resolved' : 'Open';
    return `• ${prefix} ${flag.category} (${flag.severity}): ${flag.description}`;
  });

  const checkLines = checks.map((check) => {
    const suffix = check.notes ? ` – Notes: ${check.notes}` : '';
    return `• [${check.status}] ${check.assertion}${suffix}`;
  });

  const sections = [
    'In accordance with ISA 720 we performed procedures to evaluate whether the other information is materially inconsistent with the audited financial statements or our knowledge obtained in the audit.',
    documentLines.length
      ? `Documents reviewed (${documents.length}):\n${documentLines.join('\n')}`
      : 'No other information documents have been uploaded for review.',
    flagLines.length
      ? `Reviewer flags (${flags.length}, open ${openFlags.length}):\n${flagLines.join('\n')}`
      : 'No reviewer flags have been raised against the other information.',
    checkLines.length
      ? `Comparatives checklist (${completedChecks.length} completed, ${outstandingChecks.length} outstanding):\n${checkLines.join('\n')}`
      : 'Comparatives checklist has not been initiated for this engagement (ISA 710).',
  ];

  const reportText = sections.join('\n\n');

  await logOiAction(supabase, {
    orgId,
    userId: actorId,
    action: 'OI_REPORT_EXPORTED',
    metadata: {
      documents: documents.length,
      flags: flags.length,
      checks: checks.length,
      openFlags: openFlags.length,
    },
  });

  return NextResponse.json({
    reportText,
    documents,
    flags,
    checks,
    generatedAt: new Date().toISOString(),
  });
}
