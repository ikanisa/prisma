import { z } from 'zod';

export interface ToolDefinition {
  name: string;
  description: string;
  input_schema: z.ZodSchema;
  call: {
    type: 'edge_function' | 'sql' | 'http';
    endpoint: string;
    headers?: Record<string, string>;
    timeout_ms?: number;
  };
}

export interface ToolResult {
  success: boolean;
  data?: any;
  error?: string;
  execution_time_ms?: number;
}

// Additional schemas for new skills
const PassengerIntentSchema = z.object({
  passenger_id: z.string().uuid(),
  pickup_lat: z.number(),
  pickup_lng: z.number(),
  max_budget: z.number().positive()
});

const BookingCreateSchema = z.object({
  passenger_id: z.string().uuid(),
  trip_id: z.string().uuid(),
  fare_rwf: z.number().positive().optional()
});

const BookingConfirmSchema = z.object({
  booking_id: z.string().uuid(),
  confirmed: z.boolean(),
  driver_id: z.string().uuid().optional()
});

const ListingSearchSchema = z.object({
  type: z.enum(['property', 'vehicle']),
  query: z.string().optional(),
  location: z.string().optional(),
  lat: z.number().optional(),
  lng: z.number().optional(),
  radius_km: z.number().default(10),
  min_price: z.number().optional(),
  max_price: z.number().optional(),
  limit: z.number().default(10)
});

const ListingCreateSchema = z.object({
  type: z.enum(['property', 'vehicle']),
  user_id: z.string().uuid(),
  title: z.string().optional(),
  status: z.enum(['draft', 'active']).default('draft')
});

const ProductSearchSchema = z.object({
  category: z.enum(['pharmacy', 'hardware']),
  query: z.string().optional(),
  location: z.string().optional(),
  limit: z.number().default(10)
});

const MenuFetchSchema = z.object({
  table_code: z.string().optional(),
  bar_name: z.string().optional(),
  business_type: z.string().optional(),
  location: z.string().optional()
});

const OrderStatusSchema = z.object({
  order_id: z.string().uuid(),
  user_id: z.string().uuid()
});

const OrderHistorySchema = z.object({
  user_id: z.string().uuid(),
  limit: z.number().default(5)
});

const GooglePlacesSchema = z.object({
  category: z.string(),
  location: z.string(),
  radius: z.number().default(50000),
  user_id: z.string().uuid()
});

const ContactsImportSchema = z.object({
  source: z.enum(['whatsapp', 'google_contacts', 'phone_contacts', 'csv']),
  user_id: z.string().uuid()
});

const AirbnbScraperSchema = z.object({
  url: z.string().url(),
  user_id: z.string().uuid()
});

const ProductsImportSchema = z.object({
  source: z.string(),
  category: z.string().optional(),
  user_id: z.string().uuid()
});

const HandoffCreateSchema = z.object({
  user_id: z.string(),
  reason: z.string(),
  urgency: z.enum(['normal', 'medium', 'high']).default('normal'),
  context: z.string(),
  source_channel: z.string().default('whatsapp')
});

const HelpContentSchema = z.object({
  topic: z.string(),
  language: z.string().default('en')
});

const FeedbackLogSchema = z.object({
  user_id: z.string(),
  feedback_text: z.string().optional(),
  rating: z.number().int().min(1).max(5).optional(),
  source: z.string(),
  category: z.string().optional()
});

const IssueReportSchema = z.object({
  user_id: z.string(),
  description: z.string(),
  severity: z.enum(['low', 'medium', 'high']).default('medium'),
  source: z.string(),
  context: z.string()
});

const FeatureRequestSchema = z.object({
  user_id: z.string(),
  description: z.string(),
  source: z.string(),
  priority: z.string().default('normal')
});

const GeoSearchSchema = z.object({
  lat: z.number(),
  lng: z.number(),
  radius_km: z.number().default(5),
  type: z.enum(['drivers', 'passengers', 'properties', 'businesses'])
});

const PaymentProcessSchema = z.object({
  transaction_id: z.string(),
  phone: z.string(),
  amount: z.number().positive().optional()
});
const QRGenerateSchema = z.object({
  phone: z.string().min(10),
  amount: z.number().positive(),
  description: z.string().optional()
});

