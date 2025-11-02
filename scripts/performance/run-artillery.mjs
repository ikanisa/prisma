import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.join(__dirname, '..', '..');

const scenarios = [
  { name: 'api_smoke', file: 'tests/performance/api_smoke.test.yml' },
  { name: 'agent_journeys', file: 'tests/performance/agent_journeys.test.yml' },
];

const envName = process.env.ARTILLERY_ENV || 'local';
const outputDir = path.resolve(repoRoot, process.env.PERF_OUTPUT_DIR || 'test-results/performance');
const scenarioFilter = (process.env.PERF_SCENARIOS || '')
  .split(',')
  .map((value) => value.trim())
  .filter(Boolean);

const selectedScenarios =
  scenarioFilter.length > 0
    ? scenarios.filter((scenario) => scenarioFilter.includes(scenario.name))
    : scenarios;

if (selectedScenarios.length === 0) {
  console.error('No performance scenarios selected.');
  process.exit(1);
}

fs.mkdirSync(outputDir, { recursive: true });

function runCommand(command, args) {
  const child = spawnSync(command, args, {
    cwd: repoRoot,
    env: {
      ...process.env,
      ARTILLERY_NO_TELEMETRY: process.env.ARTILLERY_NO_TELEMETRY || '1',
    },
    stdio: 'inherit',
  });

  if (child.error) {
    throw child.error;
  }
  if (typeof child.status === 'number' && child.status !== 0) {
    process.exit(child.status);
  }
}

for (const scenario of selectedScenarios) {
  const scriptPath = path.join(repoRoot, scenario.file);
  if (!fs.existsSync(scriptPath)) {
    console.error(`Scenario file not found: ${scenario.file}`);
    process.exit(1);
  }

  const outputJson = path.join(outputDir, `${scenario.name}.${envName}.json`);
  const outputHtml = path.join(outputDir, `${scenario.name}.${envName}.html`);

  console.log(`\n➡️  Running ${scenario.name} (${envName})`);
  runCommand('pnpm', ['exec', 'artillery', 'run', scenario.file, '--environment', envName, '--output', outputJson]);

  console.log(`\n📝 Generating HTML report for ${scenario.name}`);
  runCommand('pnpm', ['exec', 'artillery', 'report', outputJson, '--output', outputHtml]);
}

console.log(`\n✅ Performance tests complete. Reports available in ${outputDir}`);
