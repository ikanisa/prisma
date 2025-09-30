import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  vus: Number(__ENV.AUTOPILOT_VUS || '5'),
  duration: __ENV.AUTOPILOT_DURATION || '1m',
  thresholds: {
    http_req_failed: ['rate<0.01'],
    'http_req_duration{label:autopilot}': ['p(95)<1000'],
  },
};

const BASE_URL = __ENV.AUTOPILOT_BASE_URL || 'http://localhost:3001';
const TOKEN = __ENV.AUTOPILOT_ACCESS_TOKEN || '';
const ORG_SLUG = __ENV.AUTOPILOT_ORG_SLUG || 'demo';

const headers = {
  Authorization: `Bearer ${TOKEN}`,
  'Content-Type': 'application/json',
};

export default function run() {
  const list = http.get(`${BASE_URL}/v1/autopilot/jobs?orgSlug=${ORG_SLUG}`, {
    headers,
    tags: { label: 'autopilot' },
  });
  check(list, {
    'list jobs 200': (res) => res.status === 200,
  });

  const schedulePayload = {
    orgSlug: ORG_SLUG,
    kind: 'refresh_analytics',
    cronExpression: '0 * * * *',
    active: true,
    metadata: {},
  };

  const schedule = http.post(`${BASE_URL}/v1/autopilot/schedule`, JSON.stringify(schedulePayload), {
    headers,
    tags: { label: 'autopilot' },
  });
  check(schedule, {
    'schedule created/ok': (res) => res.status === 200 || res.status === 201 || res.status === 409,
  });

  const runPayload = {
    orgSlug: ORG_SLUG,
    kind: 'refresh_analytics',
    payload: {},
  };

  const jobRun = http.post(`${BASE_URL}/v1/autopilot/jobs/run`, JSON.stringify(runPayload), {
    headers,
    tags: { label: 'autopilot' },
  });
  check(jobRun, {
    'job queued': (res) => res.status === 200 || res.status === 201,
  });

  sleep(1);
}
