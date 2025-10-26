#!/usr/bin/env node
export function summarizeExecution(jobName) {
  const dataset = process.env.DATASET_NAME ?? 'unknown';
  const retentionDays = process.env.RETENTION_DAYS ?? 'n/a';
  const storage = process.env.STORAGE_SYSTEMS ?? 'n/a';
  const notes = process.env.RETENTION_NOTES ?? '';

  console.log(`[job-runner] executing ${jobName}`);
  console.log(`  dataset: ${dataset}`);
  console.log(`  retention_days: ${retentionDays}`);
  console.log(`  storage_systems: ${storage}`);
  if (notes) {
    console.log(`  notes: ${notes}`);
  }

  console.log(`[job-runner] ${jobName} completed successfully`);
}
