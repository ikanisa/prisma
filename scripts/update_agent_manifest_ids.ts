#!/usr/bin/env ts-node

import fs from 'node:fs';
import path from 'node:path';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be provided');
  process.exit(1);
}

const resultsPath = path.resolve('dist', 'published_agent_ids.json');
if (!fs.existsSync(resultsPath)) {
  console.error('Published agent ID file not found:', resultsPath);
  process.exit(1);
}

const payload = JSON.parse(fs.readFileSync(resultsPath, 'utf-8')) as {
  published: Array<{ agentKey: string; version: string; openaiAgentId: string }>;
  dryRun?: boolean;
};

if (payload.dryRun) {
  console.warn('Dry-run payload detected; skipping Supabase update.');
  process.exit(0);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

async function updateManifest(entry: { agentKey: string; version: string; openaiAgentId: string }) {
  const { data, error: fetchError } = await supabase
    .from('agent_manifests')
    .select('metadata')
    .eq('agent_key', entry.agentKey)
    .eq('version', entry.version)
    .single();
  if (fetchError) throw fetchError;
  const existing = (data?.metadata ?? {}) as Record<string, unknown>;
  const nextMetadata = { ...existing, openaiAgentId: entry.openaiAgentId };
  const { error } = await supabase
    .from('agent_manifests')
    .update({ metadata: nextMetadata })
    .eq('agent_key', entry.agentKey)
    .eq('version', entry.version);
  if (error) {
    throw error;
  }
  console.warn(`Updated ${entry.agentKey}@${entry.version} -> ${entry.openaiAgentId}`);
}

(async () => {
  for (const entry of payload.published) {
    await updateManifest(entry);
  }
})();
