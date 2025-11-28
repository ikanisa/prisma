#!/usr/bin/env node
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '..', '..');

const policyPath = path.join(repoRoot, 'POLICY', 'data-retention-policy.json');
const docPath = path.join(repoRoot, 'docs', 'compliance', 'data-flow-diagrams.md');

const markerStart = '<!-- retention-policy-table:start -->';
const markerEnd = '<!-- retention-policy-table:end -->';

const policy = JSON.parse(readFileSync(policyPath, 'utf-8'));
const doc = readFileSync(docPath, 'utf-8');

const docStart = doc.indexOf(markerStart);
const docEnd = doc.indexOf(markerEnd);

if (docStart === -1 || docEnd === -1) {
  console.error('Retention policy markers not found in docs/compliance/data-flow-diagrams.md');
  process.exit(1);
}

const currentTable = doc.slice(docStart + markerStart.length, docEnd).trim();
const expectedTable = buildRetentionTable(policy.datasets);

if (currentTable !== expectedTable.trim()) {
  console.error('Retention table is out of sync with POLICY/data-retention-policy.json.');
  console.error('Run: node scripts/maintenance/update_retention_docs.mjs');
  process.exit(1);
}

console.log('Retention policy documentation is up to date.');

function buildRetentionTable(datasets) {
  const header = ['| Dataset | Retention Window | Storage Systems | Anonymisation Job | Schedule |', '| --- | --- | --- | --- | --- |'];

  const rows = datasets.map((dataset) => {
    const retentionNotes = dataset.retention_notes ? ` (${dataset.retention_notes})` : '';
    return `| ${dataset.name} | ${dataset.retention_window_days} days${retentionNotes} | ${dataset.storage.join(', ')} | ${dataset.anonymisation_job} | ${dataset.schedule} |`;
  });

  return ['','', ...header, ...rows, '',''].join('\n').trim();
}
