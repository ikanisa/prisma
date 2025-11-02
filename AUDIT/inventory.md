# Audit Inventory Automation

This repository ships shell helpers under [`scripts/audit/`](../scripts/audit/) to collect the
artefacts required for audit inventory reviews. The entry point, `run-inventory.sh`, wires
together three focused scripts that generate the filesystem tree, dependency report, and
secret scan baseline.

## Prerequisites

Before running the automation ensure the following tools are available locally:

- [`tree`](https://linux.die.net/man/1/tree) – installable via `apt-get install tree` on Debian-based systems.
- [`pnpm`](https://pnpm.io/) – the repository already pins the version via `.npmrc` / `package.json`.
- [`detect-secrets`](https://github.com/Yelp/detect-secrets) – installable with `pip install detect-secrets`.

Install the workspace dependencies once with `pnpm install` so that `pnpm exec depcruise`
(resolved from the `dependency-cruiser` dev dependency) is available on the PATH.

## Running the inventory

```bash
pnpm run audit:inventory
```

The script sequentially runs:

1. [`generate-tree.sh`](../scripts/audit/generate-tree.sh) – captures a filtered repository tree into `audit/repo-tree.txt`.
2. [`run-depcruise.sh`](../scripts/audit/run-depcruise.sh) – writes the dependency graph for the `src/` workspace to `audit/deps.json`.
3. [`run-detect-secrets.sh`](../scripts/audit/run-detect-secrets.sh) – produces a baseline secret scan covering `src/`, `apps/`, `services/`, `packages/`, `server/`, and `gateway/` in `audit/detect-secrets.baseline`.

Each helper honours environment overrides such as `TREE_CMD` or `DETECT_SECRETS_CMD`
if you need to point to custom binaries.

The combined command emits log output for each stage and stores the artefacts under the
[`audit/`](../audit/) folder. These files are ready for attachment to compliance reports
or further manual inspection.
