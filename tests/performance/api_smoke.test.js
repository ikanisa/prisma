import http from 'k6/http';
import { check, group, sleep } from 'k6';
import { getConfig, gatewayHeaders, gatewayUrl, sleepDuration } from './config.js';
import { createSummaryHandler } from './helpers/summary.js';

const config = getConfig();

export const options = {
  tags: {
    environment: config.tags.environment,
    scenario: 'api-smoke',
  },
  scenarios: {
    apiSmoke: {
      executor: 'constant-arrival-rate',
      rate: config.scenarios.apiSmoke.rate,
      timeUnit: config.scenarios.apiSmoke.timeUnit,
      duration: config.scenarios.apiSmoke.duration,
      preAllocatedVUs: config.scenarios.apiSmoke.preAllocatedVUs,
      maxVUs: config.scenarios.apiSmoke.maxVUs,
      gracefulStop: config.scenarios.apiSmoke.gracefulStop,
      exec: 'apiSmoke',
    },
  },
  thresholds: {
    http_req_failed: ['rate<0.02'],
    'http_req_duration{label:gateway-health}': [`p(95)<${config.thresholds.healthP95}`],
    'http_req_duration{label:release-controls}': [`p(95)<${config.thresholds.releaseControlsP95}`],
  },
};

export function apiSmoke() {
  const headers = gatewayHeaders();

  group('gateway-health', () => {
    const response = http.get(gatewayUrl('/health'), {
      headers,
      tags: { label: 'gateway-health' },
    });
    check(response, {
      'health status ok': (res) => {
        if (res.status !== 200) return false;
        const body = res.json();
        return body?.status === 'ok';
      },
    });
  });

  group('release-controls', () => {
    const payload = JSON.stringify({ orgSlug: config.org.slug });
    const response = http.post(gatewayUrl('/release-controls/check'), payload, {
      headers,
      tags: { label: 'release-controls' },
    });
    check(response, {
      'release controls 200': (res) => res.status === 200,
      'release controls payload': (res) => {
        const body = res.json();
        return body && typeof body === 'object' && body.environment !== undefined;
      },
    });
  });

  sleep(sleepDuration());
}

export const handleSummary = createSummaryHandler('api-smoke');
