// k6 Load Test Script for easyMO Payment API
import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate } from 'k6/metrics';

const errorRate = new Rate('errors');

export const options = {
  scenarios: {
    // QR generation load test
    qr_generation: {
      executor: 'constant-rate',
      rate: 100, // 100 requests per second
      timeUnit: '1s',
      duration: '5m',
      preAllocatedVUs: 10,
      maxVUs: 50,
      tags: { api: 'qr_generation' },
    },
    // Payment status checks (higher frequency)
    payment_status: {
      executor: 'constant-rate', 
      rate: 200, // 200 requests per second
      timeUnit: '1s',
      duration: '5m',
      preAllocatedVUs: 20,
      maxVUs: 100,
      tags: { api: 'payment_status' },
    },
  },
  thresholds: {
    http_req_duration: ['p(95)<1000'], // 95% under 1s for payment APIs
    http_req_failed: ['rate<0.05'],    // Error rate under 5%
    'http_req_duration{api:qr_generation}': ['p(95)<2000'],
    'http_req_duration{api:payment_status}': ['p(95)<500'],
  },
};

const BASE_URL = 'https://ijblirphkrrsnxazohwt.supabase.co/functions/v1';

export default function() {
  const scenario = __ENV.K6_SCENARIO_NAME;
  
  if (scenario === 'qr_generation') {
    testQRGeneration();
  } else if (scenario === 'payment_status') {
    testPaymentStatus();
  }
  
  sleep(0.1); // Short sleep for realistic pacing
}

function testQRGeneration() {
  const payload = {
    amount: Math.floor(Math.random() * 100000 + 1000), // 1K-100K RWF
    phone: '250788' + Math.floor(Math.random() * 900000 + 100000),
    description: 'Load test payment',
  };
  
  const response = http.post(`${BASE_URL}/generate-payment`, JSON.stringify(payload), {
    headers: { 'Content-Type': 'application/json' },
    timeout: '5s',
  });
  
  const success = check(response, {
    'QR generation status 200': (r) => r.status === 200,
    'QR response has ussd_code': (r) => {
      try {
        const data = JSON.parse(r.body);
        return data.ussd_code !== undefined;
      } catch(e) {
        return false;
      }
    },
    'QR response time < 2000ms': (r) => r.timings.duration < 2000,
  });
  
  if (!success) {
    errorRate.add(1);
    console.log(`QR Generation failed: ${response.status} - ${response.body.substring(0, 200)}`);
  }
}

function testPaymentStatus() {
  const paymentRef = 'PAY_' + Math.random().toString(36).substr(2, 9);
  
  const response = http.get(`${BASE_URL}/check-payment-status?ref=${paymentRef}`, {
    timeout: '3s',
  });
  
  const success = check(response, {
    'Status check returns response': (r) => r.status === 200 || r.status === 404,
    'Status response time < 500ms': (r) => r.timings.duration < 500,
  });
  
  if (!success) {
    errorRate.add(1);
    console.log(`Payment Status failed: ${response.status}`);
  }
}

export function setup() {
  console.log('Starting payment API load test...');
  
  // Verify payment endpoint is accessible
  const testPayload = {
    amount: 1000,
    phone: '250788123456',
    description: 'Setup test',
  };
  
  const response = http.post(`${BASE_URL}/generate-payment`, JSON.stringify(testPayload), {
    headers: { 'Content-Type': 'application/json' },
  });
  
  if (response.status !== 200) {
    console.warn(`Setup warning: Payment endpoint returned ${response.status}`);
  }
  
  return { startTime: new Date() };
}

export function teardown(data) {
  console.log('Payment API load test completed');
  console.log(`Duration: ${(new Date() - data.startTime) / 1000}s`);
}