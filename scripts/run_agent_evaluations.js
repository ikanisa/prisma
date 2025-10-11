#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import { performance } from 'node:perf_hooks';

const evaluationsDir = path.resolve('tests', 'agents', 'scenarios');
const outputDir = path.resolve('dist');
const summaryPath = path.join(outputDir, 'agent_evaluations_report.json');
const metricsPath = path.join(outputDir, 'agent_evaluations_metrics.ndjson');

const DEFAULT_STATUS_ASSERTION = { type: 'status', equals: 200 };

function ensureOutputDir() {
  fs.mkdirSync(outputDir, { recursive: true });
}

function writeSummary(summary) {
  ensureOutputDir();
  fs.writeFileSync(summaryPath, JSON.stringify(summary, null, 2));
}

function writeEmptyMetrics() {
  ensureOutputDir();
  fs.writeFileSync(metricsPath, '');
}

function writeMetrics(results) {
  ensureOutputDir();
  const stream = fs.createWriteStream(metricsPath, { flags: 'w' });
  for (const result of results) {
    const record = {
      event: 'agent.evaluation',
      scenario_id: result.id,
      name: result.name,
      status: result.status,
      duration_ms: result.durationMs,
      tags: result.tags,
      failures: result.failures,
      skip_reason: result.skipReason ?? null,
      timestamp: new Date().toISOString(),
    };
    stream.write(`${JSON.stringify(record)}\n`);
  }
  stream.end();
}

function normalizePathSegment(segment) {
  return segment.replace(/\[(\d+)\]/g, '.$1');
}

function resolveJsonPath(target, pathExpression) {
  if (!pathExpression) return target;
  const segments = normalizePathSegment(pathExpression)
    .split('.')
    .map((part) => part.trim())
    .filter((part) => part.length > 0);

  let current = target;
  for (const segment of segments) {
    if (current == null) {
      return undefined;
    }
    current = current[segment];
  }
  return current;
}

function deepEqual(a, b) {
  return JSON.stringify(a) === JSON.stringify(b);
}

function formatValue(value) {
  if (typeof value === 'string') return `"${value}"`;
  return JSON.stringify(value);
}

function evaluateAssertion(assertion, context) {
  if (assertion.type === 'status') {
    if (context.status !== assertion.equals) {
      return `Expected status ${assertion.equals} but received ${context.status}`;
    }
    return null;
  }

  if (assertion.type === 'bodyIncludes') {
    if (!context.bodyText.includes(assertion.value)) {
      return `Response body does not include expected substring: ${assertion.value}`;
    }
    return null;
  }

  if (assertion.type === 'jsonPath') {
    const value = resolveJsonPath(context.jsonBody, assertion.path);
    if (assertion.exists === true && typeof value === 'undefined') {
      return `Expected JSON path "${assertion.path}" to exist`;
    }
    if (assertion.exists === false && typeof value !== 'undefined') {
      return `Expected JSON path "${assertion.path}" to be absent`;
    }
    if (Object.prototype.hasOwnProperty.call(assertion, 'equals') && !deepEqual(value, assertion.equals)) {
      return `Expected JSON path "${assertion.path}" to equal ${formatValue(assertion.equals)} but found ${formatValue(value)}`;
    }
    if (Object.prototype.hasOwnProperty.call(assertion, 'notEquals') && deepEqual(value, assertion.notEquals)) {
      return `Expected JSON path "${assertion.path}" to not equal ${formatValue(assertion.notEquals)}`;
    }
    if (Object.prototype.hasOwnProperty.call(assertion, 'includes')) {
      if (Array.isArray(value)) {
        if (!value.includes(assertion.includes)) {
          return `Expected JSON path "${assertion.path}" array to include ${formatValue(assertion.includes)}`;
        }
      } else if (typeof value === 'string') {
        if (!value.includes(String(assertion.includes))) {
          return `Expected JSON path "${assertion.path}" string to include ${formatValue(assertion.includes)}`;
        }
      } else {
        return `JSON path "${assertion.path}" is not array or string; cannot evaluate includes`;
      }
    }
    if (typeof assertion.matches === 'string') {
      const regex = new RegExp(assertion.matches);
      if (typeof value !== 'string' || !regex.test(value)) {
        return `Expected JSON path "${assertion.path}" to match regex /${assertion.matches}/`;
      }
    }
    if (Object.prototype.hasOwnProperty.call(assertion, 'lengthEquals')) {
      if (!Array.isArray(value) && typeof value !== 'string') {
        return `JSON path "${assertion.path}" is not array or string; cannot check length`;
      }
      if ((value.length ?? 0) !== assertion.lengthEquals) {
        return `Expected length of "${assertion.path}" to equal ${assertion.lengthEquals} but found ${value.length ?? 0}`;
      }
    }
    if (Object.prototype.hasOwnProperty.call(assertion, 'lengthGte')) {
      if (!Array.isArray(value) && typeof value !== 'string') {
        return `JSON path "${assertion.path}" is not array or string; cannot check length`;
      }
      if ((value.length ?? 0) < assertion.lengthGte) {
        return `Expected length of "${assertion.path}" to be >= ${assertion.lengthGte} but found ${value.length ?? 0}`;
      }
    }
    if (Object.prototype.hasOwnProperty.call(assertion, 'lengthLte')) {
      if (!Array.isArray(value) && typeof value !== 'string') {
        return `JSON path "${assertion.path}" is not array or string; cannot check length`;
      }
      if ((value.length ?? 0) > assertion.lengthLte) {
        return `Expected length of "${assertion.path}" to be <= ${assertion.lengthLte} but found ${value.length ?? 0}`;
      }
    }
    return null;
  }

  return `Unknown assertion type: ${assertion.type}`;
}

