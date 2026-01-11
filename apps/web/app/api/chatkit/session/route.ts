/**
 * ChatKit Session API Route
 * 
 * Creates and manages ChatKit sessions for OpenAI ChatKit integration
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';

export const runtime = 'edge';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { agentSessionId, chatkitSessionId, metadata } = body;

    if (!agentSessionId || !chatkitSessionId) {
      return NextResponse.json(
        { error: 'agentSessionId and chatkitSessionId are required' },
        { status: 400 }
      );
    }

    // Call the backend API (gateway or RAG service)
    const backendUrl = process.env.NEXT_PUBLIC_API_URL || process.env.API_BASE_URL || 'http://localhost:8000';
    const response = await fetch(`${backendUrl}/api/agent/chatkit/session`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
      },
      body: JSON.stringify({
        agentSessionId,
        chatkitSessionId,
        metadata,
      }),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Failed to create session' }));
      return NextResponse.json(error, { status: response.status });
    }

    const data = await response.json();
    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    console.error('ChatKit session creation error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get('id');

    if (!sessionId) {
      return NextResponse.json({ error: 'Session ID is required' }, { status: 400 });
    }

    const backendUrl = process.env.NEXT_PUBLIC_API_URL || process.env.API_BASE_URL || 'http://localhost:8000';
    const response = await fetch(`${backendUrl}/api/agent/chatkit/session/${sessionId}`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
      },
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Failed to fetch session' }));
      return NextResponse.json(error, { status: response.status });
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('ChatKit session fetch error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
