#!/usr/bin/env ts-node

import fs from 'node:fs';
import path from 'node:path';
import fetch from 'node-fetch';

import { buildOpenAiUrl } from '../lib/openai/url';

interface AgentManifest {
  agentKey: string;
  version: string;
  persona: string;
  promptTemplate: string;
  toolKeys: string[];
  defaultRole?: string;
  safetyLevel?: string;
  metadata?: Record<string, unknown>;
}

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const OPENAI_ORG_ID = process.env.OPENAI_ORG_ID;

if (!OPENAI_API_KEY) {
  console.error('OPENAI_API_KEY is required');
  process.exit(1);
}

const manifestFile = path.resolve('dist', 'agent_manifests.json');
const resultsFile = path.resolve('dist', 'published_agent_ids.json');
const dryRun = process.argv.includes('--dry-run');
if (!fs.existsSync(manifestFile)) {
  console.error('Manifest file missing. Run scripts/generate_agent_manifests.ts first.');
  process.exit(1);
}

const { manifests } = JSON.parse(fs.readFileSync(manifestFile, 'utf-8')) as { manifests: AgentManifest[] };

async function publishManifest(manifest: AgentManifest) {
  if (dryRun) {
    console.warn(`[dry-run] Would publish ${manifest.agentKey}@${manifest.version}`);
    return { id: 'dry-run', agentKey: manifest.agentKey };
  }
  const payload = {
    name: manifest.agentKey,
    version: manifest.version,
    instructions: manifest.promptTemplate,
    tools: manifest.toolKeys.map((key) => ({ type: 'function', function: { name: key } })),
    metadata: manifest.metadata ?? {},
  };

  const headers: Record<string, string> = {
    Authorization: `Bearer ${OPENAI_API_KEY}`,
    'Content-Type': 'application/json',
  };
  if (OPENAI_ORG_ID) {
    headers['OpenAI-Organization'] = OPENAI_ORG_ID;
  }

  const res = await fetch(buildOpenAiUrl('agents'), {
    method: 'POST',
    headers,
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Failed to publish ${manifest.agentKey}: ${res.status} ${body}`);
  }

  const json = await res.json();
  return json;
}

(async () => {
  const results: Array<{ agentKey: string; version: string; openaiAgentId: string }> = [];
  for (const manifest of manifests) {
    console.warn(`Publishing ${manifest.agentKey}@${manifest.version}`);
    try {
      const result = await publishManifest(manifest);
      console.warn(`Success: ${result.id}`);
      results.push({ agentKey: manifest.agentKey, version: manifest.version, openaiAgentId: result.id });
    } catch (error) {
      console.error(error);
      process.exitCode = 1;
      break;
    }
  }
  fs.mkdirSync(path.dirname(resultsFile), { recursive: true });
  fs.writeFileSync(resultsFile, JSON.stringify({ published: results, dryRun }, null, 2));
  console.warn(`Results written to ${resultsFile}`);
})();
