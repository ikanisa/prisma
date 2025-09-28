import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  vus: parseInt(__ENV.VUS || '2', 10),
  duration: __ENV.DURATION || '2m',
  thresholds: {
    http_req_duration: ['p(95)<1500'],
  },
};

const TELEMETRY_FUNCTION = __ENV.TELEMETRY_FUNCTION_URL || 'https://staging.example.com/functions/v1/telemetry-sync';
const TOKEN = __ENV.ACCESS_TOKEN || '';
const ORG_SLUG = __ENV.ORG_SLUG || 'acme-audit';

export default function run() {
  const payload = JSON.stringify({ orgSlug: ORG_SLUG });

  const res = http.post(TELEMETRY_FUNCTION, payload, {
    headers: {
      Authorization: `Bearer ${TOKEN}`,
      'Content-Type': 'application/json',
    },
    tags: { endpoint: 'telemetry_sync' },
  });

  check(res, {
    'telemetry sync ok': (r) => r.status === 200,
  });

  sleep(2);
}
