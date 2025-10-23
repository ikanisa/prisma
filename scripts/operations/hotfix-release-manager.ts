#!/usr/bin/env ts-node

import { spawnSync, SpawnSyncOptions } from 'node:child_process';
import { existsSync } from 'node:fs';
import { promises as fs } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const repoRoot = resolve(__dirname, '..', '..');

const DEFAULT_STATUS_PATH = resolve(repoRoot, 'docs/OPERATIONS/hotfix-status.json');

type BooleanLike = string | boolean | undefined;

type HotfixStatus = {
  branch: {
    name: string | null;
    base: string;
    created: boolean;
    pushed: boolean;
    createdAt: string | null;
    milestoneTags: Array<{ name: string; ref: string; createdAt: string }>;
  };
  observability: {
    sentryThresholdConfigured: boolean;
    otelThresholdConfigured: boolean;
    notes: string | null;
  };
  uat: {
    scheduled: boolean;
    scheduledAt: string | null;
    feedbackLogged: boolean;
  };
  decommission: {
    mergedToMain: boolean;
    legacyBranchesRemoved: boolean;
    documentationUpdated: boolean;
  };
  lastUpdated: string | null;
};

const DEFAULT_STATUS: HotfixStatus = {
  branch: {
    name: null,
    base: 'origin/main',
    created: false,
    pushed: false,
    createdAt: null,
    milestoneTags: [],
  },
  observability: {
    sentryThresholdConfigured: false,
    otelThresholdConfigured: false,
    notes: null,
  },
  uat: {
    scheduled: false,
    scheduledAt: null,
    feedbackLogged: false,
  },
  decommission: {
    mergedToMain: false,
    legacyBranchesRemoved: false,
    documentationUpdated: false,
  },
  lastUpdated: null,
};

type Options = Record<string, string | boolean | string[] | undefined>;

type CommandHandler = (options: Options) => Promise<void> | void;

const commandHandlers: Record<string, CommandHandler> = {
  init: handleInit,
  tag: handleTag,
  observability: handleObservability,
  uat: handleUat,
  complete: handleComplete,
  status: handleStatus,
};

(async function main() {
  const argv = process.argv.slice(2);
  if (argv.length === 0) {
    printHelp();
    process.exit(1);
  }

  const command = argv.shift()!;
  const handler = commandHandlers[command];

  if (!handler) {
    writeErr(`Unknown command: ${command}`);
    printHelp();
    process.exit(1);
  }

  const options = parseOptions(argv);

  try {
    await handler(options);
  } catch (error) {
    if (error instanceof Error) {
      writeErr(`\nError: ${error.message}`);
    } else {
      writeErr(`\nUnexpected error: ${String(error)}`);
    }
    process.exit(1);
  }
})();

function printHelp() {
  writeOut(`Hotfix Release Manager\n\nCommands:\n  init [--branch <name>] [--base <ref>] [--status-file <path>] [--no-push]\n  tag --name <tag> [--ref <commit>] [--status-file <path>] [--branch <name>] [--message <message>] [--no-push]\n  observability [--sentry <boolean>] [--otel <boolean>] [--notes <text>] [--status-file <path>]\n  uat [--scheduled <ISO-8601>] [--feedback <boolean>] [--status-file <path>]\n  complete [--merged <boolean>] [--legacy <boolean>] [--docs <boolean>] [--status-file <path>]\n  status [--status-file <path>] [--write <markdownPath>]\n`);
}

function writeOut(message: string) {
  process.stdout.write(`${message}\n`);
}

function writeErr(message: string) {
  process.stderr.write(`${message}\n`);
}

function parseOptions(argv: string[]): Options {
  const result: Options = {};
  let i = 0;
  while (i < argv.length) {
    const token = argv[i];
    if (!token.startsWith('--')) {
      result._ = [...((result._ as string[]) ?? []), token];
      i += 1;
      continue;
    }

    const key = token.slice(2);
    const next = argv[i + 1];
    if (next === undefined || next.startsWith('--')) {
      result[key] = true;
      i += 1;
      continue;
    }

    result[key] = next;
    i += 2;
  }
  return result;
}

