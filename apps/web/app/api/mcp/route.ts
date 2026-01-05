/**
 * MCP Server API Route
 * 
 * Handles Model Context Protocol requests
 * 
 * Uses the centralized tools registry from @prisma/tools
 */

import { NextRequest, NextResponse } from 'next/server';
import { createMCPServerWithHandlers } from '@prisma/lib/openai/mcp-server';
import { toolRegistry } from '@prisma/tools';
import type { ToolContext, UserRole } from '@prisma/tools';
import { withRateLimit, RateLimitConfigs } from '@/lib/rate-limit/rate-limiter';
import { metrics, MetricNames } from '@/lib/observability/metrics';
import { tracer } from '@/lib/observability/tracing';

// Context extractor for MCP requests
async function extractMCPContext(request: NextRequest): Promise<ToolContext | null> {
  return extractContext(request);
}

// Initialize MCP server with all registered tools and context extractor
const mcpServer = createMCPServerWithHandlers(extractMCPContext);

/**
 * Extract user context from request
 * Extracts from Supabase JWT token in Authorization header
 */
import { extractContextFromJWT } from '@prisma/tools';

async function extractContext(request: NextRequest): Promise<ToolContext | null> {
  const authHeader = request.headers.get('authorization');
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }
  
  const token = authHeader.substring(7);
  const requestId = request.headers.get('x-request-id') || undefined;
  
  try {
    const context = await extractContextFromJWT(token);
    
    if (!context) {
      return null;
    }
    
    // Add request ID to context
    return {
      ...context,
      requestId,
    };
  } catch (error) {
    console.error('Failed to extract context:', error);
    return null;
  }
}

async function handleMCPRequest(request: NextRequest) {
  const traceContext = tracer.startSpan('mcp.request');
  const startTime = Date.now();

  try {
    metrics.increment(MetricNames.API_REQUESTS_TOTAL, 1, { endpoint: '/api/mcp' });
    
    const body = await request.json();
    
    // If this is a tool call, we need to use the tools registry
    if (body.method === 'tools/call') {
      const { name, arguments: args } = body.params || {};
      const context = await extractContext(request);
      
      if (!context) {
        metrics.increment(MetricNames.API_REQUESTS_ERRORS, 1, { endpoint: '/api/mcp', error: 'unauthorized' });
        tracer.endSpan(traceContext.spanId, 'error', new Error('Authentication required'));
        
        return NextResponse.json(
          {
            error: {
              code: -32000,
              message: 'Authentication required',
            },
          },
          { status: 401 }
        );
      }
      
      // Execute tool through registry (includes permission checks and audit logging)
      const toolTraceContext = tracer.startSpan(`tool.${name}`, traceContext);
      const toolStartTime = Date.now();
      
      const result = await toolRegistry.execute(name, args || {}, context);
      
      const toolDuration = Date.now() - toolStartTime;
      metrics.histogram(MetricNames.TOOL_CALLS_DURATION, toolDuration, { tool: name });
      
      if (result.success) {
        metrics.increment(MetricNames.TOOL_CALLS_TOTAL, 1, { tool: name });
        tracer.endSpan(toolTraceContext.spanId, 'ok');
      } else {
        metrics.increment(MetricNames.TOOL_CALLS_ERRORS, 1, { tool: name });
        tracer.endSpan(toolTraceContext.spanId, 'error', new Error(result.error?.message));
      }
      
      // Convert to MCP response format
      if (result.success) {
        const duration = Date.now() - startTime;
        metrics.histogram(MetricNames.API_REQUESTS_DURATION, duration, { endpoint: '/api/mcp' });
        tracer.endSpan(traceContext.spanId, 'ok');
        
        return NextResponse.json({
          result: {
            content: [
              {
                type: 'text',
                text: JSON.stringify(result.data, null, 2),
              },
            ],
            isError: false,
          },
        });
      } else {
        const duration = Date.now() - startTime;
        metrics.histogram(MetricNames.API_REQUESTS_DURATION, duration, { endpoint: '/api/mcp', error: 'tool_failed' });
        tracer.endSpan(traceContext.spanId, 'error', new Error(result.error?.message));
        
        return NextResponse.json({
          error: {
            code: -32603,
            message: result.error?.message || 'Tool execution failed',
            data: result.error,
          },
        });
      }
    }
    
    // For other MCP methods, use the server handler
    const response = await mcpServer.handleRequest(body);
    
    const duration = Date.now() - startTime;
    metrics.histogram(MetricNames.API_REQUESTS_DURATION, duration, { endpoint: '/api/mcp' });
    tracer.endSpan(traceContext.spanId, 'ok');
    
    return NextResponse.json(response);
  } catch (error) {
    const duration = Date.now() - startTime;
    metrics.increment(MetricNames.API_REQUESTS_ERRORS, 1, { endpoint: '/api/mcp', error: 'internal' });
    metrics.histogram(MetricNames.API_REQUESTS_DURATION, duration, { endpoint: '/api/mcp', error: 'internal' });
    tracer.endSpan(traceContext.spanId, 'error', error as Error);
    
    console.error('MCP Server error:', error);
    return NextResponse.json(
      {
        error: {
          code: -32603,
          message: error instanceof Error ? error.message : 'Internal error',
        },
      },
      { status: 500 }
    );
  }
}

export const POST = withRateLimit(RateLimitConfigs.MCP_REQUESTS, handleMCPRequest);

export async function GET(request: NextRequest) {
  // Return server capabilities
  return NextResponse.json({
    capabilities: mcpServer.getCapabilities(),
  });
}

