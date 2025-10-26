#!/usr/bin/env node
import { readFileSync, writeFileSync } from 'node:fs';
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

const startIndex = doc.indexOf(markerStart);
const endIndex = doc.indexOf(markerEnd);

if (startIndex === -1 || endIndex === -1) {
  console.error('Unable to locate retention policy markers in docs/compliance/data-flow-diagrams.md');
  process.exit(1);
}

const before = doc.slice(0, startIndex + markerStart.length);
const after = doc.slice(endIndex);
const table = buildRetentionTable(policy.datasets);

const nextDoc = `${before}\n${table}\n${after}`;
writeFileSync(docPath, nextDoc);
console.log('Updated retention table in docs/compliance/data-flow-diagrams.md');

function buildRetentionTable(datasets) {
  const header = ['| Dataset | Retention Window | Storage Systems | Anonymisation Job | Schedule |', '| --- | --- | --- | --- | --- |'];
  const rows = datasets.map((dataset) => {
    const retentionNotes = dataset.retention_notes ? ` (${dataset.retention_notes})` : '';
    return `| ${dataset.name} | ${dataset.retention_window_days} days${retentionNotes} | ${dataset.storage.join(', ')} | ${dataset.anonymisation_job} | ${dataset.schedule} |`;
  });
  return ['\n', ...header, ...rows, '\n'].join('\n');
}
