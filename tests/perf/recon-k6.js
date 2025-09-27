import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  vus: parseInt(__ENV.VUS || '5', 10),
  duration: __ENV.DURATION || '5m',
  thresholds: {
    http_req_duration: ['p(95)<1500'],
  },
};

const BASE_URL = __ENV.BASE_URL || 'https://staging.example.com';
const TOKEN = __ENV.ACCESS_TOKEN || '';
const ORG = __ENV.ORG_SLUG || 'acme-audit';
const ENTITY = __ENV.ENTITY_ID || '00000000-0000-0000-0000-000000000000';
const PERIOD = __ENV.PERIOD_ID || '00000000-0000-0000-0000-000000000000';

export default function run() {
  const createPayload = JSON.stringify({
    orgSlug: ORG,
    type: 'BANK',
    entityId: ENTITY,
    periodId: PERIOD,
    glBalance: 1000,
    externalBalance: 1000,
  });

  const create = http.post(`${BASE_URL}/api/recon/create`, createPayload, {
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${TOKEN}`,
    },
    tags: { endpoint: 'recon_create' },
  });

  check(create, {
    'create reconciliation ok': (r) => r.status === 200,
  });

  if (create.status === 200) {
    const { reconciliationId } = create.json();
    const itemPayload = JSON.stringify({
      orgSlug: ORG,
      reconciliationId,
      category: 'DIT',
      amount: 5,
      reference: `ref-${__VU}-${Date.now()}`,
    });

    const item = http.post(`${BASE_URL}/api/recon/add-item`, itemPayload, {
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${TOKEN}`,
      },
      tags: { endpoint: 'recon_add_item' },
    });

    check(item, {
      'add item ok': (r) => r.status === 200,
    });

    const closePayload = JSON.stringify({ orgSlug: ORG, reconciliationId });
    const close = http.post(`${BASE_URL}/api/recon/close`, closePayload, {
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${TOKEN}`,
      },
      tags: { endpoint: 'recon_close' },
    });

    check(close, {
      'close reconciliation ok': (r) => r.status === 200,
    });
  }

  sleep(1);
}
