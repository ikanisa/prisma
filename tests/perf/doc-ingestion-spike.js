import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  vus: Number(__ENV.DOC_INGESTION_VUS || '6'),
  duration: __ENV.DOC_INGESTION_DURATION || '2m',
  thresholds: {
    http_req_failed: ['rate<0.05'],
    'http_req_duration{label:doc-ingestion}': ['p(95)<2000'],
  },
};

const BASE_URL = __ENV.DOC_INGESTION_BASE_URL || __ENV.BASE_URL || 'http://localhost:3001';
const TOKEN = __ENV.DOC_INGESTION_ACCESS_TOKEN || __ENV.ACCESS_TOKEN || '';
const ORG_SLUG = __ENV.DOC_INGESTION_ORG_SLUG || __ENV.ORG_SLUG || 'demo';
const ENTITY_ID = __ENV.DOC_INGESTION_ENTITY_ID || __ENV.ENTITY_ID || '';
const REPO_FOLDER = __ENV.DOC_INGESTION_REPO || '03_Accounting/PBC';

function buildForm(iteration) {
  const filename = `ingestion-${Date.now()}-${iteration}.txt`;
  const file = http.file(`load-test document ${iteration}`, filename, 'text/plain');
  const form = {
    file,
    orgSlug: ORG_SLUG,
    repoFolder: REPO_FOLDER,
    name: filename,
  };
  if (ENTITY_ID) {
    form.entityId = ENTITY_ID;
  }
  return form;
}

export default function run() {
  const formData = buildForm(__ITER);
  const response = http.post(`${BASE_URL}/v1/storage/documents`, formData, {
    headers: {
      Authorization: `Bearer ${TOKEN}`,
    },
    tags: { label: 'doc-ingestion' },
  });
  check(response, {
    'upload accepted': (res) => res.status === 200 || res.status === 201,
  });
  sleep(0.25);
}
