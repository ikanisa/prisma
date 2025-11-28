import { access, readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import yaml from 'yaml';

const moduleDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(moduleDir, '../../..');
const defaultSecretsDir = path.join(repoRoot, 'config', 'secrets');

export interface RunbookDefinition {
  metadata: {
    id: string;
    name: string;
    severity?: string;
    summary?: string;
    owned_by?: string;
    last_reviewed_on?: string;
  };
  review: {
    frequency: string;
    approvers?: string[];
    last_reviewed_on?: string;
    simulation?: {
      command: string;
      description?: string;
    };
  };
  automation?: {
    pagerduty?: {
      service_id: string;
      escalation_policy_id: string;
      urgency?: 'high' | 'low';
      title_template?: string;
      body_template?: string;
    };
    firehydrant?: {
      incident_type: string;
      environment?: string;
      priority?: string;
      title_template?: string;
      summary_template?: string;
    };
  };
  playbook?: {
    steps: Array<{
      title: string;
      details: string;
    }>;
  };
}

interface PagerDutySecret {
  apiToken: string;
  fromEmail: string;
}

interface FireHydrantSecret {
  apiToken: string;
  teamId: string;
}

export interface AutomationOptions {
  dryRun?: boolean;
  fetchImpl?: typeof fetch;
  secretsDir?: string;
}

export interface SimulationOptions extends AutomationOptions {
  rootDir?: string;
}

export interface PagerDutyAutomationResult {
  request: PagerDutyIncidentRequest;
  headers: Record<string, string>;
  response?: {
    status: number;
    ok: boolean;
  };
}

export interface FireHydrantAutomationResult {
  request: FireHydrantIncidentRequest;
  headers: Record<string, string>;
  response?: {
    status: number;
    ok: boolean;
  };
}

export interface AutomationResult {
  pagerduty?: PagerDutyAutomationResult;
  firehydrant?: FireHydrantAutomationResult;
}

export interface PagerDutyIncidentRequest {
  incident: {
    type: 'incident';
    title: string;
    service: {
      id: string;
      type: 'service_reference';
    };
    escalation_policy: {
      id: string;
      type: 'escalation_policy_reference';
    };
    urgency: 'high' | 'low';
    body: {
      type: 'incident_body';
      details: string;
    };
  };
}

export interface FireHydrantIncidentRequest {
  incident_type: string;
  title: string;
  summary: string;
  team_id: string;
  environment?: string;
  priority?: string;
}

async function resolveSecretPath(
  filename: string,
  secretsDir: string = defaultSecretsDir,
): Promise<string> {
  const primary = path.join(secretsDir, filename);
  try {
    await access(primary);
    return primary;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
      throw error;
    }
  }

  const exampleName = filename.endsWith('.json')
    ? filename.replace(/\.json$/u, '.example.json')
    : `${filename}.example`;
  const fallback = path.join(secretsDir, exampleName);
  await access(fallback);
  return fallback;
}

async function loadJsonSecret<TSecret>(
  filename: string,
  secretsDir: string = defaultSecretsDir,
): Promise<TSecret> {
  const secretPath = await resolveSecretPath(filename, secretsDir);
  const contents = await readFile(secretPath, 'utf8');
  return JSON.parse(contents) as TSecret;
}

export async function loadRunbookDefinition(
  runbookPath: string,
  rootDir: string = repoRoot,
): Promise<RunbookDefinition> {
  const absolutePath = path.isAbsolute(runbookPath)
    ? runbookPath
    : path.resolve(rootDir, runbookPath);
  const raw = await readFile(absolutePath, 'utf8');
  const parsed = yaml.parse(raw) as RunbookDefinition;
  return parsed;
}

function computeNextReviewDate(
  lastReviewed: string | undefined,
  frequency: string,
): string {
  const baseline = lastReviewed ? new Date(lastReviewed) : new Date();
  if (Number.isNaN(baseline.getTime())) {
    throw new Error(`Invalid last review date: ${lastReviewed}`);
  }

  const next = new Date(baseline);
  switch (frequency) {
    case 'quarterly':
      next.setMonth(next.getMonth() + 3);
      break;
    case 'monthly':
      next.setMonth(next.getMonth() + 1);
      break;
    case 'annual':
      next.setFullYear(next.getFullYear() + 1);
      break;
    default:
      next.setMonth(next.getMonth() + 3);
  }

  return next.toISOString().slice(0, 10);
}

