/**
 * Agent Builder API Route
 * 
 * Handles Agent Builder workflow operations
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  createWorkflow,
  validateWorkflow,
  exportWorkflow,
  type AgentBuilderWorkflow,
} from '@prisma/lib/openai/agent-builder';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, workflow, format } = body;

    switch (action) {
      case 'create': {
        const { name, description, nodes = [], connections = [] } = body;
        const newWorkflow = createWorkflow(name, description, nodes, connections);
        return NextResponse.json({ workflow: newWorkflow });
      }

      case 'validate': {
        if (!workflow) {
          return NextResponse.json(
            { error: 'Workflow is required' },
            { status: 400 }
          );
        }
        const validation = validateWorkflow(workflow as AgentBuilderWorkflow);
        return NextResponse.json({ validation });
      }

      case 'export': {
        if (!workflow) {
          return NextResponse.json(
            { error: 'Workflow is required' },
            { status: 400 }
          );
        }
        const exported = exportWorkflow(
          workflow as AgentBuilderWorkflow,
          format || 'json',
          body.includeMetadata !== false
        );
        return NextResponse.json({ exported, format: format || 'json' });
      }

      default:
        return NextResponse.json(
          { error: `Unknown action: ${action}` },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('Agent Builder API error:', error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Internal server error',
      },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const action = searchParams.get('action');

  if (action === 'templates') {
    // Return available workflow templates
    return NextResponse.json({
      templates: [
        {
          id: 'tax-calculation',
          name: 'Tax Calculation Workflow',
          description: 'Calculate tax for multiple jurisdictions',
          category: 'tax',
        },
        {
          id: 'audit-planning',
          name: 'Audit Planning Workflow',
          description: 'Generate comprehensive audit plan',
          category: 'audit',
        },
        {
          id: 'document-processing',
          name: 'Document Processing Workflow',
          description: 'Process and classify documents',
          category: 'accounting',
        },
      ],
    });
  }

  return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
}

