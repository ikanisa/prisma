/**
 * ChatKit Message API Route
 * 
 * Handles sending messages and receiving responses with widgets
 * Uses agent router and tool registry for AI-first interactions
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { agentRouter, toolRegistry } from '@prisma/tools';
import { extractContextFromJWT } from '@prisma/tools';
import type { ToolContext } from '@prisma/tools';
import { createWidgetFromToolResult } from '@/lib/chatkit/widget-factory';

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
    const { sessionId, message, agentType, context, stream } = body;

    if (!sessionId || !message) {
      return NextResponse.json(
        { error: 'sessionId and message are required' },
        { status: 400 }
      );
    }

    // Get org context from session
    const { data: session } = await supabase.auth.getSession();
    const orgSlug = body.orgSlug || context?.orgSlug;

    if (!orgSlug) {
      return NextResponse.json({ error: 'orgSlug is required' }, { status: 400 });
    }

    // If streaming is requested
    if (stream) {
      // Return SSE stream
      const encoder = new TextEncoder();
      const stream = new ReadableStream({
        async start(controller) {
          try {
            const backendUrl = process.env.NEXT_PUBLIC_API_URL || process.env.API_BASE_URL || 'http://localhost:8000';
            const response = await fetch(
              `${backendUrl}/api/agent/stream?orgSlug=${encodeURIComponent(orgSlug)}&question=${encodeURIComponent(message)}&agentType=${agentType || ''}`,
              {
                method: 'GET',
                headers: {
                  Authorization: `Bearer ${session?.access_token}`,
                },
              }
            );

            if (!response.ok) {
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: 'Stream failed' })}\n\n`));
              controller.close();
              return;
            }

            const reader = response.body?.getReader();
            const decoder = new TextDecoder();

            if (!reader) {
              controller.close();
              return;
            }

            while (true) {
              const { done, value } = await reader.read();
              if (done) {
                controller.enqueue(encoder.encode('data: [DONE]\n\n'));
                controller.close();
                break;
              }

              const chunk = decoder.decode(value, { stream: true });
              const lines = chunk.split('\n');

              for (const line of lines) {
                if (line.startsWith('data: ')) {
                  controller.enqueue(encoder.encode(line + '\n'));
                }
              }
            }
          } catch (error) {
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify({ error: error instanceof Error ? error.message : 'Stream error' })}\n\n`)
            );
            controller.close();
          }
        },
      });

      return new Response(stream, {
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          Connection: 'keep-alive',
        },
      });
    }

    // Extract context for tool execution
    const authHeader = request.headers.get('authorization');
    let toolContext: ToolContext | null = null;

    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      toolContext = await extractContextFromJWT(token);
    }

    // Route message to appropriate agent
    const route = toolContext ? agentRouter.route(message, toolContext) : null;
    const selectedAgentId = agentType || route?.agentId || 'general-agent';

    // For now, use backend agent system
    // In production, this would use the tool registry directly
    const backendUrl = process.env.NEXT_PUBLIC_API_URL || process.env.API_BASE_URL || 'http://localhost:8000';
    const response = await fetch(`${backendUrl}/api/agent/respond`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session?.access_token}`,
      },
      body: JSON.stringify({
        orgSlug,
        request: message,
        agentType: selectedAgentId,
        context,
      }),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Failed to send message' }));
      return NextResponse.json(error, { status: response.status });
    }

    const data = await response.json();

    // Enhance response with widgets if tool results are present
    // In production, this would parse tool calls and create widgets
    return NextResponse.json({
      ...data,
      agentId: selectedAgentId,
      agentName: route?.agentName || 'General Assistant',
    });
  } catch (error) {
    console.error('ChatKit message error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