const LocationSearchSchema = z.object({
  lat: z.number(),
  lng: z.number(),
  radius_km: z.number().default(5),
  type: z.enum(['drivers', 'passengers', 'properties', 'businesses'])
});

const TripCreateSchema = z.object({
  driver_id: z.string().uuid(),
  pickup_lat: z.number(),
  pickup_lng: z.number(),
  destination_lat: z.number().optional(),
  destination_lng: z.number().optional(),
  price_estimate: z.number().positive()
});

const OrderCreateSchema = z.object({
  business_type: z.enum(['pharmacy', 'hardware', 'bar']),
  items: z.array(z.object({
    product_id: z.string().uuid(),
    quantity: z.number().positive()
  })),
  delivery_address: z.string().optional()
});

// Tool registry
export const TOOL_REGISTRY: Record<string, ToolDefinition> = {
  // Payment tools
  qr_render: {
    name: 'qr_render',
    description: 'Generate QR code for mobile money payment',
    input_schema: QRGenerateSchema,
    call: {
      type: 'edge_function',
      endpoint: 'enhanced-qr-generator',
      timeout_ms: 10000
    }
  },
  
  momo_tx_check: {
    name: 'momo_tx_check', 
    description: 'Check mobile money transaction status',
    input_schema: z.object({
      transaction_id: z.string(),
      phone: z.string()
    }),
    call: {
      type: 'edge_function',
      endpoint: 'enhanced-payment-processor',
      timeout_ms: 15000
    }
  },
  
  // Transport tools
  driver_trip_create: {
    name: 'driver_trip_create',
    description: 'Create a new trip for drivers',
    input_schema: TripCreateSchema,
    call: {
      type: 'edge_function',
      endpoint: 'driver-trip-create',
      timeout_ms: 5000
    }
  },
  
  passenger_intent_create: {
    name: 'passenger_intent_create',
    description: 'Create passenger ride request',
    input_schema: z.object({
      passenger_id: z.string().uuid(),
      pickup_lat: z.number(),
      pickup_lng: z.number(),
      max_budget: z.number().positive()
    }),
    call: {
      type: 'edge_function',
      endpoint: 'passenger-intent-create', 
      timeout_ms: 5000
    }
  },
  
  geo_search: {
    name: 'geo_search',
    description: 'Search for nearby drivers, passengers, or locations',
    input_schema: LocationSearchSchema,
    call: {
      type: 'edge_function',
      endpoint: 'nearby-trips',
      timeout_ms: 3000
    }
  },
  
  // Listings tools
  list_item: {
    name: 'list_item',
    description: 'Create new property or vehicle listing',
    input_schema: z.object({
      type: z.enum(['property', 'vehicle']),
      title: z.string(),
      description: z.string(),
      price: z.number().positive(),
      location: z.string(),
      metadata: z.record(z.any()).optional()
    }),
    call: {
      type: 'edge_function',
      endpoint: 'listing-publish',
      timeout_ms: 8000
    }
  },
  
  search_items: {
    name: 'search_items',
    description: 'Search properties or vehicles',
    input_schema: z.object({
      type: z.enum(['property', 'vehicle']),
      query: z.string().optional(),
      price_min: z.number().optional(),
      price_max: z.number().optional(),
      location: z.string().optional(),
      limit: z.number().default(10)
    }),
    call: {
      type: 'edge_function',
      endpoint: 'listing-search',
      timeout_ms: 5000
    }
  },
  
  // Commerce tools
  order_create: {
    name: 'order_create',
    description: 'Create order for pharmacy, hardware, or bar',
    input_schema: OrderCreateSchema,
    call: {
      type: 'edge_function',
      endpoint: 'create-unified-order',
      timeout_ms: 10000
    }
  },
  
  menu_fetch: {
    name: 'menu_fetch',
    description: 'Get business menu or product catalog',
    input_schema: z.object({
      business_id: z.string().uuid(),
      category: z.string().optional()
    }),
    call: {
      type: 'edge_function',
      endpoint: 'generate-dynamic-menu',
      timeout_ms: 5000
    }
  },
  
  // Data sync tools
  google_places_importer: {
    name: 'google_places_importer',
    description: 'Import businesses from Google Places',
    input_schema: z.object({
      location: z.string(),
      radius_km: z.number().default(10),
      business_type: z.string()
    }),
    call: {
      type: 'edge_function',
      endpoint: 'google-places-sync',
      timeout_ms: 30000
    }
  },
  
  // Admin support tools
  handoff_create: {
    name: 'handoff_create',
    description: 'Create human handoff request',
    input_schema: z.object({
      user_id: z.string(),
      reason: z.string(),
      priority: z.enum(['low', 'medium', 'high']).default('medium'),
      context: z.record(z.any()).optional()
    }),
    call: {
      type: 'edge_function',
      endpoint: 'human-handoff',
      timeout_ms: 3000
    }
  },
  
  ticket_log: {
    name: 'ticket_log',
    description: 'Log support ticket or feedback',
    input_schema: z.object({
      user_id: z.string(),
      type: z.enum(['bug', 'feature', 'complaint', 'compliment']),
      message: z.string(),
      metadata: z.record(z.any()).optional()
    }),
    call: {
      type: 'sql',
      endpoint: 'log_support_ticket',
      timeout_ms: 2000
    }
  }
};

