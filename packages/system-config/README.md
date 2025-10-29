# @prisma-glow/system-config

Centralized configuration management for Prisma Glow's `config/system.yaml`.

## Overview

This package provides a type-safe, cached configuration loader for reading and accessing settings from `config/system.yaml`. It's used across all Node.js services (gateway, RAG, agent, analytics) to ensure consistent configuration access.

## Features

- **Type-Safe Accessors**: Strongly-typed functions for each config section
- **In-Memory Caching**: 60-second cache for performance
- **Environment Override**: Support for `SYSTEM_CONFIG_PATH` environment variable
- **Validation**: Schema validation on load
- **Error Handling**: Graceful fallback for missing configs

## Installation

Workspace package - installed automatically with:

```bash
pnpm install
```

## Usage

### Import Configuration Helpers

```typescript
import {
  getGoogleDriveSettings,
  getUrlSourceSettings,
  getBeforeAskingSequence,
  getSystemConfig
} from '@prisma-glow/system-config';
```

### Access Google Drive Settings

```typescript
const driveSettings = getGoogleDriveSettings();

console.log(driveSettings.folderId);        // Root folder ID
console.log(driveSettings.checkInterval);   // Sync interval in seconds
console.log(driveSettings.batchSize);       // Documents per batch
```

### Access URL Source Settings

```typescript
const urlSettings = getUrlSourceSettings();

console.log(urlSettings.maxConcurrent);     // Max concurrent fetches
console.log(urlSettings.timeout);           // Request timeout
console.log(urlSettings.userAgent);         // User agent string
```

### Access Before-Asking Sequence

```typescript
const sequence = getBeforeAskingSequence();

console.log(sequence);
// [
//   "Check the knowledge base",
//   "Review recent documents",
//   "Consider organizational context"
// ]
```

### Access Full Configuration

```typescript
const config = getSystemConfig();

console.log(config.autonomy);               // Autonomy settings
console.log(config.rlsEnforcement);         // RLS policies
console.log(config.agent);                  // Agent config
```

## Configuration File

The configuration is read from `config/system.yaml`:

```yaml
# config/system.yaml
autonomy:
  enabled: true
  maxTasksPerRun: 10
  approvalRequired: true

googleDrive:
  folderId: "root-folder-id"
  checkInterval: 3600
  batchSize: 50

urlSources:
  maxConcurrent: 5
  timeout: 30000
  userAgent: "Prisma-Glow/1.0"

agent:
  model: "gpt-4"
  temperature: 0.7
  maxTokens: 2000
```

## Environment Override

Override the config file path with `SYSTEM_CONFIG_PATH`:

```bash
# Use a different config file
export SYSTEM_CONFIG_PATH=/path/to/custom/system.yaml

# Or point to a directory containing system.yaml
export SYSTEM_CONFIG_PATH=/path/to/config/dir
```

## Caching Behavior

Configuration is cached for **60 seconds** to avoid repeated file system reads:

```typescript
// First call - reads from disk
const config1 = getSystemConfig();

// Within 60 seconds - uses cache
const config2 = getSystemConfig();

// After 60 seconds - reads from disk again
setTimeout(() => {
  const config3 = getSystemConfig();
}, 61000);
```

**Note**: Cache is per-process. If you need to force a reload, restart the service.

## Type Definitions

```typescript
interface SystemConfig {
  autonomy: {
    enabled: boolean;
    maxTasksPerRun: number;
    approvalRequired: boolean;
  };
  googleDrive: {
    folderId: string;
    checkInterval: number;
    batchSize: number;
  };
  urlSources: {
    maxConcurrent: number;
    timeout: number;
    userAgent: string;
  };
  agent: {
    model: string;
    temperature: number;
    maxTokens: number;
  };
  rlsEnforcement: {
    enabled: boolean;
    mode: 'strict' | 'permissive';
  };
  beforeAskingSequence: string[];
}
```

## Error Handling

The loader handles missing or invalid configs gracefully:

