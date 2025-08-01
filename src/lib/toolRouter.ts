/**
 * COMPREHENSIVE TOOL ROUTER - PHASE 4
 * Centralized routing for all agent tools with enhanced capabilities
 */

import { createClient } from '@supabase/supabase-js';
import { toolRegistry } from '../agent/tools/registry';

// Lightweight optional OpenTelemetry support – the router will emit spans when
// the host application has `@opentelemetry/api` installed and a tracer provider
// registered.  In environments without OpenTelemetry the router falls back to
// no-op implementations so that the dependency remains optional.

let otelTracer: { startSpan: (name: string) => { end: () => void; recordException?: (err: unknown) => void } } = {
  startSpan: () => ({ end: () => {} })
};

try {
  // eslint-disable-next-line import/no-extraneous-dependencies, @typescript-eslint/no-var-requires
  const { trace } = require('@opentelemetry/api');
  otelTracer = trace.getTracer('wa-tool-router');
} catch {
  // OpenTelemetry not available – ignore.
}

const SUPABASE_URL = "https://ijblirphkrrsnxazohwt.supabase.co";
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

const sb = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

export interface ToolResult {
  success: boolean;
  data?: any;
  error?: string;
  execution_time_ms: number;
  tool_name: string;
  metadata?: Record<string, any>;
}

export interface ToolContext {
  userId: string;
  domain: string;
  sessionId?: string;
  metadata?: Record<string, any>;
}

/**
 * COMPREHENSIVE TOOL ROUTER
 * Routes and executes all agent tools with proper error handling and logging
 */
export class ToolRouter {
  private toolCache = new Map<string, any>();
  private executionLog: Array<{ tool: string; timestamp: number; success: boolean }> = [];

  /**
   * MAIN TOOL EXECUTION ROUTER
   */
  async executeTool(
    toolName: string,
    args: Record<string, any>,
    context: ToolContext
  ): Promise<ToolResult> {
    const startTime = performance.now();

    // ---- OpenTelemetry span ------------------------------------------------
    const span = otelTracer.startSpan?.('toolRouter.executeTool');
    
    console.log(`🔧 ToolRouter executing: ${toolName}`, {
      args: this.sanitizeArgs(args),
      userId: context.userId,
      domain: context.domain
    });

    try {
      let result: ToolResult;

      // Route to appropriate tool handler
      switch (toolName) {
        // Payment Tools
        case 'qr_render':
        case 'payment_qr_generate':
          result = await this.executePaymentTool(toolName, args, context);
          break;

        case 'momo_tx_check':
        case 'payment_status_check':
          result = await this.executePaymentStatusTool(toolName, args, context);
          break;

        // Mobility Tools
        case 'driver_trip_create':
          result = await this.executeMobilityTool(toolName, args, context);
          break;

        case 'passenger_intent_create':
          result = await this.executePassengerTool(toolName, args, context);
          break;

        case 'geo_search':
        case 'nearby_search':
          result = await this.executeGeoTool(toolName, args, context);
          break;

        // Listing Tools
        case 'list_item':
        case 'property_listing_create':
          result = await this.executeListingTool(toolName, args, context);
          break;

        case 'search_items':
        case 'listing_search':
          result = await this.executeSearchTool(toolName, args, context);
          break;

        // Commerce Tools
        case 'order_create':
          result = await this.executeOrderTool(toolName, args, context);
          break;

        case 'menu_fetch':
          result = await this.executeMenuTool(toolName, args, context);
          break;

        // Data & Admin Tools
        case 'google_places_importer':
          result = await this.executeDataTool(toolName, args, context);
          break;

        case 'handoff_create':
          result = await this.executeHandoffTool(toolName, args, context);
          break;

        case 'ticket_log':
          result = await this.executeSupportTool(toolName, args, context);
          break;

        // AI & Analysis Tools
        case 'quality_gate':
          result = await this.executeQualityTool(toolName, args, context);
          break;

        case 'intent_analyze':
          result = await this.executeAnalysisTool(toolName, args, context);
          break;

        // Default: Try tool registry
        default:
          result = await this.executeViaRegistry(toolName, args, context);
          break;
      }

      // Log execution
      this.logExecution(toolName, startTime, true, result);
      span?.end();
      
      console.log(`✅ Tool ${toolName} completed in ${result.execution_time_ms.toFixed(2)}ms`);
      return result;

    } catch (error) {
      const errorResult: ToolResult = {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        execution_time_ms: performance.now() - startTime,
        tool_name: toolName,
        metadata: { context }
      };

      this.logExecution(toolName, startTime, false, errorResult);
      span?.recordException?.(error);
      span?.end();
      console.error(`❌ Tool ${toolName} failed:`, error);
      
      return errorResult;
    }
  }