function cloneDefaultStatus(): HotfixStatus {
  return JSON.parse(JSON.stringify(DEFAULT_STATUS));
}

async function readStatus(statusFile: string): Promise<HotfixStatus> {
  if (!existsSync(statusFile)) {
    return cloneDefaultStatus();
  }

  const raw = await fs.readFile(statusFile, 'utf-8');
  try {
    const parsed = JSON.parse(raw) as Partial<HotfixStatus>;
    return {
      ...cloneDefaultStatus(),
      ...parsed,
      branch: {
        ...cloneDefaultStatus().branch,
        ...parsed.branch,
        milestoneTags: parsed.branch?.milestoneTags ?? [],
      },
      observability: {
        ...cloneDefaultStatus().observability,
        ...parsed.observability,
      },
      uat: {
        ...cloneDefaultStatus().uat,
        ...parsed.uat,
      },
      decommission: {
        ...cloneDefaultStatus().decommission,
        ...parsed.decommission,
      },
    };
  } catch (error) {
    throw new Error(`Failed to parse status file at ${statusFile}: ${(error as Error).message}`);
  }
}

async function writeStatus(statusFile: string, status: HotfixStatus) {
  const updated = { ...status, lastUpdated: new Date().toISOString() };
  await fs.mkdir(dirname(statusFile), { recursive: true });
  await fs.writeFile(statusFile, JSON.stringify(updated, null, 2) + '\n', 'utf-8');
}

function toBoolean(value: BooleanLike): boolean | undefined {
  if (value === undefined) {
    return undefined;
  }
  if (value === true) {
    return true;
  }
  if (value === false) {
    return false;
  }
  const normalized = String(value).toLowerCase();
  if (['true', '1', 'yes', 'y', 'done', 'complete'].includes(normalized)) {
    return true;
  }
  if (['false', '0', 'no', 'n', 'pending', 'todo'].includes(normalized)) {
    return false;
  }
  return undefined;
}

function runGit(args: string[], options: SpawnSyncOptions = {}) {
  const result = spawnSync('git', args, {
    stdio: 'inherit',
    ...options,
  });

  if (result.status !== 0) {
    throw new Error(`Git command failed: git ${args.join(' ')}`);
  }
}

function ensureCleanWorkingTree() {
  const result = spawnSync('git', ['status', '--porcelain'], { encoding: 'utf-8' });
  if (result.status !== 0) {
    throw new Error('Unable to determine git working tree status.');
  }
  if (result.stdout.trim().length > 0) {
    throw new Error('Working tree has uncommitted changes. Please commit or stash before running this command.');
  }
}

function resolveStatusFile(options: Options): string {
  const provided = options['status-file'];
  if (typeof provided === 'string' && provided.length > 0) {
    return resolve(provided);
  }
  return DEFAULT_STATUS_PATH;
}

async function handleInit(options: Options) {
  const statusFile = resolveStatusFile(options);
  const status = await readStatus(statusFile);

  const branchName = typeof options.branch === 'string' && options.branch.length > 0
    ? options.branch
    : `release/hotfix-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}`;

  const baseRef = typeof options.base === 'string' && options.base.length > 0 ? options.base : status.branch.base ?? 'origin/main';
  const push = options['no-push'] ? false : true;

  ensureCleanWorkingTree();

  runGit(['fetch', 'origin']);
  runGit(['checkout', '-B', branchName, baseRef]);

  if (push) {
    runGit(['push', '-u', 'origin', branchName]);
  }

  const now = new Date().toISOString();
  status.branch = {
    ...status.branch,
    name: branchName,
    base: baseRef,
    created: true,
    pushed: push,
    createdAt: now,
    milestoneTags: status.branch.milestoneTags ?? [],
  };

  await writeStatus(statusFile, status);
  writeOut(`\nHotfix branch ${branchName} created from ${baseRef}. Status recorded at ${statusFile}.`);
}

