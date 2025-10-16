import os from 'node:os';
import path from 'node:path';
import { promises as fs } from 'node:fs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const tempDirs: string[] = [];

async function createTempConfig(contents: string, filename = 'system.yaml'): Promise<{ dir: string; file: string }> {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'system-config-'));
  const file = path.join(dir, filename);
  await fs.writeFile(file, contents, 'utf8');
  tempDirs.push(dir);
  return { dir, file };
}

async function importSystemConfig() {
  const module = await import('../services/rag/system-config.ts');
  module.__clearSystemConfigCache();
  return module;
}

beforeEach(() => {
  vi.resetModules();
  delete process.env.SYSTEM_CONFIG_PATH;
});

afterEach(async () => {
  delete process.env.SYSTEM_CONFIG_PATH;
  for (const dir of tempDirs.splice(0)) {
    await fs.rm(dir, { recursive: true, force: true });
  }
});

describe('services/rag/system-config', () => {
  it('reads configuration from an override file path', async () => {
    const { file } = await createTempConfig(
      `
      data_sources:
        google_drive:
          enabled: true
          folder_mapping_pattern: "override/{orgId}"
      `,
      'custom-config.yaml',
    );
    process.env.SYSTEM_CONFIG_PATH = file;

    const module = await importSystemConfig();
    const drive = await module.getGoogleDriveSettings();
    expect(drive.enabled).toBe(true);
    expect(drive.folderMappingPattern).toBe('override/{orgId}');
  });

  it('supports directory overrides by appending system.yaml', async () => {
    const { dir } = await createTempConfig(
      `
      knowledge:
        retrieval:
          policy:
            before_asking_user: [drive_first]
      `,
    );
    process.env.SYSTEM_CONFIG_PATH = dir;

    const module = await importSystemConfig();
    const beforeAsking = await module.getBeforeAskingSequence();
    expect(beforeAsking).toEqual(['drive_first']);
    const resolvedPath = await module.__getResolvedConfigPath();
    expect(resolvedPath).toBe(path.join(dir, 'system.yaml'));
  });

  it('reads modern datasources aliases and rag fallbacks', async () => {
    const { file } = await createTempConfig(
      `
      datasources:
        google_drive:
          enabled: yes
        url_sources:
          whitelist: [finance.example.com, news.example.com]
          policy:
            obey_robots: false
            max_depth: 3
            cache_ttl_minutes: 45
      rag:
        before_asking_user: [google_drive, documents]
      `,
    );
    process.env.SYSTEM_CONFIG_PATH = file;

    const module = await importSystemConfig();
    const drive = await module.getGoogleDriveSettings();
    expect(drive.enabled).toBe(true);
    const urls = await module.getUrlSourceSettings();
    expect(urls.allowedDomains).toEqual(['finance.example.com', 'news.example.com']);
    expect(urls.fetchPolicy).toEqual({ obeyRobots: false, maxDepth: 3, cacheTtlMinutes: 45 });
    const before = await module.getBeforeAskingSequence();
    expect(before).toEqual(['google_drive', 'documents']);
  });

  it('merges configured roles with the default hierarchy', async () => {
    const { file } = await createTempConfig(
      `
      rbac:
        roles: [manager, partner]
      `,
    );
    process.env.SYSTEM_CONFIG_PATH = file;

    const module = await importSystemConfig();
    const roles = await module.getRoleHierarchy();
    expect(roles).toEqual([
      'MANAGER',
      'PARTNER',
      'SERVICE_ACCOUNT',
      'READONLY',
      'CLIENT',
      'EMPLOYEE',
      'EQR',
      'SYSTEM_ADMIN',
    ]);
  });
});
