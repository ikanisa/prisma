import { spawnSync } from 'node:child_process';

type EnvironmentName = 'staging' | 'production';

type EnvConfig = {
  vectorStoreId: string;
  model?: string;
  maxResults?: number;
  filters?: string;
  includeResults?: boolean;
};

type ConfigMap = Partial<Record<EnvironmentName, EnvConfig>>;

function assertGhCli(): void {
  const result = spawnSync('gh', ['--version'], { stdio: 'ignore' });
  if (result.status !== 0) {
    throw new Error(
      'GitHub CLI (gh) is required to publish secrets. Install it and authenticate with `gh auth login`.',
    );
  }
}

function parseBoolean(value: string | undefined): boolean | undefined {
  if (!value) return undefined;
  const normalised = value.trim().toLowerCase();
  if (['true', '1', 'yes', 'y', 'on'].includes(normalised)) return true;
  if (['false', '0', 'no', 'n', 'off'].includes(normalised)) return false;
  throw new Error(`Unable to parse boolean value "${value}"`);
}

function parseMaxResults(value: string | undefined): number | undefined {
  if (!value) return undefined;
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new Error('OPENAI_FILE_SEARCH_MAX_RESULTS must be a positive integer if provided.');
  }
  return parsed;
}

function parseFilters(value: string | undefined): string | undefined {
  if (!value) return undefined;
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  try {
    const parsed = JSON.parse(trimmed);
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      return JSON.stringify(parsed);
    }
  } catch (error) {
    throw new Error(
      `OPENAI_FILE_SEARCH_FILTERS must be valid JSON object when provided (${(error as Error).message}).`,
    );
  }
  throw new Error('OPENAI_FILE_SEARCH_FILTERS must be a JSON object when provided.');
}

function readConfigFromEnv(): ConfigMap {
  const stagingVectorStore = process.env.STAGING_OPENAI_FILE_SEARCH_VECTOR_STORE_ID?.trim();
  const productionVectorStore = process.env.PRODUCTION_OPENAI_FILE_SEARCH_VECTOR_STORE_ID?.trim();

  const config: ConfigMap = {};

  if (stagingVectorStore) {
    config.staging = {
      vectorStoreId: stagingVectorStore,
      model: process.env.STAGING_OPENAI_FILE_SEARCH_MODEL?.trim() || undefined,
      maxResults: parseMaxResults(process.env.STAGING_OPENAI_FILE_SEARCH_MAX_RESULTS),
      filters: parseFilters(process.env.STAGING_OPENAI_FILE_SEARCH_FILTERS),
      includeResults: parseBoolean(process.env.STAGING_OPENAI_FILE_SEARCH_INCLUDE_RESULTS),
    };
  }

  if (productionVectorStore) {
    config.production = {
      vectorStoreId: productionVectorStore,
      model: process.env.PRODUCTION_OPENAI_FILE_SEARCH_MODEL?.trim() || undefined,
      maxResults: parseMaxResults(process.env.PRODUCTION_OPENAI_FILE_SEARCH_MAX_RESULTS),
      filters: parseFilters(process.env.PRODUCTION_OPENAI_FILE_SEARCH_FILTERS),
      includeResults: parseBoolean(process.env.PRODUCTION_OPENAI_FILE_SEARCH_INCLUDE_RESULTS),
    };
  }

  if (!config.staging && !config.production) {
    throw new Error(
      'Set STAGING_OPENAI_FILE_SEARCH_VECTOR_STORE_ID and/or PRODUCTION_OPENAI_FILE_SEARCH_VECTOR_STORE_ID before running this script.',
    );
  }

  return config;
}

function setEnvironmentSecret(environment: EnvironmentName, name: string, value: string): void {
  const result = spawnSync(
    'gh',
    ['secret', 'set', name, '--env', environment, '--body', value],
    { stdio: 'inherit' },
  );

  if (result.status !== 0) {
    throw new Error(`Failed to set secret ${name} for environment ${environment}.`);
  }
}

function publishForEnvironment(environment: EnvironmentName, config: EnvConfig): void {
  console.warn(`\n🚀 Publishing OpenAI file search secrets for ${environment}...`);
  setEnvironmentSecret(environment, 'OPENAI_FILE_SEARCH_VECTOR_STORE_ID', config.vectorStoreId);

  if (config.model) {
    setEnvironmentSecret(environment, 'OPENAI_FILE_SEARCH_MODEL', config.model);
  }

  if (typeof config.maxResults === 'number') {
    setEnvironmentSecret(environment, 'OPENAI_FILE_SEARCH_MAX_RESULTS', String(config.maxResults));
  }

  if (typeof config.includeResults === 'boolean') {
    setEnvironmentSecret(environment, 'OPENAI_FILE_SEARCH_INCLUDE_RESULTS', config.includeResults ? 'true' : 'false');
  }

  if (config.filters) {
    setEnvironmentSecret(environment, 'OPENAI_FILE_SEARCH_FILTERS', config.filters);
  }

  console.warn(`✅ Secrets updated for ${environment}.`);
}

function main(): void {
  try {
    assertGhCli();
    const config = readConfigFromEnv();
    if (config.staging) {
      publishForEnvironment('staging', config.staging);
    }
    if (config.production) {
      publishForEnvironment('production', config.production);
    }
    console.warn('\nAll requested environments updated successfully.');
  } catch (error) {
    console.error('\n❌ Failed to publish OpenAI file search secrets');
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  }
}

main();
