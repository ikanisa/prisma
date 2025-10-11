import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  vus: 1,
  iterations: 5,
  thresholds: {
    http_req_duration: ['p(95)<1000'],
  },
};

const BASE_URL = __ENV.RAG_BASE_URL;
const ORG_SLUG = __ENV.ORG_SLUG || 'demo';

export default function () {
  if (!BASE_URL) {
    throw new Error('RAG_BASE_URL is required');
  }
  const url = `${BASE_URL}/v1/knowledge/web-sources?orgSlug=${encodeURIComponent(ORG_SLUG)}`;
  const res = http.get(url, { headers: { 'Content-Type': 'application/json' } });
  check(res, { 'status is 200': (r) => r.status === 200 });
  sleep(1);
}