```typescript
try {
  const config = getSystemConfig();
} catch (error) {
  console.error('Failed to load config:', error);
  // Fallback to defaults or fail gracefully
}
```

**Common Errors**:
- `ENOENT`: Config file not found (check `SYSTEM_CONFIG_PATH`)
- `YAML parse error`: Invalid YAML syntax
- `Validation error`: Config doesn't match expected schema

## Development

### Build

```bash
pnpm --filter @prisma-glow/system-config build
```

### Test

```bash
pnpm --filter @prisma-glow/system-config test
```

### Watch Mode

```bash
pnpm --filter @prisma-glow/system-config build --watch
```

## Integration with Services

### Gateway

```typescript
// apps/gateway/src/server.ts
import { getSystemConfig } from '@prisma-glow/system-config';

const config = getSystemConfig();
app.use(autonomyMiddleware(config.autonomy));
```

### RAG Service

```typescript
// services/rag/src/ingestion.ts
import { getGoogleDriveSettings } from '@prisma-glow/system-config';

const settings = getGoogleDriveSettings();
const poller = new DrivePoller(settings);
```

### Agent Service

```typescript
// agent/src/runner.ts
import { getBeforeAskingSequence } from '@prisma-glow/system-config';

const sequence = getBeforeAskingSequence();
const prompt = buildPrompt(sequence);
```

## Validation

Configuration is validated on load using a JSON schema:

```bash
# Validate config manually
pnpm run config:validate
```

This runs `scripts/config/validate-config.mjs` which:
1. Loads `config/system.yaml`
2. Validates against schema
3. Reports any errors

## Best Practices

### 1. Use Specific Accessors

```typescript
// ✅ Good - uses specific accessor
const driveSettings = getGoogleDriveSettings();

// ❌ Avoid - loads entire config
const config = getSystemConfig();
const driveSettings = config.googleDrive;
```

### 2. Cache at Module Level

```typescript
// ✅ Good - cache once at module load
const driveSettings = getGoogleDriveSettings();

export function syncDrive() {
  // Use cached settings
  fetchDriveFiles(driveSettings.folderId);
}
```

### 3. Document Config Requirements

```typescript
/**
 * Syncs Google Drive documents
 * 
 * @requires config.googleDrive.folderId - Root folder to sync
 * @requires config.googleDrive.batchSize - Docs per batch
 */
export async function syncGoogleDrive() {
  const settings = getGoogleDriveSettings();
  // ...
}
```

## Testing

### Mock Config in Tests

```typescript
import { jest } from '@jest/globals';

jest.mock('@prisma-glow/system-config', () => ({
  getGoogleDriveSettings: () => ({
    folderId: 'test-folder',
    checkInterval: 60,
    batchSize: 10
  })
}));
```

### Test with Custom Config

```bash
# Set custom config path for tests
export SYSTEM_CONFIG_PATH=./tests/fixtures/test-config.yaml

pnpm test
```

## Troubleshooting

### Config Not Loading

```bash
# Check config file exists
ls -la config/system.yaml

# Check environment override
echo $SYSTEM_CONFIG_PATH

# Validate YAML syntax
pnpm run config:validate
```

### Cache Issues

If config changes aren't reflected:

1. Wait 60 seconds for cache to expire
2. Or restart the service
3. Or use `SYSTEM_CONFIG_PATH` override

### Type Errors

If TypeScript complains about config types:

```bash
# Rebuild the package
pnpm --filter @prisma-glow/system-config build

# Check types
pnpm --filter @prisma-glow/system-config run tsc --noEmit
```

## Related Documentation

- [config/system.yaml](../../config/system.yaml) - Configuration file
- [Architecture Documentation](../../docs/architecture.md)
- [Gateway Service](../../apps/gateway/README.md)

## Maintainers

- **Owner**: Platform Team
- **Code Review**: Required for changes
- **Dependencies**: yaml package

---

**Last Updated**: 2025-10-29  
**Version**: 0.0.1
