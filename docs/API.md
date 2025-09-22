# EasyMO Admin Panel - API Documentation

## Edge Functions

All edge functions follow a standard contract for consistency and reliability.

### Standard Request/Response Format

#### Request
```typescript
interface EdgeFunctionRequest {
  action: string;           // Required: Action to perform
  payload?: any;           // Optional: Action-specific data
}
```

#### Response
```typescript
interface EdgeFunctionResponse {
  success: boolean;        // Indicates if operation succeeded
  data?: any;             // Response data (on success)
  error?: string;         // Error message (on failure)
}
```

### Available Edge Functions

#### 1. AI Processor (`/functions/v1/ai-processor`)

Handles AI-related operations including chat processing and quality evaluation.

**Actions:**
- `processMessage` - Process WhatsApp messages
- `evaluateQuality` - Evaluate conversation quality
- `generateResponse` - Generate AI responses

```typescript
// Process WhatsApp message
POST /functions/v1/ai-processor
{
  "action": "processMessage",
  "payload": {
    "phone_number": "+250788123456",
    "message": "Hello, I need help",
    "channel": "whatsapp"
  }
}

// Response
{
  "success": true,
  "data": {
    "response": "Hello! How can I help you today?",
    "confidence": 0.95,
    "agent_used": "SupportAgent"
  }
}
```

#### 2. YAML Agent Processor (`/functions/v1/yaml-agent-processor`)

Processes YAML agent definitions for deployment.

**Actions:**
- `uploadYaml` - Upload and process YAML agent definition
- `validateYaml` - Validate YAML syntax and structure
- `deployAgent` - Deploy agent from YAML

```typescript
// Upload YAML definition
POST /functions/v1/yaml-agent-processor
{
  "action": "uploadYaml",
  "fileName": "support-agent.yaml",
  "content": "agent:\n  name: SupportAgent\n  ..."
}

// Response
{
  "success": true,
  "data": {
    "agent_id": "uuid",
    "deployed": true,
    "validation_results": []
  }
}
```

#### 3. Document Vectorizer (`/functions/v1/vectorize-docs`)

Handles document embedding and vectorization for AI knowledge base.

**Actions:**
- `vectorizeDocument` - Create embeddings for document
- `searchSimilar` - Find similar documents
- `updateEmbeddings` - Refresh document embeddings

```typescript
// Vectorize document
POST /functions/v1/vectorize-docs
{
  "document_id": "uuid",
  "force_refresh": false
}

// Response
{
  "success": true,
  "data": {
    "embedding_id": "uuid",
    "chunks_processed": 15,
    "total_tokens": 2048
  }
}
```

#### 4. Marketing Automation (`/functions/v1/marketing-automation`)

Manages marketing campaigns and drip sequences.

**Actions:**
- `createCampaign` - Create new marketing campaign
- `enrollInDrip` - Enroll contact in drip sequence
- `sendMessage` - Send marketing message

```typescript
// Create campaign
POST /functions/v1/marketing-automation
{
  "action": "createCampaign",
  "payload": {
    "name": "Product Launch",
    "segment_sql": "SELECT phone FROM contacts WHERE category = 'prospect'",
    "message_template": "Check out our new product!"
  }
}

// Response
{
  "success": true,
  "data": {
    "campaign_id": "uuid",
    "estimated_reach": 1500,
    "scheduled_for": "2024-01-15T10:00:00Z"
  }
}
```

#### 5. Driver Assignment (`/functions/v1/assign-driver`)

Handles driver assignment for ride bookings.

**Actions:**
- `assignDriver` - Assign driver to booking
- `findNearby` - Find nearby available drivers
- `updateLocation` - Update driver location

```typescript
// Assign driver
POST /functions/v1/assign-driver
{
  "action": "assignDriver",
  "payload": {
    "booking_id": "uuid",
    "pickup_location": {
      "lat": -1.9403,
      "lng": 30.0619
    }
  }
}

// Response
{
  "success": true,
  "data": {
    "driver_id": "uuid",
    "estimated_arrival": "2024-01-15T10:15:00Z",
    "distance_km": 2.5
  }
}
```

#### 6. Quality Evaluator (`/functions/v1/quality-evaluator`)

Evaluates conversation quality and performance metrics.

