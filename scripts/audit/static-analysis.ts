import { mkdir, writeFile } from 'node:fs/promises';
import { execFile } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

interface FindingLocation {
  file: string;
  line?: number;
  column?: number;
  endLine?: number;
  endColumn?: number;
}

interface AuditFinding {
  id: string;
  tool: string;
  severity: 'info' | 'warning' | 'error';
  title: string;
  message: string;
  location?: FindingLocation;
  rule?: string;
  docsUrl?: string | null;
  metadata?: Record<string, unknown>;
}

interface RunSummary {
  total: number;
  errors: number;
  warnings: number;
  infos: number;
}

interface RunResult {
  tool: string;
  command: string[];
  exitCode: number;
  summary: RunSummary;
  findings: AuditFinding[];
  rawOutput: string;
}

interface FindingsReport {
  generatedAt: string;
  runs: RunResult[];
}

function buildSummary(findings: AuditFinding[]): RunSummary {
  return findings.reduce(
    (acc, finding) => {
      acc.total += 1;
      if (finding.severity === 'error') acc.errors += 1;
      else if (finding.severity === 'warning') acc.warnings += 1;
      else acc.infos += 1;
      return acc;
    },
    { total: 0, errors: 0, warnings: 0, infos: 0 }
  );
}

async function runCommand(command: string, args: string[]): Promise<{
  stdout: string;
  stderr: string;
  exitCode: number;
}> {
  try {
    const { stdout, stderr } = await execFileAsync(command, args, {
      encoding: 'utf8',
      maxBuffer: 1024 * 1024 * 10,
    });
    return { stdout, stderr, exitCode: 0 };
  } catch (error) {
    const execError = error as NodeJS.ErrnoException & {
      stdout?: string;
      stderr?: string;
      code?: number;
    };

    return {
      stdout: execError.stdout ?? '',
      stderr: execError.stderr ?? '',
      exitCode: typeof execError.code === 'number' ? execError.code : 1,
    };
  }
}

function parseEslint(stdout: string): AuditFinding[] {
  if (!stdout.trim()) {
    return [];
  }

  let parsed: Array<{
    filePath: string;
    messages: Array<{
      ruleId: string | null;
      severity: number;
      message: string;
      line: number;
      column: number;
      endLine?: number;
      endColumn?: number;
      url?: string;
    }>;
  }> = [];

  try {
    parsed = JSON.parse(stdout);
  } catch (error) {
    console.error('Failed to parse ESLint JSON output', error);
    return [
      {
        id: randomUUID(),
        tool: 'eslint',
        severity: 'error',
        title: 'Failed to parse ESLint output',
        message: 'The ESLint invocation did not produce valid JSON output.',
        metadata: { raw: stdout },
      },
    ];
  }

  const findings: AuditFinding[] = [];

  for (const result of parsed) {
    for (const message of result.messages) {
      const severity =
        message.severity === 2 ? 'error' : message.severity === 1 ? 'warning' : 'info';

      findings.push({
        id: randomUUID(),
        tool: 'eslint',
        severity,
        title: message.ruleId ? `ESLint: ${message.ruleId}` : 'ESLint issue',
        message: message.message,
        rule: message.ruleId ?? undefined,
        docsUrl: message.url ?? null,
        location: {
          file: result.filePath,
          line: message.line > 0 ? message.line : undefined,
          column: message.column > 0 ? message.column : undefined,
          endLine: message.endLine && message.endLine > 0 ? message.endLine : undefined,
          endColumn:
            message.endColumn && message.endColumn > 0 ? message.endColumn : undefined,
        },
      });
    }
  }

  return findings;
}

