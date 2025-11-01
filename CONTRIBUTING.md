# Contributing

Thanks for helping to improve this project! The guidelines below describe how we collaborate and the standards we expect for every change.

## Getting Started

1. Ensure you are using the Node.js and pnpm versions declared in [`package.json`](package.json) and that commits are GPG-signed (`git config commit.gpgsign true`).
2. Install dependencies with `pnpm install --frozen-lockfile` and run `pnpm run lint`, `pnpm run typecheck`, and `pnpm run test` locally before opening a pull request.
3. Prefer small, focused pull requests that are easy to review and reference the applicable checklist(s) from the repository root.

## Development Workflow

1. Create a feature branch from `main` with a descriptive name using Conventional Commit prefixes (e.g. `feat/ledger-invariants`).
2. Implement the change and add or update automated tests when appropriate; target ≥85% line coverage and ≥80% branch coverage for touched packages.
3. Update any affected documentation (`CONTRIBUTING.md`, `CODING-STANDARDS.md`, runbooks, or checklists) and link relevant ADRs.
4. Open a pull request using the provided template; include checklist references, test evidence, and rollback plan.

## Architecture Decision Records (ADRs)

We use Architecture Decision Records to document major decisions, especially those that impact critical parts of the system. Whenever your work introduces, reworks, or removes a significant architectural concept you **must**:

- Create or update an ADR in `docs/adr/` using the [`000-template.md`](docs/adr/000-template.md) MADR template.
- Reference the ADR number in your pull request description.
- Link relevant code comments or documentation back to the ADR when it helps future readers.

Pull requests that touch architecture-critical areas without an accompanying ADR reference will fail the lint checks described below.

## Linting and Tests

- Run `pnpm run lint` to execute ESLint along with the architecture ADR guard.
- Run `pnpm run typecheck` for the entire workspace.
- Run `pnpm run coverage` to enforce coverage thresholds (lines ≥85, branches ≥80, functions/statements ≥85).
- Some workspaces define additional lint or test commands—use `pnpm -r --if-present run lint` and `pnpm -r --if-present run test` when modifying workspace packages.

## Code Review Expectations

- Keep pull requests rebased on top of the latest `main`.
- Address review feedback promptly and keep the conversation focused and respectful.
- Ensure CI (lint → typecheck → build → tests → Lighthouse → ZAP) passes before requesting review.
- Include links to Lighthouse CI, ZAP, and SBOM artifacts for significant changes.

We appreciate your contributions and the effort you invest to keep the architecture well-documented and maintainable!
