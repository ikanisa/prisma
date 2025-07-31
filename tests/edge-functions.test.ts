import { assertEquals, assertExists } from 'https://deno.land/std/testing/asserts.ts';

// Test configuration
const SUPABASE_URL = 'http://localhost:54321';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlqYmxpcnBoa3Jyc254YXpvaHd0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI2NDAzMzAsImV4cCI6MjA2ODIxNjMzMH0.gH-rvhmX1RvQSlgwbjqq15bHBgKmlDRkAGyfzFyEeKs';

const headers = {
  'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
  'Content-Type': 'application/json',
};

// Helper function to make function requests
async function callFunction(functionName: string, payload: any) {
  const response = await fetch(`${SUPABASE_URL}/functions/v1/${functionName}`, {
    method: 'POST',
    headers,
    body: JSON.stringify(payload),
  });

  const data = await response.json();
  return { response, data };
}

Deno.test('AI Processor - Process Message', async () => {
  const { response, data } = await callFunction('ai-processor', {
    action: 'processMessage',
    payload: {
      phone_number: '+250788123456',
      message: 'Hello, I need help with my order',
      channel: 'whatsapp'
    }
  });

  assertEquals(response.status, 200);
  assertEquals(data.success, true);
  assertExists(data.data);
  assertExists(data.data.response);
});

Deno.test('AI Processor - Invalid Action', async () => {
  const { response, data } = await callFunction('ai-processor', {
    action: 'invalidAction',
    payload: {}
  });

  assertEquals(response.status, 400);
  assertEquals(data.success, false);
  assertExists(data.error);
});

Deno.test('AI Processor - Missing Phone Number', async () => {
  const { response, data } = await callFunction('ai-processor', {
    action: 'processMessage',
    payload: {
      message: 'Hello',
      channel: 'whatsapp'
    }
  });

  assertEquals(response.status, 400);
  assertEquals(data.success, false);
  assertExists(data.error);
});

Deno.test('YAML Agent Processor - Upload Valid YAML', async () => {
  const yamlContent = `
agent:
  name: TestAgent
  description: Test agent for unit testing
  model: gpt-4o-mini
  instructions: You are a helpful test assistant
  tools:
    - name: test_tool
      description: A test tool
`;

  const { response, data } = await callFunction('yaml-agent-processor', {
    action: 'uploadYaml',
    fileName: 'test-agent.yaml',
    content: yamlContent
  });

  assertEquals(response.status, 200);
  assertEquals(data.success, true);
  assertExists(data.data);
});

Deno.test('YAML Agent Processor - Invalid YAML', async () => {
  const invalidYaml = `
agent:
  name: TestAgent
    invalid_indent: true
  description: Invalid YAML
`;

  const { response, data } = await callFunction('yaml-agent-processor', {
    action: 'uploadYaml',
    fileName: 'invalid.yaml',
    content: invalidYaml
  });

  assertEquals(response.status, 400);
  assertEquals(data.success, false);
  assertExists(data.error);
});

Deno.test('Document Vectorizer - Vectorize Document', async () => {
  const { response, data } = await callFunction('vectorize-docs', {
    document_id: 'test-document-id',
    force_refresh: true
  });

  // This might return 404 if document doesn't exist, which is expected
  if (response.status === 200) {
    assertEquals(data.success, true);
    assertExists(data.data);
  } else {
    assertEquals(response.status, 404);
    assertEquals(data.success, false);
  }
});

Deno.test('Marketing Automation - Create Campaign', async () => {
  const { response, data } = await callFunction('marketing-automation', {
    action: 'createCampaign',
    payload: {
      name: 'Test Campaign',
      segment_sql: 'SELECT phone FROM contacts WHERE category = \\'test\\'',
      message_template: 'Hello, this is a test message!',
      scheduled_for: new Date(Date.now() + 86400000).toISOString() // Tomorrow
    }
  });

  assertEquals(response.status, 200);
  assertEquals(data.success, true);
  assertExists(data.data);
  assertExists(data.data.campaign_id);
});

Deno.test('Marketing Automation - Invalid Segment SQL', async () => {
  const { response, data } = await callFunction('marketing-automation', {
    action: 'createCampaign',
    payload: {
      name: 'Test Campaign',
      segment_sql: 'INVALID SQL STATEMENT',
      message_template: 'Hello!',
      scheduled_for: new Date().toISOString()
    }
  });

  assertEquals(response.status, 400);
  assertEquals(data.success, false);
  assertExists(data.error);
});

