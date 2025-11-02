#!/usr/bin/env node
import { spawn } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync } from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '..', '..');
const resultsDir = path.join(repoRoot, 'test-results', 'performance');

const args = process.argv.slice(2);
const isCI = args.includes('--ci');
const debugStub = args.includes('--debug-stub');
let stubServer;

function parseEnv(contents) {
  return contents
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith('#'))
    .reduce((acc, line) => {
      const eqIndex = line.indexOf('=');
      if (eqIndex === -1) {
        return acc;
      }
      const key = line.slice(0, eqIndex).trim();
      const value = line.slice(eqIndex + 1).trim().replace(/^['"]|['"]$/g, '');
      if (!acc[key]) {
        acc[key] = value;
      }
      return acc;
    }, {});
}

function loadEnv() {
  if (isCI) {
    return {
      PERF_BASE_URL: process.env.PERF_BASE_URL || 'http://127.0.0.1:4010',
      PERF_AUTH_TOKEN: process.env.PERF_AUTH_TOKEN || 'placeholder-token',
      PERF_SUPABASE_SERVICE_KEY: process.env.PERF_SUPABASE_SERVICE_KEY || 'placeholder-key',
      PERF_ORG_SLUG: process.env.PERF_ORG_SLUG || 'placeholder-org',
      PERF_ENGAGEMENT_ID: process.env.PERF_ENGAGEMENT_ID || 'placeholder-engagement',
    };
  }

  const candidates = [
    path.join(repoRoot, '.env.performance.local'),
    path.join(repoRoot, '.env.performance'),
    path.join(repoRoot, '.env.local'),
    path.join(repoRoot, '.env'),
  ];

  return candidates
    .filter((filePath) => existsSync(filePath))
    .map((filePath) => parseEnv(readFileSync(filePath, 'utf8')))
    .reduce((acc, fileEnv) => ({ ...acc, ...fileEnv }), {});
}

function spawnAsync(command, commandArgs, env) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, commandArgs, {
      cwd: repoRoot,
      env,
      stdio: 'inherit',
    });

    child.on('close', (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`${command} ${commandArgs.join(' ')} exited with code ${code}`));
      }
    });
  });
}

async function main() {
  const envFromFiles = loadEnv();
  const mergedEnv = {
    ...process.env,
    ...envFromFiles,
    ARTILLERY_NO_TELEMETRY: '1',
  };
  if (isCI && !mergedEnv.ARTILLERY_ENV) {
    mergedEnv.ARTILLERY_ENV = 'ci';
  }
  if (isCI) {
    for (const key of [
      'HTTP_PROXY',
      'http_proxy',
      'HTTPS_PROXY',
      'https_proxy',
      'NO_PROXY',
      'no_proxy',
      'NODE_EXTRA_CA_CERTS',
      'REQUESTS_CA_BUNDLE',
      'SSL_CERT_FILE',
      'npm_config_http_proxy',
      'npm_config_https_proxy',
      'YARN_HTTP_PROXY',
      'YARN_HTTPS_PROXY',
    ]) {
      delete mergedEnv[key];
    }
  }

  mkdirSync(resultsDir, { recursive: true });

  const outputFile = path.join('test-results', 'performance', 'api_smoke.json');
  const reportFile = path.join('test-results', 'performance', 'api_smoke.html');
  const runArgs = ['exec', 'artillery', 'run', 'tests/performance/api_smoke.yml', '--output', outputFile];
  if (isCI) {
    const overrides = JSON.stringify({
      config: {
        target: mergedEnv.PERF_BASE_URL,
        phases: [
          {
            duration: 5,
            arrivalRate: 1,
            name: 'ci-validation',
          },
        ],
      },
    });
    runArgs.push('--target', mergedEnv.PERF_BASE_URL);
    runArgs.push('--environment', mergedEnv.ARTILLERY_ENV || 'ci');
    runArgs.push('--overrides', overrides);
  }

  try {
    if (isCI) {
      const targetUrl = new URL(mergedEnv.PERF_BASE_URL);
      const port = Number(targetUrl.port) || (targetUrl.protocol === 'https:' ? 443 : 80);
      stubServer = http.createServer((req, res) => {
        req.on('error', () => {});
        req.resume();
        const requestUrl = new URL(req.url ?? '/', 'http://localhost');
        res.setHeader('Content-Type', 'application/json');
        const method = req.method || 'GET';
        if (debugStub) {
          console.log(`[stub] ${method} ${requestUrl.pathname}`);
        }

        if (method === 'POST' && requestUrl.pathname === '/api/agent/start') {
          res.end(JSON.stringify({ sessionId: 'stub-session' }));
          return;
        }

        if (method === 'POST' && requestUrl.pathname === '/api/agent/plan') {
          res.end(JSON.stringify({ plan: { steps: [] } }));
          return;
        }

        if (method === 'POST' && requestUrl.pathname === '/api/agent/respond') {
          res.end(JSON.stringify({ response: { message: 'ok' } }));
          return;
        }

        if (method === 'GET' && requestUrl.pathname === '/functions/v1/audit-kam/list') {
          res.end(JSON.stringify({ candidates: [], drafts: [], approvals: [] }));
          return;
        }

        if (method === 'GET' && requestUrl.pathname === '/functions/v1/audit-plan/status') {
          res.end(JSON.stringify({ plan: {}, materiality: {}, approvals: [] }));
          return;
        }

        if (method === 'GET' && requestUrl.pathname === '/functions/v1/audit-report/get') {
          res.end(JSON.stringify({ report: {}, approvals: [] }));
          return;
        }

        res.end(JSON.stringify({ ok: true }));
      });

      await new Promise((resolve) => stubServer.listen(port, resolve));
      if (debugStub) {
        console.log(`[stub] listening on ${port}`);
      }
    }

    await spawnAsync('pnpm', runArgs, mergedEnv);
    const outputExists = existsSync(path.join(repoRoot, outputFile));
    if (outputExists) {
      await spawnAsync('pnpm', ['exec', 'artillery', 'report', outputFile, '--output', reportFile], mergedEnv);
    } else {
      console.warn(`Skipping HTML report generation; ${outputFile} was not created.`);
    }
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  } finally {
    if (stubServer) {
      await new Promise((resolve) => stubServer.close(resolve));
      stubServer = undefined;
    }
  }
}

main();