  /**
   * PAYMENT TOOLS
   */
  private async executePaymentTool(
    toolName: string,
    args: Record<string, any>,
    context: ToolContext
  ): Promise<ToolResult> {
    const startTime = performance.now();

    // Validate required payment fields
    if (!args.amount || args.amount <= 0) {
      throw new Error('Valid amount is required for payment tools');
    }

    if (!args.phone && !args.momo_number) {
      throw new Error('Phone or MoMo number is required');
    }

    // Call enhanced QR generator function
    const { data, error } = await sb.functions.invoke('enhanced-qr-generator', {
      body: {
        amount: args.amount,
        phone: args.phone || args.momo_number,
        description: args.description || args.label || '',
        userId: context.userId
      }
    });

    if (error) {
      throw new Error(`Payment tool failed: ${error.message}`);
    }

    return {
      success: true,
      data: {
        qr_url: data.qr_url,
        ussd_string: data.ussd_string,
        payment_id: data.payment_id,
        amount: args.amount,
        phone: args.phone || args.momo_number
      },
      execution_time_ms: performance.now() - startTime,
      tool_name: toolName,
      metadata: { domain: 'payment' }
    };
  }

  /**
   * PAYMENT STATUS TOOLS
   */
  private async executePaymentStatusTool(
    toolName: string,
    args: Record<string, any>,
    context: ToolContext
  ): Promise<ToolResult> {
    const startTime = performance.now();

    if (!args.transaction_id && !args.payment_id) {
      throw new Error('Transaction ID or Payment ID is required');
    }

    const { data, error } = await sb.functions.invoke('enhanced-payment-processor', {
      body: {
        action: 'check_status',
        transaction_id: args.transaction_id || args.payment_id,
        phone: args.phone,
        userId: context.userId
      }
    });

    if (error) {
      throw new Error(`Payment status check failed: ${error.message}`);
    }

    return {
      success: true,
      data,
      execution_time_ms: performance.now() - startTime,
      tool_name: toolName,
      metadata: { domain: 'payment' }
    };
  }

  /**
   * MOBILITY TOOLS
   */
  private async executeMobilityTool(
    toolName: string,
    args: Record<string, any>,
    context: ToolContext
  ): Promise<ToolResult> {
    const startTime = performance.now();

    // Validate required mobility fields
    if (!args.pickup_lat || !args.pickup_lng) {
      throw new Error('Pickup coordinates are required');
    }

    const { data, error } = await sb.functions.invoke('driver-trip-create', {
      body: {
        driver_id: context.userId,
        pickup_lat: args.pickup_lat,
        pickup_lng: args.pickup_lng,
        destination_lat: args.destination_lat,
        destination_lng: args.destination_lng,
        price_estimate: args.price_estimate || 2000,
        seats: args.seats || 1
      }
    });

    if (error) {
      throw new Error(`Mobility tool failed: ${error.message}`);
    }

    return {
      success: true,
      data,
      execution_time_ms: performance.now() - startTime,
      tool_name: toolName,
      metadata: { domain: 'mobility' }
    };
  }

