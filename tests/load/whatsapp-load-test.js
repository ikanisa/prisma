// k6 Load Test Script for easyMO WhatsApp Webhook
import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate } from 'k6/metrics';

// Custom metrics
const errorRate = new Rate('errors');

// Test configuration
export const options = {
  scenarios: {
    // Simulate normal WhatsApp traffic
    normal_load: {
      executor: 'constant-vus',
      vus: 10, // 10 concurrent users
      duration: '5m',
      tags: { test_type: 'normal' },
    },
    // Simulate peak traffic bursts
    spike_test: {
      executor: 'ramping-vus',
      startTime: '5m',
      stages: [
        { duration: '30s', target: 50 }, // Ramp up to 50 users
        { duration: '1m', target: 50 },  // Stay at 50 users
        { duration: '30s', target: 0 },  // Ramp down
      ],
      tags: { test_type: 'spike' },
    },
    // Stress test - find breaking point
    stress_test: {
      executor: 'ramping-vus',
      startTime: '7m',
      stages: [
        { duration: '2m', target: 100 },
        { duration: '3m', target: 100 },
        { duration: '2m', target: 200 },
        { duration: '3m', target: 200 },
        { duration: '2m', target: 0 },
      ],
      tags: { test_type: 'stress' },
    },
  },
  thresholds: {
    http_req_duration: ['p(95)<2000'], // 95% of requests under 2s
    http_req_failed: ['rate<0.1'],     // Error rate under 10%
    errors: ['rate<0.05'],             // Custom error rate under 5%
  },
};

// Base URL - update for your environment
const BASE_URL = 'https://ijblirphkrrsnxazohwt.supabase.co/functions/v1';

// Sample WhatsApp webhook payloads
const samplePayloads = [
  // Text message payload
  {
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
              body: getRandomMessage()
            },
            type: 'text'
          }]
        },
        field: 'messages'
      }]
    }]
  },
  // Interactive button response
  {
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
            interactive: {
              type: 'button_reply',
              button_reply: {
                id: getRandomButtonId(),
                title: 'Selected Option'
              }
            },
            type: 'interactive'
          }]
        },
        field: 'messages'
      }]
    }]
  }
];

function getRandomMessage() {
  const messages = [
    'Hello',
    'I need help with payment',
    'Can you help me find a driver?',
    'Show me nearby restaurants', 
    'I want to list my property',
    'How do I generate a QR code?',
    'What products are available?',
    'Help me book a ride',
    'I need support',
    'Thank you'
  ];
  return messages[Math.floor(Math.random() * messages.length)];
}

function getRandomButtonId() {
  const buttonIds = [
    'PAY',
    'GET_PAID', 
    'SEE_DRIVERS',
    'SEE_PASSENGERS',
    'BROWSE_PRODUCTS',
    'HELP',
    'SCHEDULE_TRIP'
  ];
  return buttonIds[Math.floor(Math.random() * buttonIds.length)];
}

export default function() {
  // Select random payload
  const payload = samplePayloads[Math.floor(Math.random() * samplePayloads.length)];
  
  // Test WhatsApp webhook endpoint
  const response = http.post(`${BASE_URL}/whatsapp-webhook`, JSON.stringify(payload), {
    headers: {
      'Content-Type': 'application/json',
      'X-Hub-Signature-256': 'sha256=test_signature', // Mock signature for testing
    },
    timeout: '10s',
  });
  
  // Check response
  const success = check(response, {
    'status is 200': (r) => r.status === 200,
    'response time < 2000ms': (r) => r.timings.duration < 2000,
    'response has body': (r) => r.body && r.body.length > 0,
    'no error in response': (r) => !r.body.includes('error'),
  });
  
  if (!success) {
    errorRate.add(1);
    console.log(`Request failed: ${response.status} - ${response.body}`);
  }
  
  // Random sleep between 1-3 seconds to simulate real user behavior
  sleep(Math.random() * 2 + 1);
}

// Test setup and teardown
export function setup() {
  console.log('Starting WhatsApp load test...');
  console.log(`Target: ${BASE_URL}/whatsapp-webhook`);
  
  // Verify endpoint is accessible
  const response = http.get(`${BASE_URL}/whatsapp-webhook?hub.mode=subscribe&hub.verify_token=test&hub.challenge=test`);
  if (response.status !== 200) {
    throw new Error(`Setup failed: Cannot reach webhook endpoint (${response.status})`);
  }
  
  return { startTime: new Date() };
}

export function teardown(data) {
  console.log('Load test completed');
  console.log(`Test duration: ${(new Date() - data.startTime) / 1000}s`);
}