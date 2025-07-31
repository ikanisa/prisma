/**
 * VERIFIED TOOL ROUTER - PHASE 4 FINAL
 * Only routes to confirmed existing edge functions
 */

import { createClient } from '@supabase/supabase-js';
import { toolRegistry } from '../agent/tools/registry';

const SUPABASE_URL = "https://ijblirphkrrsnxazohwt.supabase.co";
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

const sb = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

/**
 * VERIFIED EDGE FUNCTIONS (based on actual logs)
 * Only these functions are confirmed to exist
 */
const VERIFIED_FUNCTIONS = new Set([
  'enhanced-qr-generator',
  'create-unified-order',
  'listing-publish', 
  'listing-search',
  'human-handoff',
  'schedule-task',
  'catalog-search',
  'omni-agent-router'
]);

export interface ToolResult {
  success: boolean;
  data?: any;
  error?: string;
  execution_time_ms: number;
  tool_name: string;
  verified_function: boolean;
}

export interface ToolContext {
  userId: string;
  domain: string;
  sessionId?: string;
}

/**
 * VERIFIED TOOL ROUTER
 * Routes only to confirmed existing functions with fallbacks
 */
export class VerifiedToolRouter {
  /**
   * EXECUTE TOOL - Route to verified functions or fallbacks
   */
  async executeTool(
    toolName: string,
    args: Record<string, any>,
    context: ToolContext
  ): Promise<ToolResult> {
    const startTime = performance.now();
    
    console.log(`🔧 VerifiedToolRouter executing: ${toolName}`, {
      userId: context.userId,
      domain: context.domain
    });

    try {
      // Route to verified functions
      const result = await this.routeToVerifiedFunction(toolName, args, context);
      
      if (result) {
        console.log(`✅ Tool ${toolName} completed via verified function`);
        return {
          success: true,
          data: result,
          execution_time_ms: performance.now() - startTime,
          tool_name: toolName,
          verified_function: true
        };
      }

      // Fallback to tool registry
      console.log(`🔄 Falling back to tool registry for: ${toolName}`);
      const registryResult = await toolRegistry.executeTool(toolName, args);
      
      return {
        success: registryResult.success,
        data: registryResult.data,
        error: registryResult.error,
        execution_time_ms: performance.now() - startTime,
        tool_name: toolName,
        verified_function: false
      };

    } catch (error) {
      console.error(`❌ Tool ${toolName} failed:`, error);
      
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        execution_time_ms: performance.now() - startTime,
        tool_name: toolName,
        verified_function: false
      };
    }
  }

  /**
   * ROUTE TO VERIFIED FUNCTION - Only call functions we know exist
   */
  private async routeToVerifiedFunction(
    toolName: string,
    args: Record<string, any>,
    context: ToolContext
  ): Promise<any> {
    
    // Payment tools -> enhanced-qr-generator
    if (toolName === 'qr_render' || toolName === 'payment_qr_generate') {
      if (!VERIFIED_FUNCTIONS.has('enhanced-qr-generator')) {
        throw new Error('QR generator function not available');
      }

      return await this.callEdgeFunction('enhanced-qr-generator', {
        amount: args.amount,
        phone: args.phone || args.momo_number,
        description: args.description || args.label || '',
        userId: context.userId
      });
    }

    // Order tools -> create-unified-order
    if (toolName === 'order_create') {
      if (!VERIFIED_FUNCTIONS.has('create-unified-order')) {
        throw new Error('Order creation function not available');
      }

      return await this.callEdgeFunction('create-unified-order', {
        business_type: args.business_type,
        items: args.items,
        delivery_address: args.delivery_address,
        user_id: context.userId
      });
    }

    // Listing tools -> listing-publish/listing-search
    if (toolName === 'list_item' || toolName === 'property_listing_create') {
      if (!VERIFIED_FUNCTIONS.has('listing-publish')) {
        throw new Error('Listing publish function not available');
      }

      return await this.callEdgeFunction('listing-publish', {
        type: args.type,
        title: args.title,
        description: args.description,
        price: args.price,
        location: args.location,
        user_id: context.userId
      });
    }

    if (toolName === 'search_items' || toolName === 'listing_search') {
      if (!VERIFIED_FUNCTIONS.has('listing-search')) {
        throw new Error('Listing search function not available');
      }

      return await this.callEdgeFunction('listing-search', {
        type: args.type,
        query: args.query,
        price_min: args.price_min,
        price_max: args.price_max,
        location: args.location
      });
    }

    // Support tools -> human-handoff
    if (toolName === 'handoff_create') {
      if (!VERIFIED_FUNCTIONS.has('human-handoff')) {
        throw new Error('Human handoff function not available');
      }

      return await this.callEdgeFunction('human-handoff', {
        user_id: context.userId,
        reason: args.reason || 'User requested assistance',
        priority: args.priority || 'medium',
        context: args.context || context
      });
    }

    // Product search -> catalog-search
    if (toolName === 'menu_fetch' || toolName === 'product_search') {
      if (!VERIFIED_FUNCTIONS.has('catalog-search')) {
        throw new Error('Catalog search function not available');
      }

      return await this.callEdgeFunction('catalog-search', {
        query: args.query || args.category,
        business_type: args.business_type,
        location: args.location
      });
    }

    // Task scheduling -> schedule-task
    if (toolName === 'schedule_task') {
      if (!VERIFIED_FUNCTIONS.has('schedule-task')) {
        throw new Error('Task scheduling function not available');
      }

      return await this.callEdgeFunction('schedule-task', {
        task_type: args.task_type,
        payload: args.payload,
        scheduled_for: args.scheduled_for
      });
    }

    // Agent routing -> omni-agent-router
    if (toolName === 'intent_analyze' || toolName === 'agent_route') {
      if (!VERIFIED_FUNCTIONS.has('omni-agent-router')) {
        throw new Error('Agent router function not available');
      }

      return await this.callEdgeFunction('omni-agent-router', {
        message: args.message || args.text,
        user_id: context.userId,
        domain: context.domain
      });
    }

    // Quality gate - local implementation
    if (toolName === 'quality_gate') {
      return this.executeLocalQualityGate(args.response || args.text || '');
    }

    // Tool not mapped to verified function
    return null;
  }

  /**
   * CALL EDGE FUNCTION - Make actual Supabase function call
   */
  private async callEdgeFunction(functionName: string, args: Record<string, any>): Promise<any> {
    const { data, error } = await sb.functions.invoke(functionName, {
      body: args
    });

    if (error) {
      throw new Error(`Function ${functionName} failed: ${error.message}`);
    }

    return data;
  }

  /**
   * LOCAL QUALITY GATE - Implement locally without function call
   */
  private executeLocalQualityGate(response: string): any {
    let score = 0.5; // Base score
    
    // Quality checks
    if (response.length > 10 && response.length < 500) score += 0.2;
    if (response.includes('?') || response.includes('help')) score += 0.1;
    if (response.split('.').length > 1) score += 0.1;
    if (response.toLowerCase().includes('muraho') || response.includes('!')) score += 0.1;
    if (!/(.)\1{3,}/.test(response)) score += 0.1;

    const approved = score >= 0.6;
    
    let enhanced = response;
    if (!approved && response.length > 0) {
      enhanced = `${response}\n\nIs there anything else I can help you with?`;
      score += 0.1;
    }

    return {
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
    };
  }

  /**
   * CHECK FUNCTION AVAILABILITY - Verify if function exists
   */
  async checkFunctionAvailability(functionName: string): Promise<boolean> {
    if (!VERIFIED_FUNCTIONS.has(functionName)) {
      return false;
    }

    try {
      // Try a test call (this will fail but tells us if function exists)
      await sb.functions.invoke(functionName, { body: { test: true } });
      return true;
    } catch (error) {
      // If we get a 404, function doesn't exist
      // Other errors mean function exists but failed
      console.warn(`Function ${functionName} availability check:`, error);
      return !error.message?.includes('404');
    }
  }

  /**
   * GET VERIFIED FUNCTIONS - List confirmed functions
   */
  getVerifiedFunctions(): string[] {
    return Array.from(VERIFIED_FUNCTIONS);
  }

  /**
   * GET TOOL MAPPING - Show which tools map to which functions
   */
  getToolMapping(): Record<string, string> {
    return {
      'qr_render': 'enhanced-qr-generator',
      'payment_qr_generate': 'enhanced-qr-generator',
      'order_create': 'create-unified-order',
      'list_item': 'listing-publish',
      'property_listing_create': 'listing-publish',
      'search_items': 'listing-search',
      'listing_search': 'listing-search',
      'handoff_create': 'human-handoff',
      'menu_fetch': 'catalog-search',
      'product_search': 'catalog-search',
      'schedule_task': 'schedule-task',
      'intent_analyze': 'omni-agent-router',
      'agent_route': 'omni-agent-router',
      'quality_gate': 'local_implementation'
    };
  }
}

// Export singleton instance
export const verifiedToolRouter = new VerifiedToolRouter();
