#!/usr/bin/env node
import fs from 'node:fs/promises';
import path from 'node:path';
import yaml from 'js-yaml';
import { Client } from 'pg';

const VALID_AUTHORITY_LEVELS = new Set(['PRIMARY', 'SECONDARY', 'INTERNAL']);
const VALID_STATUS = new Set(['ACTIVE', 'INACTIVE']);

const normalizeTags = (tags) => {
  if (!Array.isArray(tags)) return [];
  const seen = new Set();
  const normalized = [];
  for (const tag of tags) {
    const trimmed = typeof tag === 'string' ? tag.trim() : '';
    if (!trimmed || seen.has(trimmed)) continue;
    seen.add(trimmed);
    normalized.push(trimmed);
  }
  return normalized;
};

const ensureString = (value, field, index) => {
  if (typeof value !== 'string') {
    throw new Error(`Field "${field}" is required (entry ${index + 1})`);
  }
  const trimmed = value.trim();
  if (!trimmed) {
    throw new Error(`Field "${field}" cannot be empty (entry ${index + 1})`);
  }
  return trimmed;
};

const deriveDomain = (url, index) => {
  try {
    return new URL(url).hostname.toLowerCase();
  } catch {
    throw new Error(`Invalid URL "${url}" (entry ${index + 1})`);
  }
};

const normalizeSource = (source, index) => {
  const name = ensureString(source.name, 'name', index);
  const url = ensureString(source.url, 'url', index);
  const category = ensureString(source.category, 'category', index).toUpperCase();
  const domain = (source.domain ? source.domain.trim() : '') || deriveDomain(url, index);
  const jurisdiction = (source.jurisdiction_code ?? 'GLOBAL').trim().toUpperCase();

  const authority = (source.authority_level ?? 'SECONDARY').trim().toUpperCase();
  if (!VALID_AUTHORITY_LEVELS.has(authority)) {
    throw new Error(`Invalid authority_level "${authority}" (entry ${index + 1})`);
  }

  const status = (source.status ?? 'ACTIVE').trim().toUpperCase();
  if (!VALID_STATUS.has(status)) {
    throw new Error(`Invalid status "${status}" (entry ${index + 1})`);
  }

  const priority = source.priority ?? 1;
  if (!Number.isInteger(priority) || priority < 1) {
    throw new Error(`Priority must be a positive integer (entry ${index + 1})`);
  }

  const notes = typeof source.notes === 'string' ? source.notes.trim() : null;

  return {
    name,
    url,
    domain,
    category,
    jurisdiction_code: jurisdiction,
    authority_level: authority,
    status,
    priority,
    tags: normalizeTags(source.tags),
    notes: notes ? notes : null,
  };
};

const normalizeDbRow = (row) => ({
  ...row,
  domain: row.domain.toLowerCase(),
  category: row.category.toUpperCase(),
  jurisdiction_code: row.jurisdiction_code.toUpperCase(),
  authority_level: row.authority_level.toUpperCase(),
  status: row.status.toUpperCase(),
  tags: normalizeTags(row.tags),
  notes: row.notes?.trim() || null,
});

const tagsEqual = (a, b) => {
  const left = a ?? [];
  const right = b ?? [];
  if (left.length !== right.length) return false;
  return left.every((value, index) => value === right[index]);
};

const recordsEqual = (desired, current) =>
  desired.name === current.name &&
  desired.url === current.url &&
  desired.domain === current.domain &&
  desired.category === current.category &&
  desired.jurisdiction_code === current.jurisdiction_code &&
  desired.authority_level === current.authority_level &&
  desired.status === current.status &&
  desired.priority === current.priority &&
  tagsEqual(desired.tags, current.tags) &&
  (desired.notes ?? null) === (current.notes ?? null);

const loadRegistry = async (filePath) => {
  const fileContents = await fs.readFile(filePath, 'utf8');
  const parsed = yaml.load(fileContents);
  if (!parsed || !Array.isArray(parsed.sources)) {
    throw new Error(`Invalid YAML structure: expected { sources: [] } in ${filePath}`);
  }
  return parsed.sources.map((source, index) => normalizeSource(source, index));
};

