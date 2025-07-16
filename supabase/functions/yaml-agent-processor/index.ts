import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.51.0';
import * as yaml from "https://deno.land/std@0.200.0/yaml/mod.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
);

interface YAMLAgent {
  name: string;
  model: string;
  language?: string;
  tone?: string;
  system: string;
  memory?: {
    vector_store?: string;
    namespace_per_user?: boolean;
    tables?: string[];
  };
  tools?: Array<{
    type: string;
    name: string;
    description?: string;
    url?: string;
    input?: any;
  }>;
  triggers?: Array<{
    message_regex?: string;
    keyword?: string;
    sentiment_below?: number;
    parse?: string;
    call?: string;
    with?: any;
    respond?: string;
    steps?: any[];
    sequence?: any[];
  }>;
  workflow?: Array<{
    on_first_message?: any;
    on_user_reply?: any;
    on_payload?: any;
    trigger_regex?: string;
    steps?: any[];
    cron_run?: any;
  }>;
  ui_output?: {
    type: string;
    template: string;
    on_card_click?: any;
  };
  fallback?: string;
  global_rules?: string[];
  inherits?: string;
  run_mode?: string;
  schedule?: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { action, agentName, message, userId, whatsappNumber } = await req.json();

    switch (action) {
      case 'loadAgents':
        return await loadAgents();
      case 'processMessage':
        return await processMessage(agentName, message, userId, whatsappNumber);
      case 'routeMessage':
        return await routeMessage(message, userId, whatsappNumber);
      default:
        throw new Error('Invalid action');
    }
  } catch (error) {
    console.error('YAML Agent error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});

async function loadAgents() {
  const agentConfigs: Record<string, YAMLAgent> = {};
  
  const agentFiles = [
    'onboarding.yaml',
    'payment.yaml', 
    'listing.yaml',
    'marketplace.yaml',
    'logistics.yaml',
    'business.yaml',
    'events.yaml',
    'marketing.yaml',
    'support.yaml'
  ];

  for (const fileName of agentFiles) {
    try {
      const yamlContent = await Deno.readTextFile(`../agents/${fileName}`);
      const agent = yaml.parse(yamlContent) as YAMLAgent;
      agentConfigs[agent.name] = agent;
    } catch (error) {
      console.error(`Error loading ${fileName}:`, error);
    }
  }

  return new Response(
    JSON.stringify({ agents: agentConfigs }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

async function routeMessage(message: string, userId: string, whatsappNumber: string) {
  const msg = message.toLowerCase().trim();
  
  // Check if this is a first message (new user)
  const { data: user } = await supabase
    .from('users')
    .select('*')
    .eq('id', userId)
    .single();

  if (!user || isFirstMessage(user)) {
    return await processMessage('OnboardingAgent', message, userId, whatsappNumber);
  }

  // Route based on message patterns
  let targetAgent = 'SupportAgent'; // default

  // Payment agent - numeric amount
  if (/^\d+(\.\d+)?$/.test(msg)) {
    targetAgent = 'PaymentAgent';
  }
  // Listing agent - add products
  else if (/^add\s/.test(msg)) {
    targetAgent = 'ListingAgent';
  }
  // Logistics agent - driver commands
  else if (/driver\s+(on|off)/.test(msg)) {
    targetAgent = 'LogisticsAgent';
  }
  // Marketplace agent - browsing and buying
  else if (msg === 'browse' || /^(need|buy|want)\s/.test(msg)) {
    targetAgent = 'MarketplaceAgent';
  }
  // Events agent
  else if (msg === 'events' || msg === 'add event') {
    targetAgent = 'EventsAgent';
  }
  // Help requests
  else if (msg === 'help' || msg.includes('help')) {
    targetAgent = 'SupportAgent';
  }

  return await processMessage(targetAgent, message, userId, whatsappNumber);
}

async function processMessage(agentName: string, message: string, userId: string, whatsappNumber: string) {
  // Load agent configuration
  const yamlContent = await Deno.readTextFile(`../agents/${agentName.toLowerCase()}.yaml`);
  const agent = yaml.parse(yamlContent) as YAMLAgent;

  // Get user data
  const { data: user } = await supabase
    .from('users')
    .select('*')
    .eq('id', userId)
    .single();

  // Process triggers
  for (const trigger of agent.triggers || []) {
    if (trigger.message_regex && new RegExp(trigger.message_regex).test(message)) {
      return await handleTrigger(trigger, message, user, whatsappNumber, agent);
    }
    if (trigger.keyword && message.toLowerCase().includes(trigger.keyword)) {
      return await handleTrigger(trigger, message, user, whatsappNumber, agent);
    }
  }

  // Process workflow
  for (const workflow of agent.workflow || []) {
    if (workflow.trigger_regex && new RegExp(workflow.trigger_regex).test(message)) {
      return await handleWorkflow(workflow, message, user, whatsappNumber, agent);
    }
  }

  // Fallback response
  const fallbackResponse = agent.fallback || 
    "I didn't understand that. Could you please rephrase or type 'help' for assistance?";
  
  return new Response(
    JSON.stringify({ response: fallbackResponse }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

async function handleTrigger(trigger: any, message: string, user: any, whatsappNumber: string, agent: YAMLAgent) {
  // Simple trigger response handling
  if (trigger.respond) {
    let response = trigger.respond;
    
    // Handle variable substitution
    if (trigger.call === 'generatePayment' && trigger.with) {
      // Call payment generation edge function
      const paymentResponse = await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/generate-payment`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`
        },
        body: JSON.stringify({
          user_id: user.id,
          amount: parseFloat(message)
        })
      });

      if (paymentResponse.ok) {
        const paymentData = await paymentResponse.json();
        response = response
          .replace('{{matched_text}}', message)
          .replace('{{result.ussd}}', paymentData.ussd_code || 'N/A')
          .replace('{{result.ussdLink}}', paymentData.ussd_link || 'N/A')
          .replace('{{result.qr_url}}', paymentData.qr_code_url || 'N/A');
      }
    }

    return new Response(
      JSON.stringify({ response }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  // Handle sequence steps
  if (trigger.sequence) {
    return await handleSequence(trigger.sequence, message, user, whatsappNumber, agent);
  }

  return new Response(
    JSON.stringify({ response: "Trigger processed but no response configured." }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

async function handleWorkflow(workflow: any, message: string, user: any, whatsappNumber: string, agent: YAMLAgent) {
  if (workflow.steps) {
    return await handleSequence(workflow.steps, message, user, whatsappNumber, agent);
  }

  return new Response(
    JSON.stringify({ response: "Workflow processed but no response configured." }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

async function handleSequence(steps: any[], message: string, user: any, whatsappNumber: string, agent: YAMLAgent) {
  let response = "Sequence completed.";
  
  for (const step of steps) {
    if (typeof step === 'string' && step.includes('respond:')) {
      response = step.replace('respond:', '').trim();
    } else if (typeof step === 'object' && step.respond) {
      response = step.respond;
    }
  }

  return new Response(
    JSON.stringify({ response }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

function isFirstMessage(user: any): boolean {
  if (!user.created_at) return true;
  const timeSinceCreation = new Date().getTime() - new Date(user.created_at).getTime();
  return timeSinceCreation < 60000; // Within 1 minute of creation
}