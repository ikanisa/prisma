/**
 * OpenAI MCP Server Implementation
 * 
 * Model Context Protocol server for OpenAI Apps SDK integration
 */

import type {
  MCPServerConfig,
  MCPTool,
  MCPToolCall,
  MCPToolResult,
  MCPRequest,
  MCPResponse,
} from './types';

export class MCPServer {
  private config: MCPServerConfig;
  private toolHandlers: Map<string, (args: Record<string, unknown>) => Promise<MCPToolResult>> = new Map();

  constructor(config: MCPServerConfig) {
    this.config = config;
  }

  /**
   * Register a tool handler
   */
  registerTool(
    name: string,
    handler: (args: Record<string, unknown>) => Promise<MCPToolResult>
  ): void {
    this.toolHandlers.set(name, handler);
  }

  /**
   * Handle MCP request
   */
  async handleRequest(request: MCPRequest): Promise<MCPResponse> {
    try {
      switch (request.method) {
        case 'tools/list':
          return this.handleListTools();

        case 'tools/call':
          return await this.handleToolCall(request.params as { name: string; arguments: Record<string, unknown> });

        case 'resources/list':
          return this.handleListResources();

        case 'resources/read':
          return await this.handleReadResource(request.params as { uri: string });

        case 'prompts/list':
          return this.handleListPrompts();

        default:
          return {
            error: {
              code: -32601,
              message: `Method not found: ${request.method}`,
            },
          };
      }
    } catch (error) {
      return {
        error: {
          code: -32603,
          message: error instanceof Error ? error.message : 'Internal error',
          data: error,
        },
      };
    }
  }

  /**
   * List available tools
   */
  private handleListTools(): MCPResponse {
    return {
      result: {
        tools: this.config.tools.map((tool) => ({
          name: tool.name,
          description: tool.description,
          inputSchema: tool.inputSchema,
        })),
      },
    };
  }

  /**
   * Call a tool
   */
  private async handleToolCall(params: { name: string; arguments: Record<string, unknown> }): Promise<MCPResponse> {
    const { name, arguments: args } = params;

    const tool = this.config.tools.find((t) => t.name === name);
    if (!tool) {
      return {
        error: {
          code: -32601,
          message: `Tool not found: ${name}`,
        },
      };
    }

    // Validate required parameters
    if (tool.inputSchema.required) {
      for (const requiredParam of tool.inputSchema.required) {
        if (!(requiredParam in args)) {
          return {
            error: {
              code: -32602,
              message: `Missing required parameter: ${requiredParam}`,
            },
          };
        }
      }
    }

    // Get handler
    const handler = this.toolHandlers.get(name);
    if (!handler) {
      return {
        error: {
          code: -32601,
          message: `Handler not registered for tool: ${name}`,
        },
      };
    }

    try {
      const result = await handler(args);
      return {
        result: {
          content: result.content,
          isError: result.isError || false,
        },
      };
    } catch (error) {
      return {
        result: {
          content: [
            {
              type: 'text',
              text: error instanceof Error ? error.message : 'Tool execution failed',
            },
          ],
          isError: true,
        },
      };
    }
  }

  /**
   * List available resources
   */
  private handleListResources(): MCPResponse {
    return {
      result: {
        resources: this.config.resources || [],
      },
    };
  }

  /**
   * Read a resource
   */
  private async handleReadResource(params: { uri: string }): Promise<MCPResponse> {
    const { uri } = params;

    const resource = this.config.resources?.find((r) => r.uri === uri);
    if (!resource) {
      return {
        error: {
          code: -32601,
          message: `Resource not found: ${uri}`,
        },
      };
    }

    // In a real implementation, you would fetch the resource content
    // This is a placeholder
    return {
      result: {
        contents: [
          {
            uri: resource.uri,
            mimeType: resource.mimeType || 'text/plain',
            text: `Resource content for ${resource.name}`,
          },
        ],
      },
    };
  }

  /**
   * List available prompts
   */
  private handleListPrompts(): MCPResponse {
    return {
      result: {
        prompts: this.config.prompts || [],
      },
    };
  }

  /**
   * Get server capabilities
   */
  getCapabilities(): {
    tools: { listChanged: boolean };
    resources: { subscribe: boolean; listChanged: boolean };
    prompts: { listChanged: boolean };
  } {
    return {
      tools: {
        listChanged: true,
      },
      resources: {
        subscribe: false,
        listChanged: true,
      },
      prompts: {
        listChanged: true,
      },
    };
  }
}

/**
 * Create a default MCP server configuration for Prisma Glow
 */
export function createPrismaGlowMCPServer(): MCPServerConfig {
  return {
    name: 'prisma-glow-mcp',
    version: '1.0.0',
    description: 'MCP server for Prisma Glow accounting, audit, and tax operations',
    tools: [
      {
        name: 'file_search',
        description: 'Search files in the knowledge base',
        inputSchema: {
          type: 'object',
          properties: {
            query: {
              type: 'string',
              description: 'Search query',
            },
            maxResults: {
              type: 'number',
              description: 'Maximum number of results',
              default: 10,
            },
          },
          required: ['query'],
        },
      },
      {
        name: 'web_search',
        description: 'Search the web for information',
        inputSchema: {
          type: 'object',
          properties: {
            query: {
              type: 'string',
              description: 'Search query',
            },
          },
          required: ['query'],
        },
      },
      {
        name: 'calculate_tax',
        description: 'Calculate tax for a given amount and jurisdiction',
        inputSchema: {
          type: 'object',
          properties: {
            amount: {
              type: 'number',
              description: 'Amount to calculate tax for',
            },
            jurisdiction: {
              type: 'string',
              description: 'Jurisdiction code (e.g., RW, MT)',
            },
            taxType: {
              type: 'string',
              description: 'Type of tax (VAT, CIT, WHT, etc.)',
            },
          },
          required: ['amount', 'jurisdiction'],
        },
      },
      {
        name: 'get_audit_guidance',
        description: 'Get audit guidance for a specific topic',
        inputSchema: {
          type: 'object',
          properties: {
            topic: {
              type: 'string',
              description: 'Audit topic',
            },
            jurisdiction: {
              type: 'string',
              description: 'Jurisdiction code',
            },
          },
          required: ['topic'],
        },
      },
    ],
    resources: [
      {
        uri: 'prisma-glow://knowledge-base',
        name: 'Knowledge Base',
        description: 'Access to Prisma Glow knowledge base',
        mimeType: 'application/json',
      },
      {
        uri: 'prisma-glow://agent-registry',
        name: 'Agent Registry',
        description: 'Access to agent registry',
        mimeType: 'application/json',
      },
    ],
    prompts: [
      {
        name: 'audit_plan',
        description: 'Generate an audit plan',
        arguments: [
          {
            name: 'entity',
            description: 'Entity to audit',
            required: true,
          },
          {
            name: 'jurisdiction',
            description: 'Jurisdiction code',
            required: true,
          },
        ],
      },
      {
        name: 'tax_calculation',
        description: 'Calculate tax obligations',
        arguments: [
          {
            name: 'amount',
            description: 'Amount to calculate tax for',
            required: true,
          },
          {
            name: 'jurisdiction',
            description: 'Jurisdiction code',
            required: true,
          },
        ],
      },
    ],
  };
}