  /**
   * PASSENGER TOOLS
   */
  private async executePassengerTool(
    toolName: string,
    args: Record<string, any>,
    context: ToolContext
  ): Promise<ToolResult> {
    const startTime = performance.now();

    const { data, error } = await sb.functions.invoke('passenger-intent-create', {
      body: {
        passenger_id: context.userId,
        pickup_lat: args.pickup_lat,
        pickup_lng: args.pickup_lng,
        max_budget: args.max_budget || 5000,
        seats: args.seats || 1
      }
    });

    if (error) {
      throw new Error(`Passenger tool failed: ${error.message}`);
    }

    return {
      success: true,
      data,
      execution_time_ms: performance.now() - startTime,
      tool_name: toolName,
      metadata: { domain: 'mobility' }
    };
  }

  /**
   * GEO SEARCH TOOLS
   */
  private async executeGeoTool(
    toolName: string,
    args: Record<string, any>,
    context: ToolContext
  ): Promise<ToolResult> {
    const startTime = performance.now();

    const { data, error } = await sb.functions.invoke('nearby-trips', {
      body: {
        lat: args.lat,
        lng: args.lng,
        radius_km: args.radius_km || 5,
        type: args.type || 'drivers',
        limit: args.limit || 10
      }
    });

    if (error) {
      throw new Error(`Geo search failed: ${error.message}`);
    }

    return {
      success: true,
      data,
      execution_time_ms: performance.now() - startTime,
      tool_name: toolName,
      metadata: { domain: 'geo' }
    };
  }

  /**
   * LISTING TOOLS
   */
  private async executeListingTool(
    toolName: string,
    args: Record<string, any>,
    context: ToolContext
  ): Promise<ToolResult> {
    const startTime = performance.now();

    if (!args.title || !args.price || !args.type) {
      throw new Error('Title, price, and type are required for listings');
    }

    const { data, error } = await sb.functions.invoke('listing-publish', {
      body: {
        type: args.type,
        title: args.title,
        description: args.description || '',
        price: args.price,
        location: args.location || '',
        user_id: context.userId,
        metadata: args.metadata || {}
      }
    });

    if (error) {
      throw new Error(`Listing tool failed: ${error.message}`);
    }

    return {
      success: true,
      data,
      execution_time_ms: performance.now() - startTime,
      tool_name: toolName,
      metadata: { domain: 'listings' }
    };
  }

  /**
   * SEARCH TOOLS
   */
  private async executeSearchTool(
    toolName: string,
    args: Record<string, any>,
    context: ToolContext
  ): Promise<ToolResult> {
    const startTime = performance.now();

    const { data, error } = await sb.functions.invoke('listing-search', {
      body: {
        type: args.type || 'property',
        query: args.query || '',
        price_min: args.price_min,
        price_max: args.price_max,
        location: args.location,
        limit: args.limit || 10
      }
    });

    if (error) {
      throw new Error(`Search tool failed: ${error.message}`);
    }

    return {
      success: true,
      data,
      execution_time_ms: performance.now() - startTime,
      tool_name: toolName,
      metadata: { domain: 'search' }
    };
  }

  /**
   * ORDER TOOLS
   */
  private async executeOrderTool(
    toolName: string,
    args: Record<string, any>,
    context: ToolContext
  ): Promise<ToolResult> {
    const startTime = performance.now();

    if (!args.business_type || !args.items || !Array.isArray(args.items)) {
      throw new Error('Business type and items array are required');
    }

    const { data, error } = await sb.functions.invoke('create-unified-order', {
      body: {
        business_type: args.business_type,
        items: args.items,
        delivery_address: args.delivery_address,
        user_id: context.userId,
        special_instructions: args.special_instructions
      }
    });

    if (error) {
      throw new Error(`Order tool failed: ${error.message}`);
    }

    return {
      success: true,
      data,
      execution_time_ms: performance.now() - startTime,
      tool_name: toolName,
      metadata: { domain: 'commerce' }
    };
  }