export class ToolRegistry {
  async executeTool(toolName: string, input: any): Promise<ToolResult> {
    const startTime = performance.now();
    
    const tool = TOOL_REGISTRY[toolName];
    if (!tool) {
      return {
        success: false,
        error: `Tool ${toolName} not found`,
        execution_time_ms: performance.now() - startTime
      };
    }
    
    // Validate input
    try {
      const validInput = tool.input_schema.parse(input);
      
      // Execute tool based on type
      switch (tool.call.type) {
        case 'edge_function':
          return await this.callEdgeFunction(tool, validInput, startTime);
        case 'sql':
          return await this.callSQL(tool, validInput, startTime);
        case 'http':
          return await this.callHTTP(tool, validInput, startTime);
        default:
          throw new Error(`Unsupported tool type: ${tool.call.type}`);
      }
      
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        execution_time_ms: performance.now() - startTime
      };
    }
  }
  
  private async callEdgeFunction(tool: ToolDefinition, input: any, startTime: number): Promise<ToolResult> {
    try {
      const response = await fetch(`/functions/v1/${tool.call.endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...tool.call.headers
        },
        body: JSON.stringify(input)
      });
      
      const data = await response.json();
      
      return {
        success: response.ok,
        data: response.ok ? data : undefined,
        error: response.ok ? undefined : data.error || 'Function call failed',
        execution_time_ms: performance.now() - startTime
      };
      
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Network error',
        execution_time_ms: performance.now() - startTime
      };
    }
  }
  
  private async callSQL(tool: ToolDefinition, input: any, startTime: number): Promise<ToolResult> {
    // SQL calls would go through Supabase client
    // Placeholder implementation
    return {
      success: true,
      data: { message: 'SQL call executed' },
      execution_time_ms: performance.now() - startTime
    };
  }
  
  private async callHTTP(tool: ToolDefinition, input: any, startTime: number): Promise<ToolResult> {
    try {
      const response = await fetch(tool.call.endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...tool.call.headers
        },
        body: JSON.stringify(input)
      });
      
      const data = await response.json();
      
      return {
        success: response.ok,
        data: response.ok ? data : undefined,
        error: response.ok ? undefined : data.error || 'HTTP call failed',
        execution_time_ms: performance.now() - startTime
      };
      
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'HTTP error',
        execution_time_ms: performance.now() - startTime
      };
    }
  }
  
  getToolNames(): string[] {
    return Object.keys(TOOL_REGISTRY);
  }
  
  getToolDefinition(toolName: string): ToolDefinition | undefined {
    return TOOL_REGISTRY[toolName];
  }
  
  addTool(toolName: string, definition: ToolDefinition): void {
    TOOL_REGISTRY[toolName] = definition;
  }
}

export const toolRegistry = new ToolRegistry();