Deno.test('Driver Assignment - Find Nearby Drivers', async () => {
  const { response, data } = await callFunction('assign-driver', {
    action: 'findNearby',
    payload: {
      pickup_location: {
        lat: -1.9403,
        lng: 30.0619
      },
      radius_km: 5
    }
  });

  assertEquals(response.status, 200);
  assertEquals(data.success, true);
  assertExists(data.data);
  // Data might be empty if no drivers are online
});

Deno.test('Driver Assignment - Invalid Coordinates', async () => {
  const { response, data } = await callFunction('assign-driver', {
    action: 'findNearby',
    payload: {
      pickup_location: {
        lat: 'invalid',
        lng: 'invalid'
      }
    }
  });

  assertEquals(response.status, 400);
  assertEquals(data.success, false);
  assertExists(data.error);
});

Deno.test('Quality Evaluator - Evaluate Conversation', async () => {
  const { response, data } = await callFunction('quality-evaluator', {
    action: 'evaluateConversation',
    payload: {
      conversation_id: 'test-conversation-id',
      messages: [
        { role: 'user', content: 'Hello, I need help' },
        { role: 'assistant', content: 'Hello! How can I help you today?' },
        { role: 'user', content: 'I have a question about my order' },
        { role: 'assistant', content: 'I\'d be happy to help with your order. Can you provide your order number?' }
      ],
      context: 'customer_support'
    }
  });

  assertEquals(response.status, 200);
  assertEquals(data.success, true);
  assertExists(data.data);
  assertExists(data.data.overall_score);
  assertExists(data.data.clarity_score);
  assertExists(data.data.helpfulness_score);
});

Deno.test('Quality Evaluator - Empty Messages', async () => {
  const { response, data } = await callFunction('quality-evaluator', {
    action: 'evaluateConversation',
    payload: {
      conversation_id: 'test-conversation-id',
      messages: [],
      context: 'customer_support'
    }
  });

  assertEquals(response.status, 400);
  assertEquals(data.success, false);
  assertExists(data.error);
});

Deno.test('CORS Headers - OPTIONS Request', async () => {
  const response = await fetch(`${SUPABASE_URL}/functions/v1/ai-processor`, {
    method: 'OPTIONS',
    headers: {
      'Origin': 'http://localhost:3000',
      'Access-Control-Request-Method': 'POST',
      'Access-Control-Request-Headers': 'authorization, content-type',
    },
  });

  assertEquals(response.status, 200);
  assertEquals(response.headers.get('Access-Control-Allow-Origin'), '*');
  assertEquals(
    response.headers.get('Access-Control-Allow-Headers'),
    'authorization, x-client-info, apikey, content-type'
  );
});

Deno.test('Function Security - Unauthenticated Request', async () => {
  const response = await fetch(`${SUPABASE_URL}/functions/v1/ai-processor`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      // No Authorization header
    },
    body: JSON.stringify({
      action: 'processMessage',
      payload: { phone_number: '+250788123456', message: 'Hello' }
    }),
  });

  // Should return 401 for functions that require authentication
  assertEquals(response.status, 401);
});

Deno.test('Function Performance - Response Time', async () => {
  const startTime = Date.now();
  
  const { response } = await callFunction('ai-processor', {
    action: 'processMessage',
    payload: {
      phone_number: '+250788123456',
      message: 'Quick test message',
      channel: 'whatsapp'
    }
  });
  
  const endTime = Date.now();
  const responseTime = endTime - startTime;
  
  assertEquals(response.status, 200);
  
  // Function should respond within 30 seconds
  if (responseTime > 30000) {
    console.warn(`Function took ${responseTime}ms to respond, which is longer than expected`);
  }
});

Deno.test('Input Validation - SQL Injection Attempt', async () => {
  const { response, data } = await callFunction('marketing-automation', {
    action: 'createCampaign',
    payload: {
      name: 'Test Campaign',
      segment_sql: 'SELECT * FROM contacts; DROP TABLE contacts; --',
      message_template: 'Hello!',
      scheduled_for: new Date().toISOString()
    }
  });

  // Should reject malicious SQL
  assertEquals(response.status, 400);
  assertEquals(data.success, false);
  assertExists(data.error);
});

Deno.test('Input Validation - XSS Attempt', async () => {
  const { response, data } = await callFunction('ai-processor', {
    action: 'processMessage',
    payload: {
      phone_number: '+250788123456',
      message: '<script>alert("xss")</script>',
      channel: 'whatsapp'
    }
  });

  assertEquals(response.status, 200);
  assertEquals(data.success, true);
  
  // Response should not contain unescaped script tags
  if (data.data && data.data.response) {
    assertEquals(data.data.response.includes('<script>'), false);
  }
});