  /**
   * MENU TOOLS
   */
  private async executeMenuTool(
    toolName: string,
    args: Record<string, any>,
    context: ToolContext
  ): Promise<ToolResult> {
    const startTime = performance.now();

    const { data, error } = await sb.functions.invoke('generate-dynamic-menu', {
      body: {
        business_id: args.business_id,
        category: args.category,
        table_code: args.table_code,
        location: args.location
      }
    });

    if (error) {
      throw new Error(`Menu tool failed: ${error.message}`);
    }

    return {
      success: true,
      data,
      execution_time_ms: performance.now() - startTime,
      tool_name: toolName,
      metadata: { domain: 'commerce' }
    };
  }

  /**
   * DATA TOOLS
   */
  private async executeDataTool(
    toolName: string,
    args: Record<string, any>,
    context: ToolContext
  ): Promise<ToolResult> {
    const startTime = performance.now();

    const { data, error } = await sb.functions.invoke('google-places-sync', {
      body: {
        location: args.location,
        radius_km: args.radius_km || 10,
        business_type: args.business_type,
        user_id: context.userId
      }
    });

    if (error) {
      throw new Error(`Data tool failed: ${error.message}`);
    }

    return {
      success: true,
      data,
      execution_time_ms: performance.now() - startTime,
      tool_name: toolName,
      metadata: { domain: 'data' }
    };
  }

  /**
   * HANDOFF TOOLS
   */
  private async executeHandoffTool(
    toolName: string,
    args: Record<string, any>,
    context: ToolContext
  ): Promise<ToolResult> {
    const startTime = performance.now();

    const { data, error } = await sb.functions.invoke('human-handoff', {
      body: {
        user_id: context.userId,
        reason: args.reason || 'User requested assistance',
        priority: args.priority || 'medium',
        context: args.context || context,
        source: 'agent_tool'
      }
    });

    if (error) {
      throw new Error(`Handoff tool failed: ${error.message}`);
    }

    return {
      success: true,
      data,
      execution_time_ms: performance.now() - startTime,
      tool_name: toolName,
      metadata: { domain: 'support' }
    };
  }

