#!/usr/bin/env node

import { readFile, stat } from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { parse } from 'yaml';

const AUTONOMY_LEVELS = ['L0', 'L1', 'L2', 'L3'];
const DEFAULT_AUTONOMY_LEVEL = 'L2';
const ORG_ROLES = ['SYSTEM_ADMIN', 'PARTNER', 'MANAGER', 'EMPLOYEE', 'CLIENT', 'READONLY', 'SERVICE_ACCOUNT', 'EQR'];

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJECT_ROOT = path.resolve(__dirname, '..', '..');
const DEFAULT_CONFIG_PATH = path.join(PROJECT_ROOT, 'config', 'system.yaml');

const normaliseLevel = (value) => {
  if (typeof value !== 'string') return undefined;
  const key = value.trim().toUpperCase();
  return AUTONOMY_LEVELS.includes(key) ? key : undefined;
};

const normaliseRole = (value) => {
  if (typeof value !== 'string') return undefined;
  const key = value.trim().toUpperCase();
  return ORG_ROLES.includes(key) ? key : undefined;
};

function validateConfig(config) {
  const errors = [];
  const autonomy = config.autonomy ?? {};

  if (autonomy.default_level) {
    if (!normaliseLevel(autonomy.default_level)) {
      errors.push(`autonomy.default_level must be one of ${AUTONOMY_LEVELS.join(', ')}.`);
    }
  }

  if (autonomy.levels && typeof autonomy.levels === 'object') {
    for (const [key, label] of Object.entries(autonomy.levels)) {
      if (!normaliseLevel(key)) {
        errors.push(`autonomy.levels contains invalid key "${key}". Expected ${AUTONOMY_LEVELS.join(', ')}.`);
      } else if (typeof label !== 'string' || label.trim().length === 0) {
        errors.push(`autonomy.levels.${key} must be a non-empty string.`);
      }
    }
  }

  const allowedJobs = autonomy.autopilot?.allowed_jobs;
  if (allowedJobs && typeof allowedJobs === 'object') {
    for (const [key, value] of Object.entries(allowedJobs)) {
      if (!normaliseLevel(key)) {
        errors.push(`autonomy.autopilot.allowed_jobs has invalid level "${key}".`);
        continue;
      }
      const entries = Array.isArray(value) ? value : [value];
      const invalid = entries.find((item) => typeof item !== 'string' || item.trim().length === 0);
      if (invalid) {
        errors.push(`autonomy.autopilot.allowed_jobs.${key} contains non-string or empty entries.`);
      }
    }
  }

  const rbac = config.rbac ?? {};
  if (Array.isArray(rbac.roles)) {
    for (const role of rbac.roles) {
      if (!normaliseRole(role)) {
        errors.push(`rbac.roles contains unknown role "${role}". Expected ${ORG_ROLES.join(', ')}.`);
      }
    }
  }

  if (rbac.permissions && typeof rbac.permissions === 'object') {
    for (const [permission, value] of Object.entries(rbac.permissions)) {
      if (!normaliseRole(value)) {
        errors.push(`rbac.permissions["${permission}"] must reference a known role (got "${value}").`);
      }
    }
  }

  const releaseAutonomy = config.release_controls?.environment?.autonomy;
  if (releaseAutonomy) {
    if (releaseAutonomy.minimumLevel && !normaliseLevel(releaseAutonomy.minimumLevel)) {
      errors.push(
        `release_controls.environment.autonomy.minimumLevel must be a valid autonomy level (${AUTONOMY_LEVELS.join(', ')}).`,
      );
    }
    if (Array.isArray(releaseAutonomy.criticalRoles)) {
      for (const role of releaseAutonomy.criticalRoles) {
        if (!normaliseRole(role)) {
          errors.push(
            `release_controls.environment.autonomy.criticalRoles includes unknown role "${role}". Expected ${ORG_ROLES.join(', ')}.`,
          );
        }
      }
    }
  }

  const levels = autonomy.levels ?? {};
  const declaredDefault = normaliseLevel(autonomy.default_level) ?? DEFAULT_AUTONOMY_LEVEL;
  if (declaredDefault && !(declaredDefault in levels)) {
    errors.push(`autonomy.levels is missing an entry for default_level "${declaredDefault}".`);
  }

  return errors;
}

async function resolveConfigPath() {
  const override = process.env.SYSTEM_CONFIG_PATH;
  if (!override) {
    return DEFAULT_CONFIG_PATH;
  }
  const candidate = path.resolve(override);
  try {
    const stats = await stat(candidate);
    if (stats.isDirectory()) {
      return path.join(candidate, 'system.yaml');
    }
  } catch {
    if (!path.extname(candidate)) {
      return path.join(candidate, 'system.yaml');
    }
    return candidate;
  }
  return candidate;
}

async function main() {
  try {
    const configPath = await resolveConfigPath();
    const raw = await readFile(configPath, 'utf8');
    const parsed = parse(raw) ?? {};
    const errors = validateConfig(parsed);
    if (errors.length > 0) {
      console.error(`❌ system.yaml validation failed (${configPath}):`);
      for (const error of errors) {
        console.error(`  • ${error}`);
      }
      process.exitCode = 1;
      return;
    }
    process.stdout.write(`✅ system.yaml validation passed (${configPath}).\n`);
  } catch (error) {
    console.error('❌ Failed to validate config/system.yaml');
    console.error(error);
    process.exitCode = 1;
  }
}

await main();