async function handleTag(options: Options) {
  const statusFile = resolveStatusFile(options);
  const status = await readStatus(statusFile);

  const branchName = typeof options.branch === 'string' && options.branch.length > 0
    ? options.branch
    : status.branch.name;

  if (!branchName) {
    throw new Error('Hotfix branch name is unknown. Provide --branch or run init first.');
  }

  const tagNameInput = typeof options.name === 'string' ? options.name : undefined;
  if (!tagNameInput) {
    throw new Error('Tag name is required. Pass --name <identifier>.');
  }

  const sanitizedTag = tagNameInput.replace(/\s+/g, '-');
  const fullTagName = `milestone/${branchName}/${sanitizedTag}`;
  const ref = typeof options.ref === 'string' && options.ref.length > 0 ? options.ref : 'HEAD';

  const message = typeof options.message === 'string' && options.message.length > 0
    ? options.message
    : `Milestone ${sanitizedTag} for ${branchName}`;

  runGit(['tag', '-a', fullTagName, ref, '-m', message]);

  if (!options['no-push']) {
    runGit(['push', 'origin', fullTagName]);
  }

  status.branch.milestoneTags = [...(status.branch.milestoneTags ?? []), {
    name: fullTagName,
    ref,
    createdAt: new Date().toISOString(),
  }];

  await writeStatus(statusFile, status);
  writeOut(`\nCreated milestone tag ${fullTagName} at ${ref}.`);
}

async function handleObservability(options: Options) {
  const statusFile = resolveStatusFile(options);
  const status = await readStatus(statusFile);

  const sentryValue = toBoolean(options.sentry as BooleanLike);
  const otelValue = toBoolean(options.otel as BooleanLike);

  if (sentryValue !== undefined) {
    status.observability.sentryThresholdConfigured = sentryValue;
  }

  if (otelValue !== undefined) {
    status.observability.otelThresholdConfigured = otelValue;
  }

  if (typeof options.notes === 'string') {
    status.observability.notes = options.notes;
  }

  await writeStatus(statusFile, status);
  writeOut('\nObservability status updated.');
}

async function handleUat(options: Options) {
  const statusFile = resolveStatusFile(options);
  const status = await readStatus(statusFile);

  if (typeof options.scheduled === 'string') {
    status.uat.scheduled = true;
    status.uat.scheduledAt = options.scheduled;
  }

  const feedbackValue = toBoolean(options.feedback as BooleanLike);
  if (feedbackValue !== undefined) {
    status.uat.feedbackLogged = feedbackValue;
  }

  await writeStatus(statusFile, status);
  writeOut('\nUAT status updated.');
}

async function handleComplete(options: Options) {
  const statusFile = resolveStatusFile(options);
  const status = await readStatus(statusFile);

  const mergedValue = toBoolean(options.merged as BooleanLike);
  if (mergedValue !== undefined) {
    status.decommission.mergedToMain = mergedValue;
  }

  const legacyValue = toBoolean(options.legacy as BooleanLike);
  if (legacyValue !== undefined) {
    status.decommission.legacyBranchesRemoved = legacyValue;
  }

  const docsValue = toBoolean(options.docs as BooleanLike);
  if (docsValue !== undefined) {
    status.decommission.documentationUpdated = docsValue;
  }

  await writeStatus(statusFile, status);
  writeOut('\nDecommission status updated.');
}

async function handleStatus(options: Options) {
  const statusFile = resolveStatusFile(options);
  const status = await readStatus(statusFile);
  const outstanding = computeOutstanding(status);

  writeOut('Current Hotfix Status');
  writeOut('======================');
  writeOut(`Status file: ${statusFile}`);
  writeOut(`Branch: ${status.branch.name ?? 'not yet created'} (base: ${status.branch.base})`);
  writeOut(`Milestone tags: ${status.branch.milestoneTags.length}`);
  writeOut(`Sentry thresholds configured: ${status.observability.sentryThresholdConfigured ? 'yes' : 'no'}`);
  writeOut(`OpenTelemetry thresholds configured: ${status.observability.otelThresholdConfigured ? 'yes' : 'no'}`);
  writeOut(`UAT scheduled: ${status.uat.scheduled ? `yes (${status.uat.scheduledAt ?? 'unspecified'})` : 'no'}`);
  writeOut(`UAT feedback logged: ${status.uat.feedbackLogged ? 'yes' : 'no'}`);
  writeOut(`Merged back to main: ${status.decommission.mergedToMain ? 'yes' : 'no'}`);
  writeOut(`Legacy branches removed: ${status.decommission.legacyBranchesRemoved ? 'yes' : 'no'}`);
  writeOut(`Documentation updated: ${status.decommission.documentationUpdated ? 'yes' : 'no'}`);
  writeOut('');

  if (outstanding.length === 0) {
    writeOut('No outstanding tasks. Hotfix workflow complete.');
  } else {
    writeOut('Outstanding tasks:');
    outstanding.forEach((item, index) => {
      writeOut(`${index + 1}. ${item}`);
    });
  }

  if (typeof options.write === 'string' && options.write.length > 0) {
    await writeOutstandingMarkdown(options.write, status, outstanding);
    writeOut(`\nOutstanding items written to ${resolve(options.write)}.`);
  }
}

