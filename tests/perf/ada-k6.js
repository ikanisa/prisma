import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  vus: parseInt(__ENV.VUS || '10', 10),
  duration: __ENV.DURATION || '5m',
  thresholds: {
    http_req_duration: ['p(95)<2000'],
  },
};

const BASE_URL = __ENV.BASE_URL || 'https://staging.example.com';
const TOKEN = __ENV.ACCESS_TOKEN || '';
const ORG = __ENV.ORG_SLUG || 'acme-audit';
const ENGAGEMENT = __ENV.ENGAGEMENT_ID || '00000000-0000-0000-0000-000000000000';

export default function run() {
  const payload = JSON.stringify({
    orgSlug: ORG,
    engagementId: ENGAGEMENT,
    runId: `load-test-${__VU}-${Date.now()}`,
    parameters: {
      module: 'JE_RISK',
      filters: {
        includeWeekend: true,
        includeRoundAmounts: true,
        includeLatePostings: true,
      },
    },
  });

  const res = http.post(`${BASE_URL}/api/ada/run`, payload, {
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${TOKEN}`,
    },
    tags: { endpoint: 'ada_run' },
  });

  check(res, {
    'status is 200/202': (r) => r.status === 200 || r.status === 202,
  });

  sleep(1);
}