const insertSource = async (client, source, dryRun) => {
  if (dryRun) {
    console.log(`[dry-run] INSERT ${source.name}`);
    return;
  }
  await client.query(
    `INSERT INTO knowledge_web_sources
      (name, url, domain, category, jurisdiction_code, authority_level, status, priority, tags, notes)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
    [
      source.name,
      source.url,
      source.domain,
      source.category,
      source.jurisdiction_code,
      source.authority_level,
      source.status,
      source.priority,
      source.tags,
      source.notes,
    ],
  );
};

const updateSource = async (client, id, source, dryRun) => {
  if (dryRun) {
    console.log(`[dry-run] UPDATE ${source.name}`);
    return;
  }
  await client.query(
    `UPDATE knowledge_web_sources
      SET name = $1,
          url = $2,
          domain = $3,
          category = $4,
          jurisdiction_code = $5,
          authority_level = $6,
          status = $7,
          priority = $8,
          tags = $9,
          notes = $10,
          updated_at = NOW()
      WHERE id = $11`,
    [
      source.name,
      source.url,
      source.domain,
      source.category,
      source.jurisdiction_code,
      source.authority_level,
      source.status,
      source.priority,
      source.tags,
      source.notes,
      id,
    ],
  );
};

const main = async () => {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  const fileArg = args.find((arg) => arg.startsWith('--file='));
  const fileOverride = fileArg ? fileArg.split('=')[1] : undefined;

  const databaseUrl = process.env.DATABASE_URL ?? process.env.KNOWLEDGE_DATABASE_URL;
  if (!databaseUrl) {
    throw new Error('DATABASE_URL (or KNOWLEDGE_DATABASE_URL) must be set');
  }

  const yamlPath = path.resolve(
    process.cwd(),
    fileOverride ?? process.env.KNOWLEDGE_SOURCES_FILE ?? 'config/knowledge_web_sources.yaml',
  );
  console.log(`Loading registry from ${yamlPath}`);

  const registry = await loadRegistry(yamlPath);
  console.log(`Discovered ${registry.length} sources in YAML`);

  const client = new Client({ connectionString: databaseUrl });
  await client.connect();

  try {
    const existingResult = await client.query(
      'SELECT id, name, url, domain, category, jurisdiction_code, authority_level, status, priority, tags, notes FROM knowledge_web_sources',
    );
    const existing = existingResult.rows.map(normalizeDbRow);
    const existingByUrl = new Map(existing.map((row) => [row.url, row]));
    const seenUrls = new Set();

    const inserts = [];
    const updates = [];

    for (const source of registry) {
      const current = existingByUrl.get(source.url);
      seenUrls.add(source.url);
      if (!current) {
        inserts.push(source);
        continue;
      }
      if (!recordsEqual(source, current)) {
        updates.push({ id: current.id, source });
      }
    }

    const missing = existing.filter((row) => !seenUrls.has(row.url));

    if (inserts.length === 0 && updates.length === 0) {
      console.log('All sources already up to date.');
    } else {
      console.log(
        `Preparing to insert ${inserts.length} and update ${updates.length} sources${dryRun ? ' (dry run)' : ''}`,
      );
    }

    for (const source of inserts) {
      await insertSource(client, source, dryRun);
    }
    for (const { id, source } of updates) {
      await updateSource(client, id, source, dryRun);
    }

    if (missing.length > 0) {
      console.warn(`Warning: ${missing.length} sources exist in DB but not in YAML. They were left untouched.`);
    }

    console.log(
      `Sync complete: ${inserts.length} inserted, ${updates.length} updated, ${
        registry.length - inserts.length - updates.length
      } unchanged.`,
    );
  } finally {
    await client.end();
  }
};

main().catch((error) => {
  console.error('Failed to sync knowledge web sources from YAML');
  console.error(error);
  process.exit(1);
});