function computeOutstanding(status: HotfixStatus): string[] {
  const tasks: string[] = [];
  if (!status.branch.created || !status.branch.pushed) {
    tasks.push('Create and push the temporary hotfix release branch.');
  }
  if ((status.branch.milestoneTags ?? []).length === 0) {
    tasks.push('Tag at least one milestone commit for rollback readiness.');
  }
  if (!status.observability.sentryThresholdConfigured) {
    tasks.push('Tune the Sentry alert thresholds for the hotfix deployment.');
  }
  if (!status.observability.otelThresholdConfigured) {
    tasks.push('Tune the OpenTelemetry latency and resource alerts.');
  }
  if (!status.uat.scheduled) {
    tasks.push('Schedule stakeholder UAT for the hotfix build.');
  }
  if (!status.uat.feedbackLogged) {
    tasks.push('Collect and log UAT feedback, prioritising follow-up fixes.');
  }
  if (!status.decommission.mergedToMain) {
    tasks.push('Merge the hotfix branch back into main after stability confirmation.');
  }
  if (!status.decommission.legacyBranchesRemoved) {
    tasks.push('Remove legacy branches rendered obsolete by the hotfix.');
  }
  if (!status.decommission.documentationUpdated) {
    tasks.push('Update CHANGELOG and internal wiki entries with the hotfix summary.');
  }
  return tasks;
}

async function writeOutstandingMarkdown(destination: string, status: HotfixStatus, outstanding: string[]) {
  const absolutePath = resolve(destination);
  await fs.mkdir(dirname(absolutePath), { recursive: true });

  const lines: string[] = [];
  const now = new Date().toISOString();
  lines.push('# Hotfix Outstanding Items');
  lines.push('');
  lines.push(`_Generated: ${now}_`);
  lines.push('');
  lines.push('## Current Status');
  lines.push('');
  lines.push(`- **Branch**: ${status.branch.name ?? 'not yet created'} (base: ${status.branch.base})`);
  lines.push(`- **Milestone tags**: ${status.branch.milestoneTags.length}`);
  lines.push(`- **Sentry thresholds**: ${status.observability.sentryThresholdConfigured ? 'configured' : 'pending'}`);
  lines.push(`- **OpenTelemetry thresholds**: ${status.observability.otelThresholdConfigured ? 'configured' : 'pending'}`);
  lines.push(`- **UAT scheduled**: ${status.uat.scheduled ? `yes (${status.uat.scheduledAt ?? 'time tbd'})` : 'no'}`);
  lines.push(`- **UAT feedback logged**: ${status.uat.feedbackLogged ? 'yes' : 'no'}`);
  lines.push(`- **Merged to main**: ${status.decommission.mergedToMain ? 'yes' : 'no'}`);
  lines.push(`- **Legacy branches removed**: ${status.decommission.legacyBranchesRemoved ? 'yes' : 'no'}`);
  lines.push(`- **Documentation updated**: ${status.decommission.documentationUpdated ? 'yes' : 'no'}`);
  lines.push('');
  lines.push('## Outstanding Tasks');
  lines.push('');

  if (outstanding.length === 0) {
    lines.push('- None. Hotfix workflow is complete.');
  } else {
    outstanding.forEach((task) => {
      lines.push(`- [ ] ${task}`);
    });
  }

  await fs.writeFile(absolutePath, lines.join('\n') + '\n', 'utf-8');
}
