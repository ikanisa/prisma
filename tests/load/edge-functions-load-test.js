// k6 Load Test Script for easyMO Edge Functions Performance
import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate } from 'k6/metrics';

const errorRate = new Rate('errors');

export const options = {
  scenarios: {
    // Test security audit function
    security_audit: {
      executor: 'constant-vus',
      vus: 5,
      duration: '2m',
      tags: { endpoint: 'security_audit' },
    },
    // Test secure WhatsApp message function
    secure_whatsapp: {
      executor: 'ramping-vus',
      startTime: '30s',
      stages: [
        { duration: '1m', target: 10 },
        { duration: '2m', target: 10 },
        { duration: '1m', target: 0 },
      ],
      tags: { endpoint: 'secure_whatsapp' },
    },
    // Test agent router under load
    agent_router: {
      executor: 'constant-rate',
      rate: 50, // 50 requests per second
      timeUnit: '1s',
      duration: '3m',
      preAllocatedVUs: 20,
      maxVUs: 50,
      tags: { endpoint: 'agent_router' },
    },
    // Stress test webhook endpoint
    webhook_stress: {
      executor: 'ramping-vus',
      startTime: '2m',
      stages: [
        { duration: '1m', target: 30 },
        { duration: '2m', target: 30 },
        { duration: '1m', target: 60 },
        { duration: '1m', target: 60 },
        { duration: '1m', target: 0 },
      ],
      tags: { endpoint: 'webhook' },
    },
  },
  thresholds: {
    http_req_duration: ['p(95)<3000'], // 95% under 3s
    http_req_failed: ['rate<0.1'],     // Error rate under 10%
    'http_req_duration{endpoint:security_audit}': ['p(95)<5000'],
    'http_req_duration{endpoint:secure_whatsapp}': ['p(95)<2000'],
    'http_req_duration{endpoint:agent_router}': ['p(95)<2500'],
    'http_req_duration{endpoint:webhook}': ['p(95)<1000'],
  },
};

const BASE_URL = 'https://ijblirphkrrsnxazohwt.supabase.co/functions/v1';

export default function() {
  const scenario = __ENV.K6_SCENARIO_NAME;
  
  switch (scenario) {
    case 'security_audit':
      testSecurityAudit();
      break;
    case 'secure_whatsapp':
      testSecureWhatsApp();
      break;
    case 'agent_router':
      testAgentRouter();
      break;
    case 'webhook_stress':
      testWebhookEndpoint();
      break;
    default:
      testRandomEndpoint();
  }
  
  sleep(Math.random() * 2 + 0.5); // Random sleep 0.5-2.5s
}

function testSecurityAudit() {
  const response = http.get(`${BASE_URL}/security-audit`, {
    headers: {
      'Authorization': 'Bearer test-token',
      'Content-Type': 'application/json',
    },
    timeout: '10s',
  });
  
  const success = check(response, {
    'Security audit status 200 or 429': (r) => r.status === 200 || r.status === 429,
    'Security audit response time < 5000ms': (r) => r.timings.duration < 5000,
    'Security audit has valid JSON': (r) => {
      try {
        const data = JSON.parse(r.body);
        return data.timestamp !== undefined;
      } catch(e) {
        return false;
      }
    },
  });
  
  if (!success) {
    errorRate.add(1);
    console.log(`Security audit failed: ${response.status} - ${response.body.substring(0, 100)}`);
  }
}

function testSecureWhatsApp() {
  const payload = {
    to: '+250788123456',
    body: `Load test message ${Math.random().toString(36).substr(2, 9)}`,
  };
  
  const response = http.post(`${BASE_URL}/send_whatsapp_message_secure`, JSON.stringify(payload), {
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer test-token',
    },
    timeout: '15s',
  });
  
  const success = check(response, {
    'Secure WhatsApp status acceptable': (r) => [200, 400, 429, 500].includes(r.status),
    'Secure WhatsApp response time < 2000ms': (r) => r.timings.duration < 2000,
    'Secure WhatsApp has response': (r) => r.body && r.body.length > 0,
  });
  
  if (!success) {
    errorRate.add(1);
  }
}

function testAgentRouter() {
  const payload = {
    wa_message_id: `test_${Math.random().toString(36).substr(2, 9)}`,
  };
  
  const response = http.post(`${BASE_URL}/agent_router`, JSON.stringify(payload), {
    headers: {
      'Content-Type': 'application/json',
    },
    timeout: '30s',
  });
  
  const success = check(response, {
    'Agent router response received': (r) => r.status >= 200 && r.status < 600,
    'Agent router response time < 2500ms': (r) => r.timings.duration < 2500,
    'Agent router valid response': (r) => r.body && r.body.length > 0,
  });
  
  if (!success) {
    errorRate.add(1);
  }
}

function testWebhookEndpoint() {
  // Test webhook verification
  const verifyResponse = http.get(`${BASE_URL}/whatsapp_webhook?hub.mode=subscribe&hub.verify_token=test&hub.challenge=test123`, {
    timeout: '5s',
  });
  
  check(verifyResponse, {
    'Webhook verify response': (r) => r.status === 200 || r.status === 403,
    'Webhook verify time < 1000ms': (r) => r.timings.duration < 1000,
  });
  
  // Test webhook message
  const messagePayload = {
    object: 'whatsapp_business_account',
    entry: [{
      id: '123456789',
      changes: [{
        value: {
          messaging_product: 'whatsapp',
          metadata: {
            display_phone_number: '250788123456',
            phone_number_id: 'test_phone_id'
          },
          messages: [{
            from: '250788' + Math.floor(Math.random() * 900000 + 100000),
            id: 'msg_' + Math.random().toString(36).substr(2, 9),
            timestamp: Math.floor(Date.now() / 1000).toString(),
            text: {
              body: `Load test message ${Date.now()}`
            },
            type: 'text'
          }]
        },
        field: 'messages'
      }]
    }]
  };
  
  const messageResponse = http.post(`${BASE_URL}/whatsapp_webhook`, JSON.stringify(messagePayload), {
    headers: {
      'Content-Type': 'application/json',
      'X-Hub-Signature-256': 'sha256=test_signature',
    },
    timeout: '10s',
  });
  
  const success = check(messageResponse, {
    'Webhook message response': (r) => r.status >= 200 && r.status < 600,
    'Webhook message time < 1000ms': (r) => r.timings.duration < 1000,
  });
  
  if (!success) {
    errorRate.add(1);
  }
}

function testRandomEndpoint() {
  const endpoints = ['security-audit', 'agent_router', 'whatsapp_webhook'];
  const randomEndpoint = endpoints[Math.floor(Math.random() * endpoints.length)];
  
  const response = http.get(`${BASE_URL}/${randomEndpoint}`, {
    timeout: '5s',
  });
  
  check(response, {
    'Random endpoint responds': (r) => r.status >= 200 && r.status < 600,
    'Random endpoint time < 5000ms': (r) => r.timings.duration < 5000,
  });
}

export function setup() {
  console.log('Starting Edge Functions load test...');
  console.log(`Target: ${BASE_URL}`);
  
  // Verify base connectivity
  const response = http.get(`${BASE_URL}/security-audit`);
  if (response.status === 0) {
    throw new Error(`Setup failed: Cannot reach edge functions (${response.status})`);
  }
  
  return { startTime: new Date() };
}

export function teardown(data) {
  console.log('Edge Functions load test completed');
  console.log(`Test duration: ${(new Date() - data.startTime) / 1000}s`);
}