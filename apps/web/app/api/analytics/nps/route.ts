import { NextResponse } from 'next/server';
import { getServiceSupabaseClient } from '@/lib/supabase-server';

interface PostPayload {
  orgId?: string;
  score?: number;
  feedback?: string;
  userId?: string;
}

export async function POST(request: Request) {
  const payload = (await request.json()) as PostPayload;
  const score = payload.score;
  const orgId = payload.orgId;

  if (!orgId || typeof score !== 'number') {
    return NextResponse.json({ error: 'orgId and score are required' }, { status: 400 });
  }

  if (score < 0 || score > 10) {
    return NextResponse.json({ error: 'score must be between 0 and 10' }, { status: 400 });
  }

  const supabase = await getServiceSupabaseClient();
  const { data, error } = await supabase
    .from('nps_responses')
    .insert({
      org_id: orgId,
      user_id: payload.userId ?? null,
      score,
      feedback: payload.feedback ?? null,
    })
    .select('id, submitted_at')
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message ?? 'nps_insert_failed' }, { status: 500 });
  }

  return NextResponse.json({ response: data }, { status: 201 });
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const orgId = url.searchParams.get('orgId');
  if (!orgId) {
    return NextResponse.json({ error: 'orgId is required' }, { status: 400 });
  }

  const supabase = await getServiceSupabaseClient();
  const { data, error } = await supabase
    .from('nps_responses')
    .select('score, feedback, submitted_at')
    .eq('org_id', orgId)
    .order('submitted_at', { ascending: false })
    .limit(50);

  if (error) {
    return NextResponse.json({ error: error.message ?? 'nps_fetch_failed' }, { status: 500 });
  }

  const scores = data ?? [];
  const promoters = scores.filter((row) => row.score >= 9).length;
  const detractors = scores.filter((row) => row.score <= 6).length;
  const passives = scores.length - promoters - detractors;
  const npsScore = scores.length
    ? Math.round(((promoters - detractors) / scores.length) * 100)
    : null;

  return NextResponse.json(
    {
      summary: {
        score: npsScore,
        promoters,
        passives,
        detractors,
        responses: scores.length,
      },
      responses: scores,
    },
    { status: 200 },
  );
}