async function executeScenario(baseUrl, scenario, file, authToken) {
  const scenarioId = scenario.id ?? path.basename(file, '.json');
  const scenarioName = scenario.name ?? scenarioId;
  const tags = Array.isArray(scenario.tags) ? scenario.tags : [];

  if (scenario.skip) {
    return {
      id: scenarioId,
      name: scenarioName,
      description: scenario.description,
      file,
      status: 'skipped',
      durationMs: 0,
      failures: [],
      tags,
      skipReason: scenario.skipReason ?? 'Scenario marked as skip',
    };
  }

  if (!scenario.request?.method || !scenario.request?.path) {
    return {
      id: scenarioId,
      name: scenarioName,
      description: scenario.description,
      file,
      status: 'failed',
      durationMs: 0,
      failures: ['Scenario request definition is incomplete (method/path required).'],
      tags,
    };
  }

  const requestUrl = new URL(scenario.request.path, baseUrl).toString();
  const headers = { ...(scenario.request.headers ?? {}) };

  if (authToken && !headers.authorization && !headers.Authorization) {
    headers.Authorization = `Bearer ${authToken}`;
  }

  let body;
  if (typeof scenario.request.body !== 'undefined') {
    body = typeof scenario.request.body === 'string' ? scenario.request.body : JSON.stringify(scenario.request.body);
    if (!headers['content-type'] && !headers['Content-Type']) {
      headers['Content-Type'] = 'application/json';
    }
  }

  const controller = typeof AbortController !== 'undefined' ? new AbortController() : undefined;
  const timeoutMs = scenario.request.timeoutMs ?? 30_000;
  const timeout = controller
    ? setTimeout(() => {
        controller.abort();
      }, timeoutMs)
    : null;

  const started = performance.now();
  const failures = [];
  let statusCode = 0;
  let bodyText = '';
  let jsonBody;

  try {
    const response = await fetch(requestUrl, {
      method: scenario.request.method.toUpperCase(),
      headers,
      body,
      signal: controller?.signal,
    });
    statusCode = response.status;
    bodyText = await response.text();

    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      try {
        jsonBody = JSON.parse(bodyText);
      } catch (error) {
        failures.push(`Failed to parse JSON response: ${error.message}`);
      }
    }

    const assertions = Array.isArray(scenario.assertions) && scenario.assertions.length > 0
      ? scenario.assertions
      : [DEFAULT_STATUS_ASSERTION];

    for (const assertion of assertions) {
      const failureMessage = evaluateAssertion(assertion, {
        status: statusCode,
        bodyText,
        jsonBody,
      });
      if (failureMessage) {
        failures.push(failureMessage);
      }
    }
  } catch (error) {
    failures.push(`Request failed: ${error.message}`);
  } finally {
    if (timeout) {
      clearTimeout(timeout);
    }
  }

  const durationMs = Number((performance.now() - started).toFixed(2));

  return {
    id: scenarioId,
    name: scenarioName,
    description: scenario.description,
    file,
    status: failures.length ? 'failed' : 'passed',
    durationMs,
    failures,
    tags,
  };
}

