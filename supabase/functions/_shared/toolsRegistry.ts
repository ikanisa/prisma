/**
 * Tools Registry for OpenAI Agent SDK
 * Phase 3: Register Functions with Assistant
 */

interface ToolFunction {
  name: string;
  description: string;
  parameters: {
    type: string;
    properties: Record<string, any>;
    required: string[];
  };
}

/**
 * Registry of all available tools for agents
 */
export const TOOLS_REGISTRY: ToolFunction[] = [
  {
    name: "payment_qr_generate",
    description: "Generate MoMo QR and USSD fallback for payments",
    parameters: {
      type: "object",
      properties: {
        amount: { type: "integer", description: "Payment amount in RWF" },
        momo_number: { type: "string", description: "Mobile money number" },
        label: { type: "string", description: "Payment description" }
      },
      required: ["amount"]
    }
  },
  {
    name: "driver_trip_create",
    description: "Create driver trip for ride requests",
    parameters: {
      type: "object",
      properties: {
        pickup: { type: "string", description: "Pickup location" },
        dropoff: { type: "string", description: "Dropoff location" },
        time: { type: "string", description: "Pickup time" }
      },
      required: ["pickup", "dropoff"]
    }
  },
  {
    name: "business_search",
    description: "Search for businesses and services nearby",
    parameters: {
      type: "object",
      properties: {
        query: { type: "string", description: "Search query" },
        location: { type: "string", description: "Location to search near" },
        category: { type: "string", description: "Business category" }
      },
      required: ["query"]
    }
  },
  {
    name: "property_listing_create",
    description: "Create property listing for rent/sale",
    parameters: {
      type: "object",
      properties: {
        title: { type: "string", description: "Property title" },
        description: { type: "string", description: "Property description" },
        price: { type: "integer", description: "Price in RWF" },
        location: { type: "string", description: "Property location" },
        type: { type: "string", description: "rent or sale" }
      },
      required: ["title", "price", "location", "type"]
    }
  },
  {
    name: "support_ticket_create",
    description: "Create support ticket for customer issues",
    parameters: {
      type: "object",
      properties: {
        issue: { type: "string", description: "Issue description" },
        priority: { type: "string", description: "low, medium, high" },
        category: { type: "string", description: "Issue category" }
      },
      required: ["issue"]
    }
  },
  {
    name: "quality_gate",
    description: "Score and enhance outgoing response text for quality assurance",
    parameters: {
      type: "object",
      properties: {
        response: { type: "string", description: "Response text to evaluate" }
      },
      required: ["response"]
    }
  }
];

/**
 * Get tools for specific agent or domain
 */
export function getToolsForAgent(agentCode: string): ToolFunction[] {
  // Map agent codes to relevant tools
  const agentToolMap: Record<string, string[]> = {
    'omni-agent': [
      'payment_qr_generate', 
      'driver_trip_create', 
      'business_search', 
      'property_listing_create',
      'support_ticket_create',
      'quality_gate'
    ],
    'payment-agent': ['payment_qr_generate', 'quality_gate'],
    'mobility-agent': ['driver_trip_create', 'quality_gate'],
    'listing-agent': ['property_listing_create', 'business_search', 'quality_gate'],
    'support-agent': ['support_ticket_create', 'quality_gate']
  };

  const toolNames = agentToolMap[agentCode] || ['quality_gate'];
  return TOOLS_REGISTRY.filter(tool => toolNames.includes(tool.name));
}

/**
 * Execute tool function by routing to appropriate Edge Function
 */
export async function executeToolFunction(
  toolName: string, 
  args: Record<string, any>,
  supabaseUrl: string,
  serviceKey: string
): Promise<any> {
  console.log(`🔧 Executing tool: ${toolName}`, args);

  try {
    switch (toolName) {
      case 'payment_qr_generate':
        return await executeTool('qr-payment-generator', args, supabaseUrl, serviceKey);
      
      case 'driver_trip_create':
        return await executeTool('create-request', args, supabaseUrl, serviceKey);
      
      case 'business_search':
        return await executeTool('compare-business', args, supabaseUrl, serviceKey);
      
      case 'property_listing_create':
        return await executeTool('property-scrape-trigger', args, supabaseUrl, serviceKey);
      
      case 'support_ticket_create':
        return await executeTool('test-runner', args, supabaseUrl, serviceKey);
      
      case 'quality_gate':
        return executeQualityGate(args.response);
      
      default:
        throw new Error(`Unknown tool: ${toolName}`);
    }
  } catch (error) {
    console.error(`❌ Tool execution error for ${toolName}:`, error);
    return { error: `Failed to execute ${toolName}: ${error.message}` };
  }
}

/**
 * Execute tool by calling Supabase Edge Function
 */
async function executeTool(
  functionName: string,
  args: Record<string, any>,
  supabaseUrl: string,
  serviceKey: string
): Promise<any> {
  try {
    const response = await fetch(`${supabaseUrl}/functions/v1/${functionName}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${serviceKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(args)
    });

    if (!response.ok) {
      throw new Error(`Function ${functionName} failed: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error(`Error calling function ${functionName}:`, error);
    throw error;
  }
}

/**
 * Quality gate implementation
 */
function executeQualityGate(response: string): { approved: boolean; score: number; enhanced_response: string } {
  let score = 0.5; // Base score
  
  // Quality checks
  if (response.length > 10 && response.length < 1000) score += 0.2;
  if (response.includes('?') || response.includes('help')) score += 0.1;
  if (!/(.)\1{3,}/.test(response)) score += 0.1; // No excessive repetition
  if (response.split('.').length > 1) score += 0.1; // Has proper sentences
  
  // Enhanced response with quality improvements
  let enhanced = response;
  
  // Add helpful closing if missing
  if (!response.includes('?') && !response.includes('help') && score < 0.7) {
    enhanced += '\n\nIs there anything else I can help you with?';
    score += 0.1;
  }
  
  return {
    approved: score >= 0.6,
    score: Math.min(score, 1.0),
    enhanced_response: enhanced
  };
}