#!/usr/bin/env ts-node

import fs from 'node:fs';
import path from 'node:path';
import { z } from 'zod';

const bootstrapPath = path.resolve('services/rag/mcp/bootstrap.ts');
const outputPath = path.resolve('dist', 'agent_manifests.json');

const manifestSchema = z.object({
  agentKey: z.string(),
  version: z.string(),
  persona: z.string(),
  promptTemplate: z.string(),
  toolKeys: z.array(z.string()),
  defaultRole: z.string().optional(),
  safetyLevel: z.string().optional(),
  metadata: z.record(z.any()).optional(),
});

const file = fs.readFileSync(bootstrapPath, 'utf-8');
const match = file.match(/const MANIFEST_DEFINITIONS:[\s\S]+?= \[(?<body>[\s\S]+?)\];/);

if (!match?.groups?.body) {
  console.error('Unable to extract manifest definitions');
  process.exit(1);
}

const tempModulePath = path.resolve('.tmp', 'manifest-defs.mjs');
fs.mkdirSync(path.dirname(tempModulePath), { recursive: true });
fs.writeFileSync(tempModulePath, `${match[0]}\nexport default MANIFEST_DEFINITIONS;\n`);

(async () => {
  const mod = await import(tempModulePath);
  const manifests = z.array(manifestSchema).parse(mod.default);
  const outputDir = path.dirname(outputPath);
  fs.mkdirSync(outputDir, { recursive: true });
  fs.writeFileSync(outputPath, JSON.stringify({ manifests }, null, 2));
  console.warn(`Wrote ${manifests.length} manifests to ${outputPath}`);
  fs.rmSync(tempModulePath, { recursive: true, force: true });
})();
