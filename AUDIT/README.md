# Static Analysis Audit Findings

This directory documents the machine-readable schema for static analysis findings and how to refresh the report that lives in `audit/findings.json`.

## Regenerating the findings

Run the static analysis harness from the repository root:

```bash
pnpm install
pnpm exec node --loader ts-node/esm scripts/audit/static-analysis.ts
```

The script will execute three checks across `apps/*`, `packages/*`, and `services/*`:

1. **ESLint** using `eslint.config.js` with JSON output enabled.
2. **TypeScript** via `tsc --noEmit --project tsconfig.base.json` to capture type errors.
3. **Dead code detection** with [`ts-prune`](https://github.com/nadeesha/ts-prune) targeting the same project graph.

The aggregated output overwrites `audit/findings.json`.

## Understanding the schema

`AUDIT/findings.json` defines the JSON Schema for the generated report:

- `generatedAt`: ISO 8601 timestamp representing when the script ran.
- `runs`: Array containing one entry per tool invocation.
  - `tool`: Human-readable identifier for the tool (`eslint`, `tsc`, `ts-prune`, etc.).
  - `command`: Full command array executed for traceability.
  - `exitCode`: Process exit code returned by the tool.
  - `summary`: Counts of findings grouped by severity (`errors`, `warnings`, `infos`).
  - `rawOutput`: Raw stdout/stderr from the tool to aid debugging when parsing fails.
  - `findings`: Normalised findings surfaced by the tool. Each finding provides:
    - `id`: UUID generated for deduping.
    - `severity`: One of `info`, `warning`, or `error`.
    - `title` and `message`: User-facing description of the issue.
    - `rule`/`docsUrl`: Optional metadata linking to tool-specific documentation.
    - `location`: File-level context (with optional line/column ranges) when available.
    - `metadata`: Tool-specific payload for additional context (for example, the symbol name flagged by `ts-prune`).

Consumers can validate `audit/findings.json` against the schema to ensure compatibility or extend the pipeline by appending new `runs` entries following the same structure.
