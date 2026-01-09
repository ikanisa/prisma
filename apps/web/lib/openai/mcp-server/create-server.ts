/**
 * Create Prisma Glow MCP Server
 * 
 * Creates an MCP server instance with all registered tools
 */

import { MCPServer } from './server';
import type { MCPServerConfig, MCPTool } from './types';
import { toolRegistry } from '@prisma/tools';
import type { ToolContext, UserRole } from '@prisma/tools';

/**
 * Convert tool definition to MCP tool format
 */
function convertToolToMCP(toolDef: import('@prisma/tools').ToolDefinition): MCPTool {
  return {
    name: toolDef.name,
    description: toolDef.description,
    inputSchema: toolDef.inputSchema as MCPTool['inputSchema'],
  };
}

/**
 * Create Prisma Glow MCP server configuration
 */
export function createPrismaGlowMCPServer(): MCPServerConfig {
  // Get all tools from registry
  const toolDefinitions = toolRegistry.listTools();
  const mcpTools: MCPTool[] = toolDefinitions.map(convertToolToMCP);

  return {
    name: 'prisma-glow',
    version: '1.0.0',
    description: 'Prisma Glow AI-powered audit, tax, and accounting operations platform',
    tools: mcpTools,
    resources: [],
    prompts: [],
  };
}

/**
 * Create MCP server instance with tool handlers
 * 
 * @param contextExtractor - Function to extract ToolContext from request
 */
export function createMCPServerWithHandlers(
  contextExtractor?: (request: any) => Promise<ToolContext | null>
): MCPServer {
  const config = createPrismaGlowMCPServer();
  const server = new MCPServer(config);

  // Register all tool handlers from registry
  const toolDefinitions = toolRegistry.listTools();
  
  for (const toolDef of toolDefinitions) {
    const handler = toolRegistry.getHandler(toolDef.name);
    if (handler) {
      server.registerTool(toolDef.name, async (args, request?: any) => {
        // Extract context from request if extractor provided
        let context: ToolContext;
        
        if (contextExtractor && request) {
          const extractedContext = await contextExtractor(request);
          if (extractedContext) {
            context = extractedContext;
          } else {
            // Fallback to system context if extraction fails
            context = {
              userId: 'system',
              userRole: 'STAFF' as UserRole,
              requestId: undefined,
            };
          }
        } else {
          // Default context (for testing/development)
          context = {
            userId: 'system',
            userRole: 'STAFF' as UserRole,
            requestId: undefined,
          };
        }

        // Execute tool
        const result = await toolRegistry.execute(toolDef.name, args, context);

        // Convert result to MCP format
        if (result.success) {
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify(result.data, null, 2),
              },
            ],
            isError: false,
          };
        } else {
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify(result.error, null, 2),
              },
            ],
            isError: true,
          };
        }
      });
    }
  }

  return server;
}

