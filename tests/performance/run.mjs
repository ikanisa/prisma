import { spawn } from 'node:child_process';
import { mkdir, rm, access } from 'node:fs/promises';
import { constants } from 'node:fs';
import path from 'node:path';

const DEFAULT_SUMMARY_DIR = 'test-results/performance';
const scenarios = [
  { name: 'api-smoke', file: 'tests/performance/api_smoke.test.js' },
  { name: 'user-journeys', file: 'tests/performance/user_flows.test.js' },
];

function resolveScenarios() {
  const filter = (process.env.PERF_SCENARIOS || '')
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean);
  if (filter.length === 0) return scenarios;
  const selected = scenarios.filter((scenario) => filter.includes(scenario.name));
  if (selected.length === 0) {
    console.error(`No scenarios matched PERF_SCENARIOS=${filter.join(',')}. Available: ${scenarios
      .map((scenario) => scenario.name)
      .join(', ')}`);
    process.exitCode = 1;
  }
  return selected;
}

async function ensureSummaryDir(dir, clean = true) {
  if (clean) {
    await rm(dir, { recursive: true, force: true });
  }
  await mkdir(dir, { recursive: true });
}

function resolveBinary() {
  return process.env.K6_BIN || (process.platform === 'win32' ? 'k6.exe' : 'k6');
}

async function ensureK6Binary(command) {
  try {
    await new Promise((resolve, reject) => {
      const child = spawn(command, ['version'], { stdio: 'ignore' });
      child.on('error', reject);
      child.on('exit', (code) => {
        if (code === 0) resolve();
        else reject(new Error('k6 command exited with non-zero status'));
      });
    });
  } catch (error) {
    console.error('k6 binary not found. Install k6 or expose it via the K6_BIN environment variable.');
    console.error('Installation instructions: https://grafana.com/docs/k6/latest/set-up/install-k6/');
    throw error;
  }
}

function buildCommandArgs(scenario) {
  const extraArgsIndex = process.argv.indexOf('--');
  const extraArgs = extraArgsIndex === -1 ? [] : process.argv.slice(extraArgsIndex + 1);
  const baseArgs = ['run', scenario.file, ...extraArgs];
  return baseArgs;
}

async function runScenario(command, scenario, summaryDir) {
  console.log(`\n▶ Running ${scenario.name}`);
  const args = buildCommandArgs(scenario);
  const env = {
    ...process.env,
    PERF_SUMMARY_DIR: summaryDir,
    PERF_SUMMARY_BASENAME: scenario.name,
  };

  await new Promise((resolve, reject) => {
    const child = spawn(command, args, { stdio: 'inherit', env });
    child.on('error', reject);
    child.on('exit', (code) => {
      if (code === 0) {
        console.log(`✔ Scenario ${scenario.name} completed`);
        resolve();
      } else {
        reject(new Error(`Scenario ${scenario.name} failed with exit code ${code}`));
      }
    });
  });
}

async function main() {
  const summaryDir = process.env.PERF_SUMMARY_DIR || DEFAULT_SUMMARY_DIR;
  const clean = (process.env.PERF_CLEAN_RESULTS || 'true').toLowerCase() !== 'false';
  const command = resolveBinary();
  await ensureK6Binary(command);
  await ensureSummaryDir(summaryDir, clean);

  const selectedScenarios = resolveScenarios();
  if (!selectedScenarios.length) {
    throw new Error('No scenarios selected for execution.');
  }

  for (const scenario of selectedScenarios) {
    await runScenario(command, scenario, summaryDir);
  }

  const htmlExpected = (process.env.PERF_SUMMARY_FORMAT || 'full').toLowerCase() !== 'json';
  for (const scenario of selectedScenarios) {
    const files = [`${scenario.name}.json`];
    if (htmlExpected) files.push(`${scenario.name}.html`);
    for (const file of files) {
      const fullPath = path.join(summaryDir, file);
      try {
        await access(fullPath, constants.F_OK);
        console.log(`📄 Summary available at ${fullPath}`);
      } catch {
        console.warn(`⚠️ Expected summary ${fullPath} was not generated.`);
      }
    }
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
