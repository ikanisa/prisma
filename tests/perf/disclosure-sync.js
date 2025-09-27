import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  vus: parseInt(__ENV.VUS || '3', 10),
  duration: __ENV.DURATION || '3m',
  thresholds: {
    http_req_duration: ['p(95)<2500'],
  },
};

const BASE_URL = __ENV.BASE_URL || 'https://staging.example.com';
const TOKEN = __ENV.ACCESS_TOKEN || '';
const ORG_ID = __ENV.ORG_ID || '00000000-0000-0000-0000-000000000000';
const ENTITY_ID = __ENV.ENTITY_ID || '00000000-0000-0000-0000-000000000000';
const PERIOD_ID = __ENV.PERIOD_ID || '00000000-0000-0000-0000-000000000000';

export default function run() {
  const notesUrl = `${BASE_URL}/api/financials/notes?orgId=${ORG_ID}&entityId=${ENTITY_ID}&periodId=${PERIOD_ID}`;
  const esefUrl = `${BASE_URL}/api/financials/esef?orgId=${ORG_ID}&entityId=${ENTITY_ID}&periodId=${PERIOD_ID}&periodLabel=LoadTest`;

  const notes = http.get(notesUrl, {
    headers: {
      Authorization: `Bearer ${TOKEN}`,
    },
    tags: { endpoint: 'financial_notes' },
  });

  check(notes, {
    'notes ok': (r) => r.status === 200,
  });

  const esef = http.get(esefUrl, {
    headers: {
      Authorization: `Bearer ${TOKEN}`,
    },
    tags: { endpoint: 'financial_esef' },
  });

  check(esef, {
    'esef ok': (r) => r.status === 200,
  });

  sleep(1);
}
