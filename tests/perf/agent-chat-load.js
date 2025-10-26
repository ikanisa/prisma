/*
 k6 scenario to validate agent chat endpoints under load.
 Usage:
   K6_BASE_URL=https://staging.example.com \
   K6_ORG_SLUG=demo \
   k6 run tests/perf/agent-chat-load.js
*/

import http from 'k6/http';
import { check, group, sleep } from 'k6';

const BASE = __ENV.K6_BASE_URL || 'https://staging.prismaglow.invalid';
const ORG_SLUG = __ENV.K6_ORG_SLUG || 'demo';
const AUTH_HEADER = __ENV.K6_AUTHORIZATION || '';
const AGENT_TYPE = __ENV.K6_AGENT_TYPE || 'AUDIT';

function requestOptions(init = {}) {
  const headers = {
    Accept: 'application/json',
    'Content-Type': 'application/json',
    'x-org-slug': ORG_SLUG,
    ...(init.headers || {}),
  };
  if (AUTH_HEADER) {
    headers.Authorization = AUTH_HEADER;
  }
  const options = { ...init, headers };
  return options;
}

export const options = {
  scenarios: {
    start_session: {
      executor: 'constant-vus',
      vus: Number(__ENV.K6_AGENT_VUS || 10),
      duration: __ENV.K6_AGENT_DURATION || '1m',
      exec: 'startSession',
    },
    conversation_cache: {
      executor: 'ramping-arrival-rate',
      startRate: Number(__ENV.K6_CONVERSATION_START || 5),
      preAllocatedVUs: Number(__ENV.K6_CONVERSATION_VUS || 10),
      stages: [
        { duration: __ENV.K6_CONVERSATION_RAMP || '1m', target: Number(__ENV.K6_CONVERSATION_TARGET || 25) },
        { duration: __ENV.K6_CONVERSATION_HOLD || '1m', target: Number(__ENV.K6_CONVERSATION_TARGET || 25) },
      ],
      exec: 'conversationCacheProbe',
    },
  },
  thresholds: {
    http_req_failed: ['rate<0.02'],
    'http_req_duration{kind:start-session}': ['p(95)<750', 'p(99)<1200'],
    'http_req_duration{kind:list-conversations,phase:fresh}': ['p(95)<500'],
    'http_req_duration{kind:list-conversations,phase:revalidate}': ['p(95)<250'],
  },
};

export function startSession() {
  const body = JSON.stringify({ orgSlug: ORG_SLUG, agentType: AGENT_TYPE });
  const res = http.post(`${BASE}/api/agent/start`, body, requestOptions({ tags: { kind: 'start-session' } }));

  check(res, {
    'start session succeeded': (r) => r.status === 200 || r.status === 202,
    'rate limit headers present': (r) => Boolean(r.headers['X-RateLimit-Limit']),
  });

  const retryAfter = Number(res.headers['Retry-After'] || 0);
  if (retryAfter > 0) {
    sleep(Math.min(retryAfter, 2));
  } else {
    sleep(Number(__ENV.K6_AGENT_SLEEP || 1));
  }
}

export function conversationCacheProbe() {
  const url = `${BASE}/api/agent/conversations?orgSlug=${encodeURIComponent(ORG_SLUG)}&order=desc&limit=20`;

  group('fresh conversation fetch', () => {
    const fresh = http.get(url, requestOptions({ tags: { kind: 'list-conversations', phase: 'fresh' } }));
    check(fresh, {
      'conversation list ok': (r) => r.status === 200,
    });

    const etag = fresh.headers.ETag || fresh.headers.Etag || fresh.headers.etag;
    if (etag) {
      const cached = http.get(
        url,
        requestOptions({
          headers: { 'If-None-Match': etag, 'Cache-Control': 'max-age=0', Accept: 'application/json' },
          tags: { kind: 'list-conversations', phase: 'revalidate' },
        }),
      );
      check(cached, {
        'cache revalidation succeeds': (r) => r.status === 304 || r.status === 200,
      });
    }
  });

  sleep(Number(__ENV.K6_CONVERSATION_SLEEP || 1));
}
