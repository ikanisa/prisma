import http from 'k6/http';
import { check, group, sleep } from 'k6';
import { getConfig, gatewayHeaders, gatewayUrl, sleepDuration } from './config.js';
import { createSummaryHandler } from './helpers/summary.js';

const config = getConfig();

export const options = {
  tags: {
    environment: config.tags.environment,
    scenario: 'user-journeys',
  },
  scenarios: {
    journeys: {
      executor: 'constant-arrival-rate',
      rate: config.scenarios.userJourneys.rate,
      timeUnit: config.scenarios.userJourneys.timeUnit,
      duration: config.scenarios.userJourneys.duration,
      preAllocatedVUs: config.scenarios.userJourneys.preAllocatedVUs,
      maxVUs: config.scenarios.userJourneys.maxVUs,
      gracefulStop: config.scenarios.userJourneys.gracefulStop,
      exec: 'userJourneys',
    },
  },
  thresholds: {
    http_req_failed: ['rate<0.03'],
    'http_req_duration{label:autonomy-status}': [`p(95)<${config.thresholds.healthP95}`],
    'http_req_duration{label:documents-feed}': [`p(95)<${config.thresholds.documentsP95}`],
    'http_req_duration{label:tasks-list}': [`p(95)<${config.thresholds.tasksP95}`],
  },
};

export function userJourneys() {
  const headers = gatewayHeaders();
  const orgQuery = `?orgSlug=${encodeURIComponent(config.org.slug)}`;

  group('autonomy-dashboard', () => {
    const response = http.get(gatewayUrl(`/autonomy/status${orgQuery}`), {
      headers,
      tags: { label: 'autonomy-status' },
    });
    check(response, {
      'autonomy status 200': (res) => res.status === 200,
      'autonomy payload has level': (res) => {
        const body = res.json();
        return Boolean(body?.autonomy?.level);
      },
    });
  });

  group('documents-feed', () => {
    const response = http.get(gatewayUrl(`/storage/documents${orgQuery}&limit=5`), {
      headers,
      tags: { label: 'documents-feed' },
    });
    check(response, {
      'documents fetch ok': (res) => res.status === 200,
    });
  });

  group('tasks-list', () => {
    const response = http.get(gatewayUrl(`/tasks${orgQuery}&limit=5`), {
      headers,
      tags: { label: 'tasks-list' },
    });
    check(response, {
      'tasks list ok': (res) => res.status === 200,
    });
  });

  group('job-submission', () => {
    const payload = JSON.stringify({
      orgId: config.org.id,
      job: 'load-test',
      metadata: { initiatedBy: config.org.userId },
    });
    const response = http.post(gatewayUrl('/jobs'), payload, {
      headers,
      tags: { label: 'job-submission' },
    });
    check(response, {
      'job accepted': (res) => res.status === 202,
    });
  });

  sleep(sleepDuration());
}

export const handleSummary = createSummaryHandler('user-journeys');