  /**
   * SUPPORT TOOLS
   */
  private async executeSupportTool(
    toolName: string,
    args: Record<string, any>,
    context: ToolContext
  ): Promise<ToolResult> {
    const startTime = performance.now();

    // Log to support system
    const supportEntry = {
      user_id: context.userId,
      type: args.type || 'general',
      message: args.message || args.description,
      metadata: {
        ...args.metadata,
        domain: context.domain,
        session_id: context.sessionId,
        timestamp: new Date().toISOString()
      }
    };

    // Store in database
    const { data, error } = await sb
      .from('content_moderation_logs')
      .insert({
        user_phone: context.userId,
        content_type: 'support_ticket',
        moderation_result: supportEntry,
        agent_id: context.userId
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Support tool failed: ${error.message}`);
    }

    return {
      success: true,
      data: {
        ticket_id: data.id,
        status: 'created',
        message: 'Support ticket created successfully'
      },
      execution_time_ms: performance.now() - startTime,
      tool_name: toolName,
      metadata: { domain: 'support' }
    };
  }

  /**
   * QUALITY TOOLS
   */
  private async executeQualityTool(
    toolName: string,
    args: Record<string, any>,
    context: ToolContext
  ): Promise<ToolResult> {
    const startTime = performance.now();

    const response = args.response || args.text || '';
    
    // Quality scoring algorithm
    let score = 0.5; // Base score
    
    // Length check
    if (response.length > 10 && response.length < 500) score += 0.2;
    
    // Engagement check
    if (response.includes('?') || response.includes('help')) score += 0.1;
    
    // Structure check
    if (response.split('.').length > 1) score += 0.1;
    
    // Tone check
    if (response.toLowerCase().includes('muraho') || response.includes('!')) score += 0.1;
    
    // No repetition
    if (!/(.)\1{3,}/.test(response)) score += 0.1;

    const approved = score >= 0.6;
    
    // Enhance response if needed
    let enhanced = response;
    if (!approved && response.length > 0) {
      enhanced = `${response}\n\nIs there anything else I can help you with?`;
      score += 0.1;
    }

    return {
      success: true,
      data: {
        approved,
        score: Math.min(score, 1.0),
        enhanced_response: enhanced,
        original_response: response,
        quality_metrics: {
          length_ok: response.length > 10 && response.length < 500,
          has_engagement: response.includes('?') || response.includes('help'),
          has_structure: response.split('.').length > 1,
          has_warmth: response.toLowerCase().includes('muraho') || response.includes('!'),
          no_repetition: !/(.)\1{3,}/.test(response)
        }
      },
      execution_time_ms: performance.now() - startTime,
      tool_name: toolName,
      metadata: { domain: 'quality' }
    };
  }

  /**
   * ANALYSIS TOOLS
   */
  private async executeAnalysisTool(
    toolName: string,
    args: Record<string, any>,
    context: ToolContext
  ): Promise<ToolResult> {
    const startTime = performance.now();

    const { data, error } = await sb.functions.invoke('omni-agent-enhanced', {
      body: {
        action: 'analyze_intent',
        message: args.message || args.text,
        domain: context.domain,
        user_id: context.userId
      }
    });

    if (error) {
      throw new Error(`Analysis tool failed: ${error.message}`);
    }

    return {
      success: true,
      data,
      execution_time_ms: performance.now() - startTime,
      tool_name: toolName,
      metadata: { domain: 'analysis' }
    };
  }

  /**
   * FALLBACK: Use Tool Registry
   */
  private async executeViaRegistry(
    toolName: string,
    args: Record<string, any>,
    context: ToolContext
  ): Promise<ToolResult> {
    console.log(`🔄 Falling back to tool registry for: ${toolName}`);
    
    const registryResult = await toolRegistry.executeTool(toolName, args);
    
    return {
      success: registryResult.success,
      data: registryResult.data,
      error: registryResult.error,
      execution_time_ms: registryResult.execution_time_ms || 0,
      tool_name: toolName,
      metadata: { source: 'tool_registry', domain: context.domain }
    };
  }

  /**
   * UTILITY METHODS
   */
  private sanitizeArgs(args: Record<string, any>): Record<string, any> {
    const sanitized = { ...args };
    
    // Remove sensitive data from logs
    if (sanitized.password) sanitized.password = '[REDACTED]';
    if (sanitized.api_key) sanitized.api_key = '[REDACTED]';
    if (sanitized.token) sanitized.token = '[REDACTED]';
    
    return sanitized;
  }

  private logExecution(
    toolName: string,
    startTime: number,
    success: boolean,
    result: ToolResult
  ): void {
    this.executionLog.push({
      tool: toolName,
      timestamp: startTime,
      success
    });

    // Keep only last 100 executions
    if (this.executionLog.length > 100) {
      this.executionLog = this.executionLog.slice(-100);
    }

    // Log to database for analytics
    sb.from('agent_execution_log').insert({
      function_name: toolName,
      execution_time_ms: Math.round(result.execution_time_ms),
      success_status: success,
      error_details: result.error,
      input_data: this.sanitizeArgs(result.metadata || {})
    }).then(({ error }) => {
      if (error) console.warn('Failed to log execution:', error);
    });
  }

  /**
   * Get execution statistics
   */
  public getStats(): {
    total_executions: number;
    success_rate: number;
    most_used_tools: Array<{ tool: string; count: number }>;
  } {
    const total = this.executionLog.length;
    const successes = this.executionLog.filter(log => log.success).length;
    
    const toolCounts = this.executionLog.reduce((acc, log) => {
      acc[log.tool] = (acc[log.tool] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const mostUsed = Object.entries(toolCounts)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 10)
      .map(([tool, count]) => ({ tool, count }));

    return {
      total_executions: total,
      success_rate: total > 0 ? successes / total : 0,
      most_used_tools: mostUsed
    };
  }
}

// Export singleton instance
export const toolRouter = new ToolRouter();
