/*
 k6 scenario skeletons for group audit API under load.
 Usage:
   K6_BASE_URL=https://your-env.example.com \
   K6_ORG_ID=<uuid> K6_ENG_ID=<uuid> K6_USER_ID=<uuid> \
   k6 run tests/perf/k6-group-audit.js
*/

import http from 'k6/http';
import { check, sleep } from 'k6';

const BASE = __ENV.K6_BASE_URL || 'http://localhost:3000';
const ORG = __ENV.K6_ORG_ID || '00000000-0000-0000-0000-000000000001';
const ENG = __ENV.K6_ENG_ID || '00000000-0000-0000-0000-000000000002';
const USER = __ENV.K6_USER_ID || '00000000-0000-0000-0000-000000000004';

const COMPONENT_RESOURCE = 'group:component:create';

export const options = {
  scenarios: {
    component_create: {
      executor: 'constant-vus',
      vus: Number(__ENV.K6_COMPONENT_VUS || 15),
      duration: __ENV.K6_COMPONENT_DURATION || '1m',
      exec: 'createComponent',
    },
    instruction_complete: {
      executor: 'ramping-arrival-rate',
      startRate: Number(__ENV.K6_INSTRUCTION_START || 5),
      timeUnit: '1s',
      preAllocatedVUs: Number(__ENV.K6_INSTRUCTION_VUS || 10),
      stages: [
        { target: Number(__ENV.K6_INSTRUCTION_PEAK || 20), duration: __ENV.K6_INSTRUCTION_RAMP || '30s' },
        { target: Number(__ENV.K6_INSTRUCTION_PEAK || 20), duration: __ENV.K6_INSTRUCTION_HOLD || '30s' },
      ],
      exec: 'completeInstruction',
    },
  },
  thresholds: {
    http_req_failed: ['rate<0.01'],
    'http_req_duration{scenario:component_create}': ['p(95)<800'],
    'http_req_duration{scenario:instruction_complete}': ['p(95)<1000'],
  },
};

export function createComponent() {
  const headers = {
    'Content-Type': 'application/json',
    'x-idempotency-key': `${COMPONENT_RESOURCE}:${__VU}:${__ITER}`,
  };
  const body = JSON.stringify({
    orgId: ORG,
    engagementId: ENG,
    userId: USER,
    name: `Component ${__VU}-${__ITER}`,
    country: 'MT',
    significance: 'INSIGNIFICANT',
  });
  const res = http.post(`${BASE}/api/group/component`, body, { headers });
  check(res, {
    'component 200': (r) => r.status === 200,
    'component request-id': (r) => !!r.headers['x-request-id'],
  });
  sleep(0.25);
}

export function completeInstruction() {
  const headers = {
    'Content-Type': 'application/json',
    'x-idempotency-key': `instruction:${__VU}:${__ITER}`,
  };
  const componentId = __ENV.K6_COMPONENT_ID || '00000000-0000-0000-0000-0000000000aa';
  const instructionBody = JSON.stringify({
    orgId: ORG,
    engagementId: ENG,
    componentId,
    title: `Instruction ${__ITER}`,
    status: 'COMPLETE',
    userId: USER,
  });
  const res = http.post(`${BASE}/api/group/instruction`, instructionBody, { headers });
  check(res, {
    'instruction status ok': (r) => r.status === 200 || r.status === 404,
    'instruction correlation': (r) => !!r.headers['x-request-id'],
  });
  sleep(0.25);
}
