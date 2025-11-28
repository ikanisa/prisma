import { execSync } from 'node:child_process';
import process from 'node:process';

const criticalPathPatterns = [
  /^infra\//,
  /^server\//,
  /^apps\/gateway\//,
  /^services\//,
  /^packages\/(system-config|lib|api-client)\//,
  /^supabase\//
];

const adrFilePattern = /^docs\/adr\/(?!000-template\.md$).+\.md$/;

function runGit(command) {
  return execSync(command, { encoding: 'utf8' }).trim();
}

function refExists(ref) {
  try {
    execSync(`git rev-parse --verify --quiet ${ref}`, { stdio: 'pipe' });
    return true;
  } catch (error) {
    return false;
  }
}

function getMergeBase() {
  const baseCandidates = [
    process.env.ADR_LINT_BASE,
    'origin/main',
    'main',
    'origin/master',
    'master'
  ].filter(Boolean);

  for (const candidate of baseCandidates) {
    if (!refExists(candidate)) {
      continue;
    }

    try {
      return runGit(`git merge-base HEAD ${candidate}`);
    } catch (error) {
      // Try next candidate.
    }
  }

  return null;
}

function getChangedFiles(baseSha) {
  try {
    const diffTarget = baseSha ? baseSha : 'HEAD';
    const diffOutput = runGit(`git diff --name-only ${diffTarget}`);
    const diffFiles = diffOutput ? diffOutput.split('\n').filter(Boolean) : [];

    const untrackedOutput = runGit('git ls-files --others --exclude-standard');
    const untrackedFiles = untrackedOutput
      ? untrackedOutput.split('\n').filter(Boolean)
      : [];

    return [...new Set([...diffFiles, ...untrackedFiles])];
  } catch (error) {
    console.error('Failed to determine changed files:', error.message ?? error);
    process.exit(1);
  }
}

function main() {
  const baseSha = getMergeBase();
  const changedFiles = getChangedFiles(baseSha);

  if (changedFiles.length === 0) {
    return;
  }

  const touchedCriticalFiles = changedFiles.filter((file) =>
    criticalPathPatterns.some((pattern) => pattern.test(file))
  );

  if (touchedCriticalFiles.length === 0) {
    return;
  }

  const hasAdrUpdate = changedFiles.some((file) => adrFilePattern.test(file));

  if (!hasAdrUpdate) {
    console.error('Architecture-critical files were modified without an accompanying ADR update.');
    console.error('Touched files:');
    for (const file of touchedCriticalFiles) {
      console.error(` - ${file}`);
    }
    console.error('\nAdd or update an ADR in docs/adr/ and reference it in your PR description.');
    process.exit(1);
  }
}

main();
