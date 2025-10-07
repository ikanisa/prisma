import http from 'k6/http';
import { check, sleep } from 'k6';

const DEFAULT_JOBS = ['extract_documents', 'refresh_analytics', 'close_cycle', 'audit_fieldwork', 'tax_cycle'];

export const options = {
  vus: Number(__ENV.AUTONOMY_BURST_VUS || '10'),
  duration: __ENV.AUTONOMY_BURST_DURATION || '2m',
  thresholds: {
    http_req_failed: ['rate<0.02'],
    'http_req_duration{label:autonomy-burst}': ['p(95)<1500'],
  },
};

const BASE_URL = __ENV.AUTONOMY_BURST_BASE_URL || __ENV.AUTOPILOT_BASE_URL || __ENV.BASE_URL || 'http://localhost:3001';
const TOKEN = __ENV.AUTONOMY_BURST_ACCESS_TOKEN || __ENV.AUTOPILOT_ACCESS_TOKEN || __ENV.ACCESS_TOKEN || '';
const ORG_SLUG = __ENV.AUTONOMY_BURST_ORG_SLUG || __ENV.AUTOPILOT_ORG_SLUG || __ENV.ORG_SLUG || 'demo';
const JOB_CANDIDATES = ((__ENV.AUTONOMY_BURST_JOBS || '').split(',').map((job) => job.trim()).filter(Boolean));
const JOBS = JOB_CANDIDATES.length ? JOB_CANDIDATES : DEFAULT_JOBS;

const headers = {
  Authorization: `Bearer ${TOKEN}`,
  'Content-Type': 'application/json',
};

function pickJobKind() {
  const index = Math.floor(Math.random() * JOBS.length);
  return JOBS[index];
}

export default function run() {
  const kind = pickJobKind();
  const payload = {
    orgSlug: ORG_SLUG,
    kind,
    payload: {},
  };
  const response = http.post(`${BASE_URL}/v1/autopilot/jobs/run`, JSON.stringify(payload), {
    headers,
    tags: { label: 'autonomy-burst', job: kind },
  });
  check(response, {
    'job accepted': (res) => res.status === 200 || res.status === 201,
  });
  sleep(0.5);
}
