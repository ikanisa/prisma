#!/usr/bin/env node
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseAllDocuments } from 'yaml';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const repoRoot = join(__dirname, '..');
const catalogPath = join(repoRoot, 'packages', 'dev-portal', 'catalog-info.yaml');

function readCatalog(path) {
  try {
    const raw = readFileSync(path, 'utf8');
    return parseAllDocuments(raw).map((doc) => doc.toJS({ merge: true }));
  } catch (error) {
    throw new Error(`Failed to read catalog descriptor at ${path}: ${error.message}`);
  }
}

function listServiceDirectories(root) {
  return readdirSync(root)
    .map((name) => ({ name, path: join(root, name) }))
    .filter(({ path }) => {
      try {
        return statSync(path).isDirectory();
      } catch {
        return false;
      }
    })
    .map(({ name }) => name)
    .filter((name) => !name.startsWith('.'))
    .sort();
}

function validateOwnership(components, serviceDirs) {
  const errors = [];
  const componentsByPath = new Map();

  const ownerPattern = /^(group|user|component|resource):[A-Za-z0-9_.-]+$/;

  for (const component of components) {
    const metadata = component?.metadata ?? {};
    const spec = component?.spec ?? {};
    const name = metadata.name ?? '<unknown>';
    const owner = typeof spec.owner === 'string' ? spec.owner.trim() : '';
    const servicePath = metadata.annotations?.['prisma.io/service-path'];

    if (!owner) {
      errors.push(`Component ${name} is missing spec.owner metadata.`);
    } else if (!ownerPattern.test(owner)) {
      errors.push(`Component ${name} has an invalid owner reference: ${owner}`);
    }

    if (servicePath) {
      const normalized = servicePath.replace(/^\.\/?/, '');
      if (componentsByPath.has(normalized)) {
        const existing = componentsByPath.get(normalized);
        errors.push(
          `Multiple catalog components reference the same service path (${normalized}): ${existing} and ${name}.`,
        );
      } else {
        componentsByPath.set(normalized, name);
      }
    } else {
      errors.push(`Component ${name} must declare prisma.io/service-path annotation.`);
    }
  }

  const missing = serviceDirs
    .map((dir) => `services/${dir}`)
    .filter((dir) => !componentsByPath.has(dir));

  if (missing.length > 0) {
    errors.push(
      `Service directories without catalog coverage detected: ${missing.join(', ')}. Add Component definitions to packages/dev-portal/catalog-info.yaml.`,
    );
  }

  return errors;
}

function main() {
  const serviceRoot = join(repoRoot, 'services');
  const catalog = readCatalog(catalogPath);

  const components = catalog.filter(
    (entity) => entity?.kind === 'Component' && entity?.spec?.type === 'service',
  );

  const serviceDirs = listServiceDirectories(serviceRoot);

  const errors = validateOwnership(components, serviceDirs);

  if (errors.length > 0) {
    console.error('Service ownership check failed:\n - ' + errors.join('\n - '));
    process.exit(1);
  }

  console.log(
    `Service ownership check passed: ${components.length} services documented, covering ${serviceDirs.length} directories.`,
  );
}

main();
