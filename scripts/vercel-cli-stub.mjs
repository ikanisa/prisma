#!/usr/bin/env node
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';

const [, , command, ...rest] = process.argv;

const log = (message) => {
  console.log(`[vercel-stub] ${message}`);
};

if (!command) {
  console.error('[vercel-stub] No command provided. Expected `pull` or `build`.');
  process.exit(1);
}

const ensureDir = (filePath) => {
  mkdirSync(dirname(filePath), { recursive: true });
};

switch (command) {
  case 'pull': {
    const environment = rest.find((arg) => arg.startsWith('--environment='))?.split('=')[1] ?? 'preview';
    const outputPath = join('.vercel', `pulled-${environment}.json`);
    ensureDir(outputPath);
    writeFileSync(
      outputPath,
      JSON.stringify(
        {
          environment,
          orgId: process.env.VERCEL_ORG_ID,
          projectId: process.env.VERCEL_PROJECT_ID,
          pulledAt: new Date().toISOString(),
        },
        null,
        2,
      ),
      'utf-8',
    );
    log(`Simulated pull for ${environment} environment at ${outputPath}`);
    break;
  }
  case 'build': {
    const outputPath = join('.vercel', 'build-stub.txt');
    ensureDir(outputPath);
    writeFileSync(
      outputPath,
      `Build simulated for project ${process.env.VERCEL_PROJECT_ID} on ${new Date().toISOString()}\n`,
      'utf-8',
    );
    log('Simulated build complete.');
    break;
  }
  default: {
    console.error(`[vercel-stub] Unsupported command: ${command}`);
    process.exit(1);
  }
}
