-- OpenAI Agent SDK Integration: Database Schema
-- Creates tables for agent configs, runs, and tool calls

-- Agents registry table
CREATE TABLE IF NOT EXISTS public.agent_configs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text UNIQUE NOT NULL,            -- e.g. 'easymo_main'
  assistant_id text NOT NULL,           -- from OPENAI_ASSISTANT_ID or others
  name text NOT NULL,
  description text,
  system_prompt text,                   -- editable system prompt
  temperature numeric DEFAULT 0.3,
  tools_json jsonb DEFAULT '[]'::jsonb, -- tool schemas
  active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_agent_configs_code ON public.agent_configs (code);

-- Agent runs / execution logs
CREATE TABLE IF NOT EXISTS public.agent_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_code text NOT NULL,
  conversation_id uuid,                 -- link to whatsapp_conversations.id
  wa_message_id text,                   -- inbound message id handled
  openai_run_id text,                   -- if using responses/runs ids
  status text DEFAULT 'started',        -- started|tool_call|completed|failed
  request_payload jsonb,
  response_payload jsonb,
  error_message text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_agent_runs_agent_code ON public.agent_runs (agent_code);
CREATE INDEX IF NOT EXISTS idx_agent_runs_status ON public.agent_runs (status);
CREATE INDEX IF NOT EXISTS idx_agent_runs_created_at ON public.agent_runs (created_at DESC);

-- Tool execution logs
CREATE TABLE IF NOT EXISTS public.agent_tool_calls (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id uuid REFERENCES public.agent_runs(id) ON DELETE CASCADE,
  tool_name text NOT NULL,
  tool_args jsonb,
  tool_result jsonb,
  execution_time_ms integer,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_agent_tool_calls_run_id ON public.agent_tool_calls (run_id);

-- Enable RLS on all agent tables
ALTER TABLE public.agent_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agent_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agent_tool_calls ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Admin can manage, system can execute
CREATE POLICY "Admin can manage agent configs"
ON public.agent_configs
FOR ALL
USING (is_admin())
WITH CHECK (is_admin());

CREATE POLICY "System can read agent configs"
ON public.agent_configs
FOR SELECT
USING (true);

CREATE POLICY "Admin can view agent runs"
ON public.agent_runs
FOR SELECT
USING (is_admin());

CREATE POLICY "System can manage agent runs"
ON public.agent_runs
FOR ALL
USING (true)
WITH CHECK (true);

CREATE POLICY "Admin can view tool calls"
ON public.agent_tool_calls
FOR SELECT
USING (is_admin());

CREATE POLICY "System can manage tool calls"
ON public.agent_tool_calls
FOR ALL
USING (true)
WITH CHECK (true);

-- Insert default easyMO agent configuration
INSERT INTO public.agent_configs (
  code,
  assistant_id,
  name,
  description,
  system_prompt,
  temperature,
  tools_json
) VALUES (
  'easymo_main',
  'default_assistant_id',  -- Will be updated with actual OPENAI_ASSISTANT_ID
  'easyMO Main Agent',
  'Primary WhatsApp agent for payments, produce, and general assistance',
  'You are easyMO, a helpful AI assistant for Rwanda and Malta. You help users with payments (MoMo USSD), produce orders, ride bookings, and general inquiries. Always be polite, helpful, and provide clear instructions in the user''s preferred language (English, Kinyarwanda, or French).',
  0.3,
  '[
    {
      "name": "generateMomoUssd",
      "description": "Create a USSD string for MoMo payment in Rwanda",
      "parameters": {
        "type": "object",
        "properties": {
          "amount": { "type": "number", "description": "Payment amount in RWF" },
          "receiver": { "type": "string", "description": "Recipient phone number or code" },
          "purpose": { "type": "string", "description": "Payment purpose or description" }
        },
        "required": ["amount", "receiver"]
      }
    },
    {
      "name": "savePaymentIntent",
      "description": "Save payment intent to database for tracking",
      "parameters": {
        "type": "object",
        "properties": {
          "user_phone": { "type": "string", "description": "User WhatsApp number" },
          "amount": { "type": "number", "description": "Payment amount" },
          "purpose": { "type": "string", "description": "Payment purpose" },
          "recipient": { "type": "string", "description": "Payment recipient" }
        },
        "required": ["user_phone", "amount", "purpose"]
      }
    },
    {
      "name": "searchProducts",
      "description": "Search for products in the marketplace",
      "parameters": {
        "type": "object",
        "properties": {
          "query": { "type": "string", "description": "Search term for products" },
          "category": { "type": "string", "description": "Product category filter" },
          "location": { "type": "string", "description": "Location for local products" }
        },
        "required": ["query"]
      }
    },
    {
      "name": "createRideRequest",
      "description": "Create a ride booking request",
      "parameters": {
        "type": "object",
        "properties": {
          "pickup": { "type": "string", "description": "Pickup location" },
          "destination": { "type": "string", "description": "Destination location" },
          "passenger_phone": { "type": "string", "description": "Passenger WhatsApp number" }
        },
        "required": ["pickup", "destination", "passenger_phone"]
      }
    }
  ]'::jsonb
)
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  system_prompt = EXCLUDED.system_prompt,
  tools_json = EXCLUDED.tools_json,
  updated_at = now();

-- Function to update agent assistant_id from environment
CREATE OR REPLACE FUNCTION public.update_agent_assistant_id()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- This will be called by edge function to set the actual OPENAI_ASSISTANT_ID
  UPDATE public.agent_configs 
  SET assistant_id = 'env_placeholder'
  WHERE code = 'easymo_main' AND assistant_id = 'default_assistant_id';
END;
$$;