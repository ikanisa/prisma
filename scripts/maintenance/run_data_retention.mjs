#!/usr/bin/env node
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { spawn } from 'node:child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '..', '..');
const policyPath = path.join(repoRoot, 'POLICY', 'data-retention-policy.json');

const policy = JSON.parse(readFileSync(policyPath, 'utf-8'));

function parseArgs() {
  const args = process.argv.slice(2);
  const parsed = {};
  for (let i = 0; i < args.length; i += 1) {
    const key = args[i];
    const value = args[i + 1];
    if (key.startsWith('--')) {
      parsed[key.replace(/^--/, '')] = value ?? true;
    }
  }
  return parsed;
}

const options = parseArgs();
const targetDataset = options.dataset;
const datasets = policy.datasets;

if (targetDataset) {
  const dataset = datasets.find((item) => item.name === targetDataset);
  if (!dataset) {
    console.error(`Unknown dataset "${targetDataset}". Available datasets: ${datasets.map((d) => d.name).join(', ')}`);
    process.exitCode = 1;
    process.exit();
  }
  await runJob(dataset);
} else {
  for (const dataset of datasets) {
    await runJob(dataset);
  }
}

async function runJob(dataset) {
  const jobName = dataset.anonymisation_job;
  const command = path.join(repoRoot, 'scripts', 'maintenance', 'jobs', `${jobName}.mjs`);

  console.log(`[retention] running ${jobName} for ${dataset.name}`);

  try {
    readFileSync(command);
  } catch (error) {
    console.warn(`[retention] script ${command} not found. Skipping execution and marking as manual.`);
    return;
  }

  await new Promise((resolve, reject) => {
    const child = spawn('node', [command], {
      stdio: 'inherit',
      env: {
        ...process.env,
        DATASET_NAME: dataset.name,
        RETENTION_DAYS: String(dataset.retention_window_days),
        STORAGE_SYSTEMS: dataset.storage.join(','),
        RETENTION_NOTES: dataset.retention_notes ?? ''
      }
    });

    child.on('close', (code) => {
      if (code !== 0) {
        reject(new Error(`${jobName} exited with code ${code}`));
      } else {
        resolve();
      }
    });
  });
}
