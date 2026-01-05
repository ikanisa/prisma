/**
 * Agent Orchestrator API Route
 * 
 * Handles agent orchestration requests using the tool registry
 */

import { NextRequest, NextResponse } from 'next/server';
import { agentOrchestrator, agentRouter } from '@prisma/tools';
import { extractContextFromJWT } from '@prisma/tools';
import type { ToolContext } from '@prisma/tools';

/**
 * POST /api/agent/orchestrator
 * Execute an agent workflow or route a message to an agent
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, workflow, message } = body;

    // Extract context from JWT
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const token = authHeader.substring(7);
    const context = await extractContextFromJWT(token);
    
    if (!context) {
      return NextResponse.json(
        { error: 'Invalid token' },
        { status: 401 }
      );
    }

    // Add request ID
    const fullContext: ToolContext = {
      ...context,
      requestId: request.headers.get('x-request-id') || undefined,
    };

    switch (action) {
      case 'route':
        // Route message to appropriate agent
        if (!message) {
          return NextResponse.json(
            { error: 'Message is required for routing' },
            { status: 400 }
          );
        }

        const route = agentRouter.route(message, fullContext);
        return NextResponse.json({
          agentId: route?.agentId || 'general-agent',
          agentName: route?.agentName || 'General Assistant',
          message,
        });

      case 'execute-workflow':
        // Execute a workflow
        if (!workflow) {
          return NextResponse.json(
            { error: 'Workflow is required' },
            { status: 400 }
          );
        }

        const result = await agentOrchestrator.executeWorkflow(workflow, fullContext);
        return NextResponse.json(result);

      case 'list-tools':
        // List available tools for agent
        const tools = agentOrchestrator.getAvailableTools();
        return NextResponse.json({ tools });

      default:
        return NextResponse.json(
          { error: `Unknown action: ${action}` },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('Agent orchestrator error:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/agent/orchestrator
 * Get orchestrator capabilities
 */
export async function GET(request: NextRequest) {
  const tools = agentOrchestrator.getAvailableTools();
  const rules = agentRouter.getRules();

  return NextResponse.json({
    capabilities: {
      tools: tools.length,
      routingRules: rules.length,
    },
    tools: tools.map((t) => ({
      name: t.name,
      description: t.description,
      requiredRole: t.requiredRole,
    })),
    routingRules: rules.map((r) => ({
      agentId: r.agentId,
      agentName: r.agentName,
      priority: r.priority,
    })),
  });
}

