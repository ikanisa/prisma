#!/usr/bin/env tsx
/**
 * Environment validation script
 * Validates all required environment variables are set before deployment
 */

import { readFileSync } from 'fs';
import { join } from 'path';

interface EnvRequirement {
  name: string;
  required: boolean;
  description: string;
  validate?: (value: string) => boolean | string;
}

const ENV_REQUIREMENTS: EnvRequirement[] = [
  // Supabase
  {
    name: 'NEXT_PUBLIC_SUPABASE_URL',
    required: true,
    description: 'Supabase project URL',
    validate: (v) => v.startsWith('https://') || 'Must be HTTPS URL',
  },
  {
    name: 'NEXT_PUBLIC_SUPABASE_ANON_KEY',
    required: true,
    description: 'Supabase anonymous key',
    validate: (v) => v.length > 20 || 'Key seems too short',
  },
  {
    name: 'SUPABASE_SERVICE_ROLE_KEY',
    required: true,
    description: 'Supabase service role key (server-side only)',
    validate: (v) => v.length > 20 || 'Key seems too short',
  },
  {
    name: 'SUPABASE_JWT_SECRET',
    required: true,
    description: 'Supabase JWT secret',
  },
  // Database
  {
    name: 'DATABASE_URL',
    required: true,
    description: 'PostgreSQL connection string',
    validate: (v) => v.startsWith('postgresql://') || 'Must be PostgreSQL connection string',
  },
  // Optional but recommended
  {
    name: 'REDIS_URL',
    required: false,
    description: 'Redis connection URL for caching',
    validate: (v) => v.startsWith('redis://') || 'Must be Redis connection string',
  },
  {
    name: 'SENTRY_DSN',
    required: false,
    description: 'Sentry DSN for error tracking',
  },
  {
    name: 'OPENAI_API_KEY',
    required: false,
    description: 'OpenAI API key for AI features',
  },
];

function validateEnvironment(env: Record<string, string | undefined>): {
  valid: boolean;
  errors: string[];
  warnings: string[];
} {
  const errors: string[] = [];
  const warnings: string[] = [];

  for (const req of ENV_REQUIREMENTS) {
    const value = env[req.name];

    if (req.required && !value) {
      errors.push(`Missing required variable: ${req.name} - ${req.description}`);
      continue;
    }

    if (value && req.validate) {
      const validation = req.validate(value);
      if (validation !== true) {
        errors.push(
          `Invalid ${req.name}: ${typeof validation === 'string' ? validation : 'Validation failed'}`
        );
      }
    }

    if (!req.required && !value) {
      warnings.push(`Optional variable not set: ${req.name} - ${req.description}`);
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

function main() {
  const envFile = process.env.ENV_FILE || '.env.local';
  const envPath = join(process.cwd(), envFile);

  console.log(`Validating environment from: ${envPath}\n`);

  let env: Record<string, string | undefined> = {};

  try {
    const content = readFileSync(envPath, 'utf-8');
    const lines = content.split('\n');

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;

      const [key, ...valueParts] = trimmed.split('=');
      if (key && valueParts.length > 0) {
        const value = valueParts.join('=').replace(/^["']|["']$/g, '');
        env[key.trim()] = value.trim();
      }
    }
  } catch (error: unknown) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      console.warn(`⚠️  Environment file not found: ${envPath}`);
      console.warn('   Validating against process.env only...\n');
    } else {
      console.error(`Failed to read ${envPath}:`, error);
      process.exit(1);
    }
  }

  // Also check process.env for runtime variables
  env = { ...env, ...process.env };

  const result = validateEnvironment(env);

  if (result.errors.length > 0) {
    console.error('❌ Environment validation failed:\n');
    result.errors.forEach((err) => console.error(`  - ${err}`));
    console.error('\nPlease fix the errors above before deploying.');
    process.exit(1);
  }

  if (result.warnings.length > 0) {
    console.warn('⚠️  Warnings:\n');
    result.warnings.forEach((warn) => console.warn(`  - ${warn}`));
    console.log('');
  }

  console.log('✅ Environment validation passed!\n');
  console.log(`Validated ${ENV_REQUIREMENTS.length} environment variables.`);
  process.exit(0);
}

// Run if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export { validateEnvironment, ENV_REQUIREMENTS };