**Actions:**
- `evaluateConversation` - Evaluate conversation quality
- `calculateMetrics` - Calculate performance metrics
- `generateReport` - Generate quality report

```typescript
// Evaluate conversation
POST /functions/v1/quality-evaluator
{
  "action": "evaluateConversation",
  "payload": {
    "conversation_id": "uuid",
    "messages": [...],
    "context": "customer_support"
  }
}

// Response
{
  "success": true,
  "data": {
    "overall_score": 8.5,
    "clarity_score": 9.0,
    "helpfulness_score": 8.0,
    "style_score": 8.5,
    "recommendations": ["Improve response time"]
  }
}
```

## Database API (Supabase)

### Authentication

All database operations require authentication via JWT token:

```typescript
const { data, error } = await supabase
  .from('table_name')
  .select('*');
```

### Row Level Security (RLS)

All tables implement RLS with admin and user-specific access:

```sql
-- Admin access to all records
CREATE POLICY "admin_access" ON table_name FOR ALL 
USING (is_admin());

-- User access to own records only
CREATE POLICY "user_access" ON table_name FOR ALL 
USING (auth.uid() = user_id);
```

### Common Query Patterns

#### Pagination
```typescript
const { data, error } = await supabase
  .from('table_name')
  .select('*')
  .range(0, 49)  // First 50 records
  .order('created_at', { ascending: false });
```

#### Filtering
```typescript
const { data, error } = await supabase
  .from('conversations')
  .select('*')
  .eq('status', 'active')
  .gte('created_at', startDate)
  .lte('created_at', endDate);
```

#### Joins
```typescript
const { data, error } = await supabase
  .from('orders')
  .select(`
    *,
    products (
      name,
      price
    ),
    deliveries (
      status,
      eta
    )
  `);
```

### Real-time Subscriptions

```typescript
const channel = supabase
  .channel('agent_logs')
  .on(
    'postgres_changes',
    {
      event: 'INSERT',
      schema: 'public',
      table: 'agent_logs'
    },
    (payload) => {
      console.log('New log:', payload.new);
    }
  )
  .subscribe();
```

## Error Handling

### Edge Function Errors

```typescript
{
  "success": false,
  "error": "Validation failed: phone_number is required"
}
```

### Database Errors

```typescript
{
  "error": {
    "message": "Permission denied",
    "code": "42501",
    "hint": "RLS policy violation"
  }
}
```

### Client-side Error Handling

```typescript
try {
  const { data, error } = await supabase.functions.invoke('function-name', {
    body: { action: 'test' }
  });
  
  if (error) throw error;
  
  if (!data.success) {
    throw new Error(data.error);
  }
  
  return data.data;
} catch (error) {
  console.error('API Error:', error);
  toast({
    title: "Error",
    description: error.message,
    variant: "destructive"
  });
}
```

## Rate Limits

- Edge Functions: 100 requests/minute per IP
- Database: 1000 queries/minute per user
- WhatsApp API: Varies by Meta limits

## Authentication & Authorization

### JWT Token Structure
```json
{
  "sub": "user-uuid",
  "email": "user@example.com",
  "role": "admin",
  "exp": 1640995200
}
```

### Admin Check Function
```sql
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM profiles 
    WHERE user_id = auth.uid() 
    AND role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

## Testing API Endpoints

### Edge Functions
```bash
# Test with curl
curl -X POST \
  https://[project-id].supabase.co/functions/v1/function-name \
  -H "Authorization: Bearer [jwt-token]" \
  -H "Content-Type: application/json" \
  -d '{"action": "test", "payload": {}}'
```

### Database Queries
```typescript
// Test with Supabase client
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://[project-id].supabase.co',
  '[anon-key]'
);

const { data, error } = await supabase
  .from('test_table')
  .select('*');
```

## Monitoring & Logging

### Edge Function Logs
Access via Supabase Dashboard → Functions → [Function Name] → Logs

### Database Logs
```sql
-- Query execution logs
SELECT * FROM postgres_logs 
WHERE timestamp > now() - interval '1 hour'
ORDER BY timestamp DESC;
```

### Performance Metrics
```typescript
// Log execution time
const startTime = Date.now();
const result = await apiCall();
const executionTime = Date.now() - startTime;

await supabase.from('agent_execution_log').insert({
  function_name: 'api-call',
  execution_time_ms: executionTime,
  success_status: true
});
```