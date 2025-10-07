import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  vus: Number(__ENV.ARCHIVE_REBUILD_VUS || '2'),
  duration: __ENV.ARCHIVE_REBUILD_DURATION || '1m',
  thresholds: {
    http_req_failed: ['rate<0.02'],
    'http_req_duration{label:archive-rebuild}': ['p(95)<1500'],
  },
};

const FUNCTION_URL =
  __ENV.ARCHIVE_FUNCTION_URL ||
  __ENV.ARCHIVE_REBUILD_FUNCTION_URL ||
  __ENV.SUPABASE_ARCHIVE_FUNCTION_URL ||
  '';
const TOKEN = __ENV.ARCHIVE_REBUILD_ACCESS_TOKEN || __ENV.ACCESS_TOKEN || '';
const ORG_SLUG = __ENV.ARCHIVE_REBUILD_ORG_SLUG || __ENV.ORG_SLUG || 'demo';
const ENGAGEMENT_ID = __ENV.ARCHIVE_REBUILD_ENGAGEMENT_ID || __ENV.ENGAGEMENT_ID || '';

if (!FUNCTION_URL) {
  throw new Error('ARCHIVE_FUNCTION_URL or equivalent env var required for archive-rebuild k6 script');
}

export default function run() {
  const payload = {
    orgSlug: ORG_SLUG,
    engagementId: ENGAGEMENT_ID || undefined,
    includeDocuments: true,
  };
  const response = http.post(FUNCTION_URL, JSON.stringify(payload), {
    headers: {
      Authorization: `Bearer ${TOKEN}`,
      'Content-Type': 'application/json',
    },
    tags: { label: 'archive-rebuild' },
  });
  check(response, {
    'archive sync ok': (res) => res.status === 200 || res.status === 202,
  });
  sleep(1);
}