const TYPESCRIPT_DIAGNOSTIC = /^(?<file>[^\(\n]+)\((?<line>\d+),(?<column>\d+)\):\s+(?<category>error|warning)\s+(?<code>TS\d+):\s+(?<message>.*)$/;

function parseTsc(output: string): AuditFinding[] {
  const findings: AuditFinding[] = [];

  for (const line of output.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    TYPESCRIPT_DIAGNOSTIC.lastIndex = 0;
    const match = TYPESCRIPT_DIAGNOSTIC.exec(trimmed);
    if (match && match.groups) {
      const { file, line: lineNo, column, category, code, message } = match.groups;
      findings.push({
        id: randomUUID(),
        tool: 'tsc',
        severity: category === 'error' ? 'error' : 'warning',
        title: `TypeScript ${code}`,
        message,
        rule: code,
        location: {
          file,
          line: Number(lineNo),
          column: Number(column),
        },
      });
      continue;
    }

    if (/^error\sTS\d+:/.test(trimmed)) {
      findings.push({
        id: randomUUID(),
        tool: 'tsc',
        severity: 'error',
        title: 'TypeScript error',
        message: trimmed,
      });
    }
  }

  return findings;
}

function parseTsPrune(output: string): AuditFinding[] {
  const findings: AuditFinding[] = [];

  for (const line of output.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    const [locationPart, ...rest] = trimmed.split(' - ');
    const message = rest.join(' - ').trim();
    const [fileWithSymbol, symbol] = locationPart.split('#');
    const titleSymbol = symbol ? symbol.trim() : undefined;

    findings.push({
      id: randomUUID(),
      tool: 'ts-prune',
      severity: 'warning',
      title: titleSymbol ? `Unused export: ${titleSymbol}` : 'Unused export',
      message: message || 'Export is not referenced anywhere in the project.',
      location: {
        file: fileWithSymbol.trim(),
      },
      metadata: titleSymbol ? { symbol: titleSymbol } : undefined,
    });
  }

  return findings;
}

async function main() {
  const runs: RunResult[] = [];

  const eslintArgs = [
    'exec',
    'eslint',
    '--config',
    'eslint.config.js',
    '--format',
    'json',
    'apps',
    'packages',
    'services',
  ];
  const eslintResult = await runCommand('pnpm', eslintArgs);
  const eslintFindings = parseEslint(eslintResult.stdout);
  runs.push({
    tool: 'eslint',
    command: ['pnpm', ...eslintArgs],
    exitCode: eslintResult.exitCode,
    summary: buildSummary(eslintFindings),
    findings: eslintFindings,
    rawOutput: eslintResult.stdout || eslintResult.stderr,
  });

  const tscArgs = [
    'exec',
    'tsc',
    '--noEmit',
    '--pretty',
    'false',
    '--project',
    'tsconfig.base.json',
  ];
  const tscResult = await runCommand('pnpm', tscArgs);
  const tscOutput = `${tscResult.stdout}\n${tscResult.stderr}`.trim();
  const tscFindings = parseTsc(tscOutput);
  runs.push({
    tool: 'tsc',
    command: ['pnpm', ...tscArgs],
    exitCode: tscResult.exitCode,
    summary: buildSummary(tscFindings),
    findings: tscFindings,
    rawOutput: tscOutput,
  });

  const tsPruneArgs = ['exec', 'ts-prune', '-p', 'tsconfig.base.json'];
  const tsPruneResult = await runCommand('pnpm', tsPruneArgs);
  const tsPruneOutput = `${tsPruneResult.stdout}\n${tsPruneResult.stderr}`.trim();
  const tsPruneFindings = parseTsPrune(tsPruneOutput);
  runs.push({
    tool: 'ts-prune',
    command: ['pnpm', ...tsPruneArgs],
    exitCode: tsPruneResult.exitCode,
    summary: buildSummary(tsPruneFindings),
    findings: tsPruneFindings,
    rawOutput: tsPruneOutput,
  });

  const report: FindingsReport = {
    generatedAt: new Date().toISOString(),
    runs,
  };

  await mkdir('audit', { recursive: true });
  await writeFile('audit/findings.json', JSON.stringify(report, null, 2), 'utf8');

  console.log('Static analysis findings written to audit/findings.json');
}

main().catch((error) => {
  console.error('Failed to complete static analysis audit');
  console.error(error);
  process.exitCode = 1;
});