async function buildPagerDutyRequest(
  runbook: RunbookDefinition,
  secretsDir: string,
): Promise<{
  request: PagerDutyIncidentRequest;
  headers: Record<string, string>;
}> {
  if (!runbook.automation?.pagerduty) {
    throw new Error('PagerDuty automation is not defined in the runbook.');
  }

  const pagerDutySecret = await loadJsonSecret<PagerDutySecret>(
    'pagerduty.json',
    secretsDir,
  );

  const { service_id, escalation_policy_id, urgency, title_template, body_template } =
    runbook.automation.pagerduty;

  const request: PagerDutyIncidentRequest = {
    incident: {
      type: 'incident',
      title: title_template ?? runbook.metadata.name,
      service: {
        id: service_id,
        type: 'service_reference',
      },
      escalation_policy: {
        id: escalation_policy_id,
        type: 'escalation_policy_reference',
      },
      urgency: urgency ?? 'high',
      body: {
        type: 'incident_body',
        details: body_template ?? runbook.metadata.summary ?? '',
      },
    },
  };

  const headers = {
    Authorization: `Token token=${pagerDutySecret.apiToken}`,
    From: pagerDutySecret.fromEmail,
    Accept: 'application/vnd.pagerduty+json;version=2',
    'Content-Type': 'application/json',
  } satisfies Record<string, string>;

  return { request, headers };
}

async function buildFireHydrantRequest(
  runbook: RunbookDefinition,
  secretsDir: string,
): Promise<{
  request: FireHydrantIncidentRequest;
  headers: Record<string, string>;
}> {
  if (!runbook.automation?.firehydrant) {
    throw new Error('FireHydrant automation is not defined in the runbook.');
  }

  const fireHydrantSecret = await loadJsonSecret<FireHydrantSecret>(
    'firehydrant.json',
    secretsDir,
  );

  const { incident_type, environment, priority, title_template, summary_template } =
    runbook.automation.firehydrant;

  const request: FireHydrantIncidentRequest = {
    incident_type,
    title: title_template ?? runbook.metadata.name,
    summary: summary_template ?? runbook.metadata.summary ?? '',
    team_id: fireHydrantSecret.teamId,
    environment,
    priority,
  };

  const headers = {
    Authorization: `Bearer ${fireHydrantSecret.apiToken}`,
    'Content-Type': 'application/json',
  } satisfies Record<string, string>;

  return { request, headers };
}

export async function createPagerDutyIncident(
  runbook: RunbookDefinition,
  options: AutomationOptions = {},
): Promise<PagerDutyAutomationResult> {
  const { dryRun = false, fetchImpl, secretsDir = defaultSecretsDir } = options;
  const { request, headers } = await buildPagerDutyRequest(runbook, secretsDir);

  if (dryRun) {
    return { request, headers };
  }

  const runtimeFetch = fetchImpl ?? globalThis.fetch;
  if (!runtimeFetch) {
    throw new Error('Fetch API is not available. Provide a fetch implementation.');
  }

  const response = await runtimeFetch('https://api.pagerduty.com/incidents', {
    method: 'POST',
    headers,
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    throw new Error(`PagerDuty incident creation failed with status ${response.status}`);
  }

  return {
    request,
    headers,
    response: {
      status: response.status,
      ok: response.ok,
    },
  };
}

export async function createFireHydrantIncident(
  runbook: RunbookDefinition,
  options: AutomationOptions = {},
): Promise<FireHydrantAutomationResult> {
  const { dryRun = false, fetchImpl, secretsDir = defaultSecretsDir } = options;
  const { request, headers } = await buildFireHydrantRequest(runbook, secretsDir);

  if (dryRun) {
    return { request, headers };
  }

  const runtimeFetch = fetchImpl ?? globalThis.fetch;
  if (!runtimeFetch) {
    throw new Error('Fetch API is not available. Provide a fetch implementation.');
  }

  const response = await runtimeFetch('https://api.firehydrant.io/v1/incidents', {
    method: 'POST',
    headers,
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    throw new Error(
      `FireHydrant incident creation failed with status ${response.status}`,
    );
  }

  return {
    request,
    headers,
    response: {
      status: response.status,
      ok: response.ok,
    },
  };
}

export async function executeRunbookAutomation(
  runbook: RunbookDefinition,
  options: AutomationOptions = {},
): Promise<AutomationResult> {
  const results: AutomationResult = {};

  if (runbook.automation?.pagerduty) {
    results.pagerduty = await createPagerDutyIncident(runbook, options);
  }

  if (runbook.automation?.firehydrant) {
    results.firehydrant = await createFireHydrantIncident(runbook, options);
  }

  return results;
}

export async function simulateQuarterlyReview(
  runbookPath: string,
  options: SimulationOptions = {},
): Promise<{
  runbook: RunbookDefinition;
  nextReviewDate: string;
  automation: AutomationResult;
}> {
  const definition = await loadRunbookDefinition(
    runbookPath,
    options.rootDir ?? repoRoot,
  );

  if (definition.review?.frequency !== 'quarterly') {
    throw new Error(
      `Runbook ${definition.metadata?.id ?? runbookPath} is not scheduled for quarterly review.`,
    );
  }

  const lastReviewed =
    definition.review?.last_reviewed_on ?? definition.metadata?.last_reviewed_on;
  const nextReviewDate = computeNextReviewDate(lastReviewed, definition.review.frequency);

  const automation = await executeRunbookAutomation(definition, {
    ...options,
    dryRun: options.dryRun ?? true,
  });

  return { runbook: definition, nextReviewDate, automation };
}

export { computeNextReviewDate };