async function main() {
  const baseUrl = (process.env.AGENT_EVALUATION_BASE_URL ?? '').trim();
  const bearerToken = (process.env.AGENT_EVALUATION_BEARER_TOKEN ?? '').trim() || undefined;

  if (!baseUrl) {
    const note = 'AGENT_EVALUATION_BASE_URL not set; skipping agent evaluations.';
    console.warn(note);
    writeSummary({
      generatedAt: new Date().toISOString(),
      baseUrl: null,
      total: 0,
      passed: 0,
      failed: 0,
      skipped: 0,
      results: [],
      note,
    });
    writeEmptyMetrics();
    return;
  }

  if (!fs.existsSync(evaluationsDir)) {
    const note = `Evaluations directory not found at ${evaluationsDir}.`;
    console.warn(note);
    writeSummary({
      generatedAt: new Date().toISOString(),
      baseUrl,
      total: 0,
      passed: 0,
      failed: 0,
      skipped: 0,
      results: [],
      note,
    });
    writeEmptyMetrics();
    return;
  }

  const scenarioFiles = fs
    .readdirSync(evaluationsDir)
    .filter((file) => file.endsWith('.json'))
    .map((file) => path.join(evaluationsDir, file));

  if (scenarioFiles.length === 0) {
    const note = 'No agent evaluation scenario files detected.';
    console.warn(note);
    writeSummary({
      generatedAt: new Date().toISOString(),
      baseUrl,
      total: 0,
      passed: 0,
      failed: 0,
      skipped: 0,
      results: [],
      note,
    });
    writeEmptyMetrics();
    return;
  }

  console.warn(`Running ${scenarioFiles.length} agent evaluation scenario(s) against ${baseUrl}`);
  const results = [];

  for (const file of scenarioFiles) {
    try {
      const raw = fs.readFileSync(file, 'utf-8');
      const scenario = JSON.parse(raw);
      const result = await executeScenario(baseUrl, scenario, file, bearerToken);
      results.push(result);
      if (result.status === 'failed') {
        console.error(`✖ ${result.id} failed: ${result.failures.join('; ')}`);
      } else if (result.status === 'skipped') {
        console.warn(`○ ${result.id} skipped: ${result.skipReason ?? 'no reason provided'}`);
      } else {
        console.warn(`✓ ${result.id} passed in ${result.durationMs}ms`);
      }
    } catch (error) {
      const scenarioId = path.basename(file, '.json');
      const message = `Failed to execute scenario ${scenarioId}: ${error.message}`;
      console.error(message);
      results.push({
        id: scenarioId,
        name: scenarioId,
        file,
        status: 'failed',
        durationMs: 0,
        failures: [message],
        tags: [],
      });
    }
  }

  const summary = {
    generatedAt: new Date().toISOString(),
    baseUrl,
    total: results.length,
    passed: results.filter((r) => r.status === 'passed').length,
    failed: results.filter((r) => r.status === 'failed').length,
    skipped: results.filter((r) => r.status === 'skipped').length,
    results,
  };

  writeSummary(summary);
  writeMetrics(results);

  if (summary.failed > 0) {
    process.exitCode = 1;
  }
}

void main();
