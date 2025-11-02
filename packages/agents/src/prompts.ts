import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';
import path from 'node:path';

interface PromptManifestEntry {
  id: string;
  path: string;
  checksum: string;
  description?: string;
}

interface PromptManifest {
  version: string;
  checksumAlgorithm: 'sha256';
  prompts: PromptManifestEntry[];
}

export interface PromptRecord extends PromptManifestEntry {
  contents: string;
}

const require = createRequire(import.meta.url);
const manifestPath = require.resolve('../prompts/manifest.json');
function deepFreeze<T>(value: T): T {
  if (value === null || typeof value !== 'object') {
    return value;
  }
  if (Array.isArray(value)) {
    for (const item of value) {
      deepFreeze(item);
    }
    return Object.freeze(value);
  }
  for (const key of Object.keys(value)) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    deepFreeze((value as Record<string, any>)[key]);
  }
  return Object.freeze(value);
}

const manifest: PromptManifest = deepFreeze(JSON.parse(readFileSync(manifestPath, 'utf8')));
const promptDirectory = path.dirname(manifestPath);

function computeChecksum(contents: string): string {
  const hash = createHash('sha256');
  hash.update(contents, 'utf8');
  return hash.digest('hex');
}

function resolvePromptPath(entry: PromptManifestEntry): string {
  return path.resolve(promptDirectory, entry.path);
}

function cloneManifest(manifestToClone: PromptManifest): PromptManifest {
  return {
    ...manifestToClone,
    prompts: manifestToClone.prompts.map((prompt) => ({ ...prompt })),
  };
}

export function listPromptManifest(): PromptManifest {
  return cloneManifest(manifest);
}

export function loadPromptById(id: string): PromptRecord {
  const entry = manifest.prompts.find((prompt) => prompt.id === id);
  if (!entry) {
    throw new Error(`Prompt with id "${id}" was not found in the manifest.`);
  }
  return loadPrompt(entry);
}

export function loadPrompt(entry: PromptManifestEntry): PromptRecord {
  const filePath = resolvePromptPath(entry);
  const contents = readFileSync(filePath, 'utf8');
  const checksum = computeChecksum(contents);
  if (checksum !== entry.checksum) {
    throw new Error(
      `Checksum mismatch for prompt ${entry.id}. Expected ${entry.checksum} but calculated ${checksum}.`,
    );
  }
  return { ...entry, contents };
}

export interface PromptChecksumFailure {
  id: string;
  expected: string;
  actual: string;
  path: string;
}

export function verifyPromptChecksums(): PromptChecksumFailure[] {
  const failures: PromptChecksumFailure[] = [];
  for (const entry of manifest.prompts) {
    const filePath = resolvePromptPath(entry);
    const contents = readFileSync(filePath, 'utf8');
    const checksum = computeChecksum(contents);
    if (checksum !== entry.checksum) {
      failures.push({
        id: entry.id,
        expected: entry.checksum,
        actual: checksum,
        path: filePath,
      });
    }
  }
  return failures;
